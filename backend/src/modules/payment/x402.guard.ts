import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentService } from './payment.service';
import { PaymentRequiredException } from './exceptions/payment-required.exception';
import { PaymentRequiredResponseDto } from './dto';

/**
 * X402 Guard
 * NestJS guard for protecting individual routes with payment requirements
 *
 * Usage:
 * @UseGuards(X402Guard)
 * @Post('/swap/initiate')
 * async initiateSwap() { ... }
 */
@Injectable()
export class X402Guard implements CanActivate {
  private readonly logger = new Logger(X402Guard.name);

  constructor(private readonly paymentService: PaymentService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const resource = request.path;

    // Skip if X402 is disabled
    if (!this.paymentService.isEnabled()) {
      this.logger.debug(`X402 disabled, allowing access to ${resource}`);
      return true;
    }

    // Check for X-Payment header
    const paymentHeader = request.headers['x-payment'] as string | undefined;

    // No payment → Throw 402 exception
    if (!paymentHeader) {
      this.logger.log(`No payment for ${resource}, denying access`);
      this.throw402(resource);
    }

    try {
      // Verify payment
      const verification = await this.paymentService.verifyPayment(
        paymentHeader,
        resource,
      );

      // Invalid payment → Throw 402 exception
      if (!verification.isValid) {
        this.logger.warn(
          `Invalid payment for ${resource}: ${verification.invalidReason}`,
        );
        this.throw402(resource, verification.invalidReason);
      }

      // Settle payment
      const payload = await this.paymentService.decodePayment(paymentHeader);
      const settlement = await this.paymentService.settlePayment(
        payload,
        resource,
      );

      // Settlement failed → Throw 402 exception (lowercase values per starknet.js)
      if (
        settlement.status !== 'accepted_on_l2' &&
        settlement.status !== 'accepted_on_l1'
      ) {
        this.logger.error(
          `Settlement failed for ${resource}: ${settlement.status}`,
        );
        this.throw402(resource, `Settlement failed: ${settlement.status}`);
      }

      // Success → Allow access
      const txHash = settlement.transaction;
      this.logger.log(`Payment verified and settled for ${resource}: ${txHash}`);

      // Attach payment info to request
      (request as any).payment = {
        verified: true,
        settled: true,
        txHash,
        amount: payload.payload.authorization.amount,
        from: payload.payload.authorization.from,
      };

      return true;
    } catch (error) {
      this.logger.error(`Error in X402 guard for ${resource}:`, error);
      this.throw402(resource, 'Internal error processing payment');
    }
  }

  /**
   * Throw 402 Payment Required exception
   */
  private throw402(resource: string, reason?: string): never {
    const requirements = this.paymentService.createPaymentRequirements(resource);
    const response = new PaymentRequiredResponseDto(
      [requirements],
      reason || 'This endpoint requires payment to access',
    );

    throw new PaymentRequiredException(response);
  }
}

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PaymentService } from './payment.service';
import { PaymentRequiredResponseDto } from './dto';

/**
 * X402 Middleware
 * Intercepts requests to protected endpoints and enforces payment requirements
 *
 * Flow:
 * 1. Check if X402 is enabled (can be disabled via env)
 * 2. Check for X-Payment header
 * 3. If missing → Return 402 with payment requirements
 * 4. If present → Verify payment
 * 5. If valid → Settle payment and allow access
 * 6. If invalid → Return 402 with error details
 */
@Injectable()
export class X402Middleware implements NestMiddleware {
  private readonly logger = new Logger(X402Middleware.name);

  constructor(private readonly paymentService: PaymentService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const resource = req.path;

    // Skip payment check if X402 is disabled
    if (!this.paymentService.isEnabled()) {
      this.logger.debug(`X402 disabled, skipping payment check for ${resource}`);
      return next();
    }

    // Check for X-Payment header
    const paymentHeader = req.headers['x-payment'] as string | undefined;

    // No payment header → Return 402 Payment Required
    if (!paymentHeader) {
      this.logger.log(`No payment header provided for ${resource}, returning 402`);
      return this.return402(res, resource);
    }

    try {
      // Verify the payment
      const verification = await this.paymentService.verifyPayment(
        paymentHeader,
        resource,
      );

      // Payment invalid → Return 402 with reason
      if (!verification.isValid) {
        this.logger.warn(
          `Invalid payment for ${resource}: ${verification.invalidReason}`,
        );
        return this.return402(res, resource, verification.invalidReason);
      }

      // Payment verified → Settle it
      this.logger.log(`Payment verified for ${resource}, settling...`);

      // Decode payment header
      const payload = await this.paymentService.decodePayment(paymentHeader);

      const settlement = await this.paymentService.settlePayment(
        payload,
        resource,
      );

      // Check settlement status (lowercase values per starknet.js)
      if (
        settlement.status !== 'accepted_on_l2' &&
        settlement.status !== 'accepted_on_l1'
      ) {
        this.logger.error(
          `Payment settlement failed for ${resource}: ${settlement.status}`,
        );
        return this.return402(
          res,
          resource,
          `Payment settlement failed: ${settlement.status}`,
        );
      }

      // Payment successful → Allow access
      const txHash = settlement.transaction;
      this.logger.log(
        `Payment settled successfully for ${resource}: ${txHash}`,
      );

      // Attach payment info to request for potential use in route handlers
      (req as any).payment = {
        verified: true,
        settled: true,
        txHash,
        amount: payload.payload.authorization.amount,
        from: payload.payload.authorization.from,
      };

      next();
    } catch (error) {
      this.logger.error(`Error processing payment for ${resource}:`, error);
      return this.return402(
        res,
        resource,
        'Internal error processing payment',
      );
    }
  }

  /**
   * Return HTTP 402 Payment Required response
   */
  private return402(res: Response, resource: string, reason?: string) {
    const requirements = this.paymentService.createPaymentRequirements(resource);

    const response = new PaymentRequiredResponseDto(
      [requirements],
      reason || 'This endpoint requires payment to access',
    );

    return res.status(402).json(response);
  }
}

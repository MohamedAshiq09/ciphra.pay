import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcProvider } from 'starknet';

// Types are imported as type-only (no runtime impact)
import type {
  PaymentRequirements,
  PaymentPayload,
  VerifyResponse,
  SettleResponse,
  StarknetNetwork,
} from 'x402-starknet'; // Temporarily disabled

// Dynamic import cache for x402-starknet (ESM module)
let x402Module: any = null;

/**
 * Payment Service
 * Handles X402 payment verification and settlement using x402-starknet library
 *
 * NOTE: Uses dynamic imports for x402-starknet (ESM module) to work with NestJS (CommonJS)
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly provider: RpcProvider;

  constructor(private readonly configService: ConfigService) {
    // Initialize Starknet RPC provider
    const rpcUrl = this.configService.get<string>(
      'STARKNET_RPC_URL',
      'https://rpc.nethermind.io/sepolia-juno/',
    );

    this.provider = new RpcProvider({ nodeUrl: rpcUrl });
    this.logger.log(`Initialized Starknet provider: ${rpcUrl}`);
  }

  /**
   * Dynamically load x402-starknet ESM module
   * Cached after first load for performance
   */
  private async loadX402Module() {
    if (x402Module) {
      return x402Module;
    }

    try {
      this.logger.debug('Loading x402-starknet module (ESM)...');
      x402Module = await import('x402-starknet');
      this.logger.debug('x402-starknet module loaded successfully');
      return x402Module;
    } catch (error) {
      this.logger.error('Failed to load x402-starknet module:', error);
      throw new Error('X402 module not available');
    }
  }

  /**
   * Check if X402 payment is enabled
   */
  isEnabled(): boolean {
    const enabled = this.configService.get<string>('X402_ENABLED', 'true');
    return enabled === 'true';
  }

  /**
   * Create payment requirements for a protected resource
   * This is returned in 402 Payment Required responses
   */
  createPaymentRequirements(resource: string): PaymentRequirements {
    const network = this.configService.get<string>(
      'STARKNET_NETWORK',
      'starknet-sepolia',
    ) as StarknetNetwork;

    const requirements: PaymentRequirements = {
      scheme: 'exact',
      network,
      maxAmountRequired:
        this.configService.get<string>('X402_PAYMENT_AMOUNT') || '1000000',
      asset:
        this.configService.get<string>('X402_PAYMENT_TOKEN_ADDRESS') ||
        '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', // ETH on Sepolia
      payTo: this.configService.get<string>('X402_PAYMENT_RECIPIENT') || '',
      resource,
      maxTimeoutSeconds: parseInt(
        this.configService.get<string>('X402_MAX_TIMEOUT_SECONDS') || '300',
      ),
    };

    this.logger.debug(
      `Created payment requirements for ${resource}: ${JSON.stringify(requirements)}`,
    );

    return requirements;
  }

  /**
   * Verify a payment from the X-Payment header
   * Returns verification result with isValid flag
   */
  async verifyPayment(
    paymentHeader: string,
    resource: string,
  ): Promise<VerifyResponse> {
    try {
      // Load x402-starknet module dynamically
      const x402 = await this.loadX402Module();
      const { verifyPayment, decodePaymentHeader, PaymentError, NetworkError } =
        x402;

      // Decode the base64-encoded payment header
      const payload = decodePaymentHeader(paymentHeader);

      this.logger.debug(
        `Decoded payment payload for ${resource}: ${JSON.stringify(payload)}`,
      );

      // Get expected payment requirements
      const requirements = this.createPaymentRequirements(resource);

      // Verify the payment using x402-starknet
      const verification = await verifyPayment(
        this.provider,
        payload,
        requirements,
      );

      if (!verification.isValid) {
        this.logger.warn(
          `Payment verification failed for ${resource}: ${verification.invalidReason}`,
        );
      } else {
        this.logger.log(`Payment verified successfully for ${resource}`);
      }

      return verification;
    } catch (error) {
      this.logger.error('Error verifying payment:', error);

      // Handle x402-starknet specific errors
      const errorName = error?.constructor?.name || '';
      if (errorName === 'PaymentError' || errorName === 'NetworkError') {
        return {
          isValid: false,
          invalidReason: 'unexpected_verify_error',
          payer: '0x0',
          details: {
            error: (error as Error).message,
          },
        };
      }

      // Generic error
      return {
        isValid: false,
        invalidReason: 'unexpected_verify_error',
        payer: '0x0',
        details: {
          error: 'Internal error verifying payment',
        },
      };
    }
  }

  /**
   * Settle a payment on Starknet via AVNU paymaster
   * This executes the actual payment transaction
   *
   * NOTE: This method requires a resource parameter since PaymentPayload doesn't contain it
   */
  async settlePayment(
    paymentPayload: PaymentPayload,
    resource: string,
  ): Promise<SettleResponse> {
    try {
      // Load x402-starknet module dynamically
      const x402 = await this.loadX402Module();
      const { settlePayment } = x402;

      const requirements = this.createPaymentRequirements(resource);

      const from = paymentPayload.payload.authorization.from;
      this.logger.log(`Settling payment for ${resource} from ${from}`);

      // Settle payment using x402-starknet
      const settlement = await settlePayment(
        this.provider,
        paymentPayload,
        requirements,
      );

      const txHash = settlement.transaction;
      this.logger.log(
        `Payment settled: ${txHash} (status: ${settlement.status})`,
      );

      return settlement;
    } catch (error) {
      this.logger.error('Error settling payment:', error);
      throw error;
    }
  }

  /**
   * Decode a payment header without verification
   * Useful for logging or inspection
   */
  async decodePayment(paymentHeader: string): Promise<PaymentPayload> {
    try {
      // Load x402-starknet module dynamically
      const x402 = await this.loadX402Module();
      const { decodePaymentHeader } = x402;

      return decodePaymentHeader(paymentHeader);
    } catch (error) {
      this.logger.error('Error decoding payment header:', error);
      throw new Error('Invalid payment header format');
    }
  }
}

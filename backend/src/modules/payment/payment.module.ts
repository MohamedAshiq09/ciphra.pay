import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { X402Middleware } from './x402.middleware';
import { X402Guard } from './x402.guard';

/**
 * Payment Module
 * Provides X402 payment protocol integration for protecting API endpoints
 *
 * Exports:
 * - PaymentService: Core payment verification and settlement
 * - X402Guard: Route-level protection guard
 * - X402Middleware: Global middleware for payment enforcement
 */
@Module({
  imports: [ConfigModule],
  providers: [PaymentService, X402Guard],
  exports: [PaymentService, X402Guard],
})
export class PaymentModule {}

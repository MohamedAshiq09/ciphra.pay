import { HttpException, HttpStatus } from '@nestjs/common';
import { PaymentRequiredResponseDto } from '../dto';

/**
 * Custom exception for HTTP 402 Payment Required
 */
export class PaymentRequiredException extends HttpException {
  constructor(response: PaymentRequiredResponseDto) {
    super(response, HttpStatus.PAYMENT_REQUIRED);
  }
}

import { PaymentRequirementsDto } from './payment-requirements.dto';

/**
 * HTTP 402 Payment Required response
 */
export class PaymentRequiredResponseDto {
  statusCode: number = 402;

  message: string = 'Payment Required';

  error: string;

  x402Version: number = 1;

  accepts: PaymentRequirementsDto[];

  constructor(accepts: PaymentRequirementsDto[], error?: string) {
    this.accepts = accepts;
    this.error = error || 'This endpoint requires payment to access';
  }
}

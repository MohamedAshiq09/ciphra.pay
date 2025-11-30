import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

/**
 * Payment requirements DTO
 * Matches x402-starknet PaymentRequirements type
 */
export class PaymentRequirementsDto {
  @IsString()
  @IsEnum(['exact'])
  scheme: 'exact';

  @IsString()
  network: string;

  @IsString()
  maxAmountRequired: string;

  @IsString()
  asset: string;

  @IsString()
  payTo: string;

  @IsString()
  resource: string;

  @IsNumber()
  @IsOptional()
  maxTimeoutSeconds?: number;
}

import { IsString, IsNumber, IsArray, IsOptional } from 'class-validator';

/**
 * Payment payload DTO
 * Matches x402-starknet PaymentPayload type
 */
export class PaymentPayloadDto {
  @IsNumber()
  version: number;

  @IsString()
  network: string;

  @IsString()
  from: string;

  @IsString()
  to: string;

  @IsString()
  amount: string;

  @IsString()
  asset: string;

  @IsString()
  resource: string;

  @IsNumber()
  timestamp: number;

  @IsNumber()
  @IsOptional()
  expiresAt?: number;

  @IsArray()
  @IsString({ each: true })
  signature: string[];

  @IsString()
  @IsOptional()
  paymasterAddress?: string;
}

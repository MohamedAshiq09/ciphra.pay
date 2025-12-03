import { IsString, IsNotEmpty, IsOptional, IsNumberString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWalletDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  chain: string;
}

export class GetWalletBalanceDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsOptional()
  chain?: string;
}

export class GetWalletHistoryDto {
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @IsString()
  @IsOptional()
  chain?: string;

  @IsString()
  @IsOptional()
  type?: 'send' | 'receive' | 'swap' | 'p2p';
}

export class CreatePaymentRequestDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  chain: 'zcash' | 'near' | 'starknet' | 'mina';

  @IsNumberString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsOptional()
  memo?: string;
}
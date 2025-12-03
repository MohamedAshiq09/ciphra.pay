import { IsString, IsNotEmpty, IsOptional, IsNumberString } from 'class-validator';

export class GetAddressDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class CreatePaymentInstructionsDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsNumberString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsNotEmpty()
  memo: string;
}

export class GetBalanceDto {
  @IsString()
  @IsNotEmpty()
  address: string;
}

export class EstimateFeeDto {
  @IsString()
  @IsNotEmpty()
  fromAddress: string;

  @IsString()
  @IsNotEmpty()
  toAddress: string;

  @IsNumberString()
  @IsNotEmpty()
  amount: string;
}

export class SendZcashDto {
  @IsString()
  @IsNotEmpty()
  toAddress: string;

  @IsNumberString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsOptional()
  memo?: string;
}

export class WatchPaymentDto {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsNumberString()
  @IsNotEmpty()
  expectedAmount: string;

  @IsString()
  @IsOptional()
  memo?: string;
}

// Event DTOs
export interface ZcashPaymentConfirmedEvent {
  paymentId: string;
  txid: string;
  amount: string;
  address: string;
  memo?: string;
  confirmations: number;
}

export interface ZcashTransactionBroadcastedEvent {
  txid: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  memo?: string;
}
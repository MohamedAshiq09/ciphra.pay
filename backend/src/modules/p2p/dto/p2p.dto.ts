import { IsString, IsNotEmpty, IsOptional, IsNumberString, IsIn, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateP2PTransferDto {
  @IsString()
  @IsNotEmpty()
  sender: string;

  @IsString()
  @IsNotEmpty()
  recipient: string;

  @IsString()
  @IsIn(['zcash', 'near', 'starknet', 'mina'])
  chain: 'zcash' | 'near' | 'starknet' | 'mina';

  @IsNumberString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsOptional()
  memo?: string;

  @IsString()
  @IsIn(['custodial', 'non_custodial'])
  @IsOptional()
  type?: 'custodial' | 'non_custodial';
}

export class CreateZcashP2PDto {
  @IsString()
  @IsNotEmpty()
  sender: string;

  @IsString()
  @IsNotEmpty()
  recipient: string;

  @IsNumberString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsOptional()
  memo?: string;

  @IsString()
  @IsIn(['custodial', 'non_custodial'])
  @IsOptional()
  type?: 'custodial' | 'non_custodial' = 'custodial';
}

export class GetP2PTransferDto {
  @IsString()
  @IsNotEmpty()
  transferId: string;
}

export class GetP2PHistoryDto {
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
  @IsIn(['zcash', 'near', 'starknet', 'mina'])
  @IsOptional()
  chain?: 'zcash' | 'near' | 'starknet' | 'mina';

  @IsString()
  @IsIn(['pending', 'escrowed', 'completed', 'cancelled', 'failed'])
  @IsOptional()
  status?: 'pending' | 'escrowed' | 'completed' | 'cancelled' | 'failed';
}

export class CompleteP2PTransferDto {
  @IsString()
  @IsOptional()
  signature?: string;

  @IsString()
  @IsOptional()
  proof?: string;
}

// Event DTOs
export interface P2PPaymentConfirmedEvent {
  transferId: string;
  chain: string;
  proof: {
    txid: string;
    amount: string;
    confirmations: number;
  };
}

export interface P2PTransferCompletedEvent {
  transferId: string;
  chain: string;
  sender: string;
  recipient: string;
  amount: string;
  txid: string;
}
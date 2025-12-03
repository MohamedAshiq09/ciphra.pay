import { IsString, IsNotEmpty, IsOptional, IsNumberString, IsIn, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSwapDto {
  @IsString()
  @IsNotEmpty()
  initiator: string;

  @IsString()
  @IsNotEmpty()
  recipient: string;

  @IsString()
  @IsIn(['zcash', 'near', 'starknet', 'mina'])
  fromChain: 'zcash' | 'near' | 'starknet' | 'mina';

  @IsString()
  @IsIn(['zcash', 'near', 'starknet', 'mina'])
  toChain: 'zcash' | 'near' | 'starknet' | 'mina';

  @IsNumberString()
  @IsNotEmpty()
  amount: string;

  @IsNumberString()
  @IsNotEmpty()
  recipientAmount: string;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(168) // Max 1 week
  @IsOptional()
  timeLockHours?: number = 24;
}

export class CreateZcashSwapDto {
  @IsString()
  @IsNotEmpty()
  initiator: string;

  @IsString()
  @IsNotEmpty()
  recipient: string;

  @IsString()
  @IsIn(['zcash_to_other', 'other_to_zcash'])
  direction: 'zcash_to_other' | 'other_to_zcash';

  @IsString()
  @IsIn(['near', 'starknet', 'mina'])
  targetChain: 'near' | 'starknet' | 'mina';

  @IsNumberString()
  @IsNotEmpty()
  zcashAmount: string;

  @IsNumberString()
  @IsNotEmpty()
  targetAmount: string;
}

export class GetSwapHistoryDto {
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
  @IsIn(['initiated', 'locked', 'completed', 'refunded', 'expired'])
  @IsOptional()
  status?: 'initiated' | 'locked' | 'completed' | 'refunded' | 'expired';
}

export class CompleteSwapDto {
  @IsString()
  @IsNotEmpty()
  secret: string;

  @IsString()
  @IsIn(['zcash', 'near', 'starknet', 'mina'])
  @IsOptional()
  chain?: 'zcash' | 'near' | 'starknet' | 'mina';
}

// Event DTOs
export interface SwapCreatedEvent {
  swapId: string;
  initiatorChain: string;
  recipientChain: string;
  initiator: string;
  recipient: string;
  amount: string;
}

export interface SwapCompletedEvent {
  swapId: string;
  secret: string;
  txid: string;
  completedAt: Date;
}

export interface ZcashPaymentConfirmedEvent {
  swapId: string;
  proof: {
    txid: string;
    amount: string;
    confirmations: number;
  };
}
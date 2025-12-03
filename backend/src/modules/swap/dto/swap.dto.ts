import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  ValidateNested,
  IsNumberString,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Supported chains for cross-chain swaps
 */
export enum SwapChain {
  STARKNET = 'starknet',
  NEAR = 'near',
  ZCASH = 'zcash',
  MINA = 'mina',
}

/**
 * Swap status
 */
export enum CrossChainSwapStatus {
  PENDING = 'pending',
  INITIATED = 'initiated',
  LOCKED = 'locked',
  COMPLETED = 'completed',
  REFUNDED = 'refunded',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

/**
 * User addresses for different chains
 */
export class UserAddresses {
  @IsOptional()
  @IsString()
  starknet?: string;

  @IsOptional()
  @IsString()
  near?: string;

  @IsOptional()
  @IsString()
  zcash?: string;

  @IsOptional()
  @IsString()
  mina?: string;
}

/**
 * DTO for creating atomic swap between any supported chains
 */
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

/**
 * DTO for creating Zcash atomic swap with Zashi integration
 */
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

/**
 * DTO for initiating a cross-chain swap (legacy support)
 */
export class InitiateCrossChainSwapDto {
  @IsEnum(SwapChain)
  sourceChain: SwapChain;

  @IsEnum(SwapChain)
  destChain: SwapChain;

  @IsString()
  @IsNotEmpty()
  sourceAmount: string;

  @IsOptional()
  @IsString()
  sourceToken?: string; // Token address (default: native token)

  @ValidateNested()
  @Type(() => UserAddresses)
  userAddresses: UserAddresses;

  @IsOptional()
  @IsNumber()
  timeLockSeconds?: number; // Default: 7200 (2 hours)

  @IsOptional()
  @IsString()
  secret?: string; // If not provided, backend generates one
}

/**
 * DTO for getting swap history
 */
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

/**
 * DTO for completing swap
 */
export class CompleteSwapDto {
  @IsString()
  @IsNotEmpty()
  secret: string;

  @IsString()
  @IsIn(['zcash', 'near', 'starknet', 'mina'])
  @IsOptional()
  chain?: 'zcash' | 'near' | 'starknet' | 'mina';
}

/**
 * Quote request for swap pricing
 */
export class GetSwapQuoteDto {
  @IsEnum(SwapChain)
  sourceChain: SwapChain;

  @IsEnum(SwapChain)
  destChain: SwapChain;

  @IsString()
  @IsNotEmpty()
  sourceAmount: string;

  @IsOptional()
  @IsString()
  sourceToken?: string;
}

/**
 * Response for swap initiation
 */
export interface SwapInitiationResponse {
  success: boolean;
  swapId: string;

  // Hashes for both chains (same secret, different hash functions)
  hashes: {
    sha256: string; // For NEAR/Zcash
    poseidon: string; // For Starknet
    pedersen: string; // For Mina
  };

  // Secret (user needs this to claim on destination chain)
  secret: string;

  // Swap details
  sourceChain: SwapChain;
  destChain: SwapChain;
  sourceAmount: string;
  destAmount: string;
  exchangeRate: string;

  // Time locks
  sourceTimeLock: number;
  destTimeLock: number;

  // IDs
  sourceSwapId: string;
  destSwapId: string;

  // Instructions for user
  instructions: {
    step1: string;
    step2: string;
    step3: string;
  };

  // Fees
  fees: {
    serviceFee: string;
    networkFee: string;
    totalFee: string;
  };
}

/**
 * Quote response
 */
export interface SwapQuoteResponse {
  success: boolean;

  sourceChain: SwapChain;
  destChain: SwapChain;

  sourceAmount: string;
  destAmount: string;

  exchangeRate: string;

  fees: {
    serviceFee: string;
    serviceFeePercent: string;
    networkFee: string;
  };

  estimatedTime: string;
  validUntil: Date;
}

/**
 * Internal swap metadata stored in database/memory
 */
export interface CrossChainSwapMetadata {
  id: string;

  // Chain info
  sourceChain: SwapChain;
  destChain: SwapChain;

  // Swap IDs on each chain
  sourceSwapId: string;
  destSwapId: string;

  // Amounts
  sourceAmount: string;
  destAmount: string;

  // Addresses
  userSourceAddress: string;
  userDestAddress: string;

  // Secret and hashes
  secret: string;
  sha256Hash: string;
  poseidonHash: string;
  pedersenHash: string;

  // Time locks
  sourceTimeLock: number;
  destTimeLock: number;

  // Status
  status: CrossChainSwapStatus;

  // Timestamps
  createdAt: Date;
  sourceInitiatedAt?: Date;
  counterpartyCreatedAt?: Date;
  completedAt?: Date;

  // Transaction hashes
  sourceInitTxHash?: string;
  destInitTxHash?: string;
  sourceCompleteTxHash?: string;
  destCompleteTxHash?: string;
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

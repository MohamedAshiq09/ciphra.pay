import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Supported chains for cross-chain swaps
 */
export enum SwapChain {
  STARKNET = 'starknet',
  AZTEC = 'aztec',
  NEAR = 'near',
  ZCASH = 'zcash',
}

/**
 * Swap status
 */
export enum CrossChainSwapStatus {
  PENDING = 'pending',
  INITIATED = 'initiated',
  COUNTERPARTY_CREATED = 'counterparty_created',
  COMPLETED = 'completed',
  REFUNDED = 'refunded',
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
  aztec?: string;

  @IsOptional()
  @IsString()
  near?: string;

  @IsOptional()
  @IsString()
  zcash?: string;
}

/**
 * DTO for initiating a cross-chain swap
 *
 * This is the main API endpoint for users to start a swap
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
 * Response for swap initiation
 */
export interface SwapInitiationResponse {
  success: boolean;
  swapId: string;

  // Hashes for both chains (same secret, different hash functions)
  hashes: {
    sha256: string; // For NEAR/Zcash
    poseidon: string; // For Starknet
    pedersen: string; // For Aztec
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
 * DTO for getting swap status
 */
export class GetSwapStatusDto {
  @IsString()
  @IsNotEmpty()
  swapId: string;
}

/**
 * Swap status response
 */
export interface SwapStatusResponse {
  success: boolean;
  swapId: string;
  status: CrossChainSwapStatus;

  sourceChain: SwapChain;
  destChain: SwapChain;

  sourceSwapId: string;
  destSwapId: string;

  sourceStatus: string;
  destStatus: string;

  createdAt: Date;
  completedAt?: Date;

  secret?: string; // Only revealed when completed
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

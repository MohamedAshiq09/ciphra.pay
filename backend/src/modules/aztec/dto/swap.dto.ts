import { IsString, IsNotEmpty, IsNumber, IsEnum } from 'class-validator';

/**
 * Swap status enum matching Aztec contract
 */
export enum SwapStatus {
  NONE = 0,
  ACTIVE = 1,
  COMPLETED = 2,
  REFUNDED = 3,
}

/**
 * Target chain identifiers
 */
export enum TargetChain {
  AZTEC = 0,
  STARKNET = 1,
  NEAR = 2,
  ZCASH = 3,
}

/**
 * Swap details from Aztec contract
 */
export interface AztecSwapDetails {
  swapId: string;
  status: SwapStatus;
  targetChain: TargetChain;
  targetSwapId: string;
  tokenAddress: string;
  secret?: string; // Only available when status = COMPLETED
}

/**
 * Event emitted when swap is initiated
 */
export interface SwapInitiatedEvent {
  swapId: string;
  targetChain: TargetChain;
  targetSwapId: string;
  tokenAddress: string;
  timestamp: Date;
}

/**
 * Event emitted when swap is completed
 */
export interface SwapCompletedEvent {
  swapId: string;
  secret: string;
  targetChain: TargetChain;
  targetSwapId: string;
  timestamp: Date;
}

/**
 * Event emitted when swap is refunded
 */
export interface SwapRefundedEvent {
  swapId: string;
  targetChain: TargetChain;
  targetSwapId: string;
  timestamp: Date;
}

/**
 * DTO for initiating a swap
 */
export class InitiateSwapDto {
  @IsString()
  @IsNotEmpty()
  swapId: string;

  @IsString()
  @IsNotEmpty()
  recipient: string;

  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsNotEmpty()
  tokenAddress: string;

  @IsString()
  @IsNotEmpty()
  hashLock: string;

  @IsNumber()
  hashType: number; // 0 = Pedersen, 1 = Poseidon

  @IsNumber()
  timeLockDuration: number;

  @IsEnum(TargetChain)
  targetChain: TargetChain;

  @IsString()
  @IsNotEmpty()
  targetSwapId: string;
}

/**
 * DTO for completing a swap
 */
export class CompleteSwapDto {
  @IsString()
  @IsNotEmpty()
  swapId: string;

  @IsString()
  @IsNotEmpty()
  secret: string;

  @IsNumber()
  hashType: number; // 0 = Pedersen, 1 = Poseidon
}

/**
 * DTO for refunding a swap
 */
export class RefundSwapDto {
  @IsString()
  @IsNotEmpty()
  swapId: string;
}

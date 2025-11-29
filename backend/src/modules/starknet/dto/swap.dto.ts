import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

/**
 * Swap status matching Starknet contract
 */
export enum StarknetSwapStatus {
  EMPTY = 0,
  ACTIVE = 1,
  COMPLETED = 2,
  REFUNDED = 3,
}

/**
 * Swap details from Starknet contract
 */
export interface StarknetSwapDetails {
  swapId: string;
  initiator: string;
  recipient: string;
  amount: string;
  tokenAddress: string;
  hashLock: string;
  timeLock: number;
  status: StarknetSwapStatus;
  secret: string;
  targetChain: string;
  targetSwapId: string;
  createdAt: number;
}

/**
 * Event emitted when swap is initiated on Starknet
 */
export interface StarknetSwapInitiatedEvent {
  swapId: string;
  initiator: string;
  recipient: string;
  amount: string;
  tokenAddress: string;
  hashLock: string;
  timeLock: number;
  targetChain: string;
  targetSwapId: string;
  timestamp: Date;
  txHash: string;
}

/**
 * Event emitted when swap is completed on Starknet
 * CRITICAL: Contains the revealed secret!
 */
export interface StarknetSwapCompletedEvent {
  swapId: string;
  recipient: string;
  secret: string; // THE SECRET IS HERE!
  amountTransferred: string;
  feeCollected: string;
  targetChain: string;
  targetSwapId: string;
  timestamp: Date;
  txHash: string;
}

/**
 * Event emitted when swap is refunded on Starknet
 */
export interface StarknetSwapRefundedEvent {
  swapId: string;
  initiator: string;
  amount: string;
  targetChain: string;
  timestamp: Date;
  txHash: string;
}

/**
 * DTO for initiating a swap on Starknet
 */
export class InitiateStarknetSwapDto {
  @IsString()
  @IsNotEmpty()
  swapId: string;

  @IsString()
  @IsNotEmpty()
  recipient: string;

  @IsString()
  @IsNotEmpty()
  hashLock: string;

  @IsNumber()
  timeLock: number;

  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsNotEmpty()
  tokenAddress: string;

  @IsString()
  @IsNotEmpty()
  targetChain: string;

  @IsString()
  @IsNotEmpty()
  targetSwapId: string;
}

/**
 * DTO for completing a swap on Starknet
 */
export class CompleteStarknetSwapDto {
  @IsString()
  @IsNotEmpty()
  swapId: string;

  @IsString()
  @IsNotEmpty()
  secret: string;
}

/**
 * DTO for refunding a swap on Starknet
 */
export class RefundStarknetSwapDto {
  @IsString()
  @IsNotEmpty()
  swapId: string;
}

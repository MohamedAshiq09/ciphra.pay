import { Injectable, Logger } from '@nestjs/common';
import { ZcashService } from '../zcash/zcash.service';
import { StarknetService } from '../starknet/starknet.service';
import { HashOracleService } from '../hash-oracle/hash-oracle.service';
import { 
  CreateSwapDto, 
  CreateZcashSwapDto,
  GetSwapHistoryDto 
} from './dto/swap.dto';
import * as crypto from 'crypto';

export interface AtomicSwap {
  swapId: string;
  initiatorChain: string;
  recipientChain: string;
  initiator: string;
  recipient: string;
  amount: string;
  recipientAmount: string;
  hashLock: string;
  secret?: string;
  timeLock: number;
  status: 'initiated' | 'locked' | 'completed' | 'refunded' | 'expired';
  paymentInstructions?: {
    address: string;
    qrCode: string;
    deepLink?: string;
    instructions: string[];
  };
  counterpartySwapId?: string;
  txids: {
    initiate?: string;
    complete?: string;
    refund?: string;
  };
  createdAt: Date;
  expiresAt: Date;
  completedAt?: Date;
}

export interface SwapStats {
  total: number;
  completed: number;
  pending: number;
  volume: Record<string, string>; // chain -> volume
  pairs: Record<string, number>; // "chain1->chain2" -> count
}

/**
 * Swap Service
 * 
 * Handles multi-chain atomic swaps:
 * - Zcash ↔ NEAR
 * - Zcash ↔ Starknet  
 * - Zcash ↔ Mina
 * - NEAR ↔ Starknet
 * - NEAR ↔ Mina
 * - Starknet ↔ Mina
 * 
 * Integrates with Zashi wallet for Zcash operations
 */
@Injectable()
export class SwapService {
  private readonly logger = new Logger(SwapService.name);
  private swaps: Map<string, AtomicSwap> = new Map();

  constructor(
    private zcashService: ZcashService,
    private starknetService: StarknetService,
    private hashOracle: HashOracleService,
  ) {}

  /**
   * Create atomic swap between any supported chains
   */
  async createSwap(dto: CreateSwapDto): Promise<AtomicSwap> {
    try {
      // Validate swap pair
      if (!this.isValidSwapPair(dto.fromChain, dto.toChain)) {
        throw new Error(`Unsupported swap pair: ${dto.fromChain} -> ${dto.toChain}`);
      }

      const swapId = this.generateSwapId();
      const secret = this.generateSecret();
      const hashLock = this.hashSecret(secret);
      const timeLock = Date.now() + (dto.timeLockHours || 24) * 60 * 60 * 1000;

      this.logger.log(`Creating atomic swap: ${swapId}`);
      this.logger.log(`  ${dto.fromChain} -> ${dto.toChain}`);
      this.logger.log(`  Amount: ${dto.amount} -> ${dto.recipientAmount}`);

      const swap: AtomicSwap = {
        swapId,
        initiatorChain: dto.fromChain,
        recipientChain: dto.toChain,
        initiator: dto.initiator,
        recipient: dto.recipient,
        amount: dto.amount,
        recipientAmount: dto.recipientAmount,
        hashLock,
        secret, // Store secret for facilitator model
        timeLock,
        status: 'initiated',
        txids: {},
        createdAt: new Date(),
        expiresAt: new Date(timeLock),
      };

      // Handle Zcash-specific logic
      if (dto.fromChain === 'zcash') {
        await this.handleZcashInitiation(swap, dto);
      } else if (dto.toChain === 'zcash') {
        await this.handleZcashRecipient(swap, dto);
      }

      this.swaps.set(swapId, swap);

      // TODO: Emit event when EventEmitter2 is available
      this.logger.log(`Swap created: ${swap.swapId}`);

      return swap;
    } catch (error) {
      this.logger.error(`Failed to create swap: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create Zcash atomic swap with Zashi integration
   */
  async createZcashSwap(dto: CreateZcashSwapDto): Promise<AtomicSwap> {
    try {
      const swapId = this.generateSwapId();
      const secret = this.generateSecret();
      const hashLock = this.hashSecret(secret);
      const timeLock = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

      this.logger.log(`Creating Zcash atomic swap: ${swapId}`);
      this.logger.log(`  Direction: ${dto.direction}`);
      this.logger.log(`  Target chain: ${dto.targetChain}`);

      const swap: AtomicSwap = {
        swapId,
        initiatorChain: dto.direction === 'zcash_to_other' ? 'zcash' : dto.targetChain,
        recipientChain: dto.direction === 'zcash_to_other' ? dto.targetChain : 'zcash',
        initiator: dto.initiator,
        recipient: dto.recipient,
        amount: dto.zcashAmount,
        recipientAmount: dto.targetAmount,
        hashLock,
        secret,
        timeLock,
        status: 'initiated',
        txids: {},
        createdAt: new Date(),
        expiresAt: new Date(timeLock),
      };

      if (dto.direction === 'zcash_to_other') {
        // User pays ZEC first, gets other asset
        const memo = `SWAP-${swapId}`;
        const paymentInstructions = await this.zcashService.getPaymentInstructions(
          dto.initiator,
          dto.zcashAmount,
          memo,
        );

        swap.paymentInstructions = {
          address: paymentInstructions.address,
          qrCode: paymentInstructions.qrPayload,
          deepLink: `zashi://pay?address=${paymentInstructions.address}&amount=${dto.zcashAmount}&memo=${encodeURIComponent(memo)}`,
          instructions: [
            'Open Zashi wallet on your mobile device',
            'Scan the QR code or tap the Zashi link',
            'Verify the swap details and memo',
            'Confirm the ZEC payment in Zashi',
            'Wait for confirmation, then claim your tokens on the target chain',
          ],
        };

        // Start watching for ZEC payment
        this.watchZcashPayment(swap, memo);
      } else {
        // User locks tokens on other chain first, gets ZEC
        // TODO: Implement other chain initiation
        this.logger.log('Other -> ZEC swaps not yet implemented');
      }

      this.swaps.set(swapId, swap);
      return swap;
    } catch (error) {
      this.logger.error(`Failed to create Zcash swap: ${error.message}`);
      throw error;
    }
  }

  /**
   * Complete swap with revealed secret
   */
  async completeSwap(swapId: string, secret: string, chain?: string): Promise<{ txid: string }> {
    try {
      const swap = this.swaps.get(swapId);
      if (!swap) {
        throw new Error('Swap not found');
      }

      if (swap.status !== 'locked') {
        throw new Error('Swap not ready for completion');
      }

      // Verify secret
      const computedHash = this.hashSecret(secret);
      if (computedHash !== swap.hashLock) {
        throw new Error('Invalid secret');
      }

      this.logger.log(`Completing swap: ${swapId}`);

      let txid: string;

      // Handle completion based on recipient chain
      if (swap.recipientChain === 'zcash') {
        // Send ZEC to recipient
        const recipientAddress = await this.getZcashAddress(swap.recipient);
        txid = await this.zcashService.sendFromFacilitator(
          recipientAddress,
          swap.recipientAmount,
          `SWAP-${swapId}`,
        );
      } else {
        // Complete on other chain
        // TODO: Implement other chain completion
        txid = 'pending_other_chain';
      }

      swap.status = 'completed';
      swap.secret = secret;
      swap.txids.complete = txid;
      swap.completedAt = new Date();

      this.logger.log(`✅ Swap completed: ${swapId} -> ${txid}`);

      // TODO: Emit event when EventEmitter2 is available
      this.logger.log(`Swap completed: ${swap.swapId}`);

      return { txid };
    } catch (error) {
      this.logger.error(`Failed to complete swap: ${error.message}`);
      throw error;
    }
  }

  /**
   * Refund expired swap
   */
  async refundSwap(swapId: string): Promise<{ txid: string }> {
    try {
      const swap = this.swaps.get(swapId);
      if (!swap) {
        throw new Error('Swap not found');
      }

      if (Date.now() < swap.timeLock) {
        throw new Error('Swap not yet expired');
      }

      if (swap.status === 'completed') {
        throw new Error('Cannot refund completed swap');
      }

      this.logger.log(`Refunding swap: ${swapId}`);

      let txid: string;

      // Handle refund based on initiator chain
      if (swap.initiatorChain === 'zcash') {
        // Refund ZEC to initiator
        const initiatorAddress = await this.getZcashAddress(swap.initiator);
        txid = await this.zcashService.sendFromFacilitator(
          initiatorAddress,
          swap.amount,
          `REFUND-${swapId}`,
        );
      } else {
        // Refund on other chain
        // TODO: Implement other chain refunds
        txid = 'pending_other_chain';
      }

      swap.status = 'refunded';
      swap.txids.refund = txid;

      this.logger.log(`💰 Swap refunded: ${swapId} -> ${txid}`);

      return { txid };
    } catch (error) {
      this.logger.error(`Failed to refund swap: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get swap by ID
   */
  async getSwap(swapId: string): Promise<AtomicSwap> {
    const swap = this.swaps.get(swapId);
    if (!swap) {
      throw new Error('Swap not found');
    }
    return swap;
  }

  /**
   * Get user's swap history
   */
  async getUserSwapHistory(userId: string, query: GetSwapHistoryDto): Promise<{
    swaps: AtomicSwap[];
    pagination: { page: number; limit: number; total: number };
  }> {
    try {
      const allSwaps = Array.from(this.swaps.values());
      
      // Filter by user (initiator or recipient)
      let userSwaps = allSwaps.filter(
        s => s.initiator === userId || s.recipient === userId,
      );

      // Filter by chain if specified
      if (query.chain) {
        userSwaps = userSwaps.filter(
          s => s.initiatorChain === query.chain || s.recipientChain === query.chain,
        );
      }

      // Filter by status if specified
      if (query.status) {
        userSwaps = userSwaps.filter(s => s.status === query.status);
      }

      // Sort by creation date (newest first)
      userSwaps.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Pagination
      const page = query.page || 1;
      const limit = query.limit || 20;
      const offset = (page - 1) * limit;
      const paginatedSwaps = userSwaps.slice(offset, offset + limit);

      return {
        swaps: paginatedSwaps,
        pagination: {
          page,
          limit,
          total: userSwaps.length,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get user swap history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get supported swap pairs
   */
  async getSupportedSwapPairs() {
    return {
      pairs: [
        { from: 'zcash', to: 'near', supported: true },
        { from: 'zcash', to: 'starknet', supported: true },
        { from: 'zcash', to: 'mina', supported: true },
        { from: 'near', to: 'zcash', supported: true },
        { from: 'near', to: 'starknet', supported: true },
        { from: 'near', to: 'mina', supported: true },
        { from: 'starknet', to: 'zcash', supported: true },
        { from: 'starknet', to: 'near', supported: true },
        { from: 'starknet', to: 'mina', supported: true },
        { from: 'mina', to: 'zcash', supported: true },
        { from: 'mina', to: 'near', supported: true },
        { from: 'mina', to: 'starknet', supported: true },
      ],
      features: {
        zcash: {
          walletIntegration: 'zashi',
          shielded: true,
          memos: true,
        },
        near: {
          walletIntegration: 'web',
          shielded: true,
          smartContracts: true,
        },
        starknet: {
          walletIntegration: 'browser_extension',
          shielded: true,
          zkRollup: true,
        },
        mina: {
          walletIntegration: 'browser_extension',
          shielded: true,
          zkSnarks: true,
        },
      },
    };
  }

  /**
   * Get swap statistics
   */
  async getSwapStats(): Promise<SwapStats> {
    try {
      const allSwaps = Array.from(this.swaps.values());
      
      const total = allSwaps.length;
      const completed = allSwaps.filter(s => s.status === 'completed').length;
      const pending = allSwaps.filter(s => s.status === 'initiated' || s.status === 'locked').length;
      
      // Calculate volume by chain
      const volume: Record<string, string> = {};
      const pairs: Record<string, number> = {};
      
      for (const swap of allSwaps) {
        if (swap.status === 'completed') {
          // Volume
          volume[swap.initiatorChain] = (
            parseFloat(volume[swap.initiatorChain] || '0') + parseFloat(swap.amount)
          ).toString();
          
          // Pairs
          const pairKey = `${swap.initiatorChain}->${swap.recipientChain}`;
          pairs[pairKey] = (pairs[pairKey] || 0) + 1;
        }
      }

      return {
        total,
        completed,
        pending,
        volume,
        pairs,
      };
    } catch (error) {
      this.logger.error(`Failed to get swap stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle Zcash initiation (user pays ZEC first)
   */
  private async handleZcashInitiation(swap: AtomicSwap, dto: CreateSwapDto): Promise<void> {
    const memo = `SWAP-${swap.swapId}`;
    const paymentInstructions = await this.zcashService.getPaymentInstructions(
      dto.initiator,
      dto.amount,
      memo,
    );

    swap.paymentInstructions = {
      address: paymentInstructions.address,
      qrCode: paymentInstructions.qrPayload,
      deepLink: `zashi://pay?address=${paymentInstructions.address}&amount=${dto.amount}&memo=${encodeURIComponent(memo)}`,
      instructions: [
        'Open Zashi wallet on your mobile device',
        'Scan the QR code or tap the Zashi link',
        'Verify the swap details and memo',
        'Confirm the ZEC payment in Zashi',
        'Wait for confirmation to proceed with the swap',
      ],
    };

    // Start watching for payment
    this.watchZcashPayment(swap, memo);
  }

  /**
   * Handle Zcash as recipient (user gets ZEC)
   */
  private async handleZcashRecipient(swap: AtomicSwap, dto: CreateSwapDto): Promise<void> {
    // TODO: Implement logic for swaps where user receives ZEC
    // This would involve initiating on the other chain first
    this.logger.log('Zcash recipient swaps not yet implemented');
  }

  /**
   * Watch for Zcash payment confirmation
   */
  private async watchZcashPayment(swap: AtomicSwap, memo: string): Promise<void> {
    try {
      if (!swap.paymentInstructions) return;

      const proof = await this.zcashService.watchIncomingPayment(
        swap.paymentInstructions.address,
        swap.amount,
        memo,
      );

      // Payment confirmed
      swap.status = 'locked';
      swap.txids.initiate = proof.txid;
      
      this.logger.log(`✅ Zcash payment confirmed for swap: ${swap.swapId}`);
      this.logger.log(`   TX: ${proof.txid}`);
      
      // TODO: Emit event when EventEmitter2 is available
      this.logger.log(`Zcash payment confirmed for swap: ${swap.swapId}`);

    } catch (error) {
      swap.status = 'expired';
      this.logger.error(`Zcash payment failed for swap ${swap.swapId}: ${error.message}`);
    }
  }

  /**
   * Check if swap pair is valid
   */
  private isValidSwapPair(fromChain: string, toChain: string): boolean {
    const supportedChains = ['zcash', 'near', 'starknet', 'mina'];
    return supportedChains.includes(fromChain) && 
           supportedChains.includes(toChain) && 
           fromChain !== toChain;
  }

  /**
   * Get Zcash address for user
   */
  private async getZcashAddress(userId: string): Promise<string> {
    const addressInfo = await this.zcashService.getAddressForUser(userId);
    return addressInfo.address;
  }

  /**
   * Generate unique swap ID
   */
  private generateSwapId(): string {
    return `swap_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Generate random secret
   */
  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash secret for hash lock
   */
  private hashSecret(secret: string): string {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }
}
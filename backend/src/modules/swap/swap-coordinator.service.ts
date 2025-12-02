import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AztecService } from '../aztec/aztec.service';
import { StarknetService } from '../starknet/starknet.service';
import { HashOracleService } from '../hash-oracle/hash-oracle.service';
import { TargetChain } from '../aztec/dto/swap.dto';
import {
  CrossChainSwapMetadata,
  CrossChainSwapStatus,
  SwapChain,
} from './dto/swap.dto';
import type {
  SwapInitiatedEvent as AztecSwapInitiatedEvent,
  SwapCompletedEvent as AztecSwapCompletedEvent,
} from '../aztec/dto/swap.dto';
import type {
  StarknetSwapInitiatedEvent,
  StarknetSwapCompletedEvent,
} from '../starknet/dto/swap.dto';

/**
 * Swap Coordinator Service
 *
 * THE BRAIN OF THE CROSS-CHAIN ATOMIC SWAP SYSTEM
 *
 * Responsibilities:
 * 1. Listen to events from Aztec and Starknet
 * 2. When swap initiated on Chain A → Create counterparty swap on Chain B
 * 3. When swap completed on Chain B → Complete swap on Chain A with revealed secret
 * 4. Handle hash conversion between chains (Pedersen ↔ Poseidon)
 * 5. Store swap mappings in memory (TODO: database)
 *
 * Flow Example:
 * 1. User initiates swap on Aztec (100 ETH → 1000 STRK)
 * 2. Coordinator detects via 'aztec.swap.initiated' event
 * 3. Coordinator converts Pedersen hash → Poseidon hash
 * 4. Coordinator creates counterparty swap on Starknet
 * 5. User reveals secret on Starknet to get 1000 STRK
 * 6. Coordinator detects via 'starknet.swap.completed' event
 * 7. Coordinator extracts secret and completes Aztec swap
 * 8. User gets 100 ETH on Aztec
 * ✅ ATOMIC SWAP COMPLETE!
 */
@Injectable()
export class SwapCoordinatorService {
  private readonly logger = new Logger(SwapCoordinatorService.name);

  // In-memory storage for swap mappings (legacy)
  // TODO: Replace with database (TypeORM)
  private swapMappings: Map<string, SwapMapping> = new Map();

  // New: Cross-chain swap metadata storage
  private swapMetadata: Map<string, CrossChainSwapMetadata> = new Map();

  constructor(
    private aztecService: AztecService,
    private starknetService: StarknetService,
    private hashOracle: HashOracleService,
  ) {}

  /**
   * Create and store swap metadata
   * Called when user initiates swap via API
   */
  async createSwapMetadata(params: {
    id: string;
    sourceChain: SwapChain;
    destChain: SwapChain;
    sourceSwapId: string;
    destSwapId: string;
    sourceAmount: string;
    destAmount: string;
    userSourceAddress: string;
    userDestAddress: string;
    secret: string;
    sha256Hash: string;
    poseidonHash: string;
    pedersenHash: string;
    sourceTimeLock: number;
    destTimeLock: number;
  }): Promise<CrossChainSwapMetadata> {
    const metadata: CrossChainSwapMetadata = {
      ...params,
      status: CrossChainSwapStatus.PENDING,
      createdAt: new Date(),
    };

    this.swapMetadata.set(params.id, metadata);
    this.swapMetadata.set(params.sourceSwapId, metadata);
    this.swapMetadata.set(params.destSwapId, metadata);

    this.logger.log(`📝 Swap metadata created: ${params.id}`);
    this.logger.log(`   ${params.sourceChain} → ${params.destChain}`);
    this.logger.log(`   Amount: ${params.sourceAmount} → ${params.destAmount}`);

    return metadata;
  }

  /**
   * Get swap metadata by any ID (swapId, sourceSwapId, or destSwapId)
   */
  getSwapMetadata(swapId: string): CrossChainSwapMetadata | undefined {
    return this.swapMetadata.get(swapId);
  }

  /**
   * Complete swap with revealed secret
   */
  async completeSwapWithSecret(
    swapId: string,
    secret: string,
  ): Promise<{
    success: boolean;
    message: string;
    txHash?: string;
  }> {
    const metadata = this.swapMetadata.get(swapId);

    if (!metadata) {
      return { success: false, message: 'Swap not found' };
    }

    // Verify secret matches
    if (metadata.secret !== secret) {
      // Verify using hash oracle
      const isValid = this.hashOracle.verifySecret(
        secret,
        metadata.poseidonHash,
        'poseidon' as any,
      );

      if (!isValid) {
        return { success: false, message: 'Invalid secret' };
      }
    }

    this.logger.log(`🔑 Completing swap ${swapId} with revealed secret`);

    try {
      // Determine which chain to complete
      if (metadata.sourceChain === SwapChain.STARKNET) {
        // Complete Starknet side
        const txHash = await this.starknetService.completeSwap({
          swapId: metadata.sourceSwapId,
          secret,
        });

        metadata.status = CrossChainSwapStatus.COMPLETED;
        metadata.completedAt = new Date();
        metadata.sourceCompleteTxHash = txHash;

        return { success: true, message: 'Starknet swap completed', txHash };
      } else if (metadata.sourceChain === SwapChain.AZTEC) {
        // Complete Aztec side
        const txHash = await this.aztecService.completeSwap({
          swapId: metadata.sourceSwapId,
          secret,
          hashType: 0, // Pedersen
        });

        metadata.status = CrossChainSwapStatus.COMPLETED;
        metadata.completedAt = new Date();
        metadata.sourceCompleteTxHash = txHash;

        return { success: true, message: 'Aztec swap completed', txHash };
      }

      return { success: false, message: 'Unsupported source chain' };
    } catch (error) {
      this.logger.error(`Failed to complete swap: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Create counterparty swap on destination chain
   * Called when source chain swap is detected
   */
  async createCounterpartySwap(
    metadata: CrossChainSwapMetadata,
  ): Promise<string | null> {
    this.logger.log(`🔄 Creating counterparty swap on ${metadata.destChain}`);
    this.logger.log(
      `   Source: ${metadata.sourceSwapId} (${metadata.sourceChain})`,
    );
    this.logger.log(`   Dest: ${metadata.destSwapId} (${metadata.destChain})`);

    try {
      if (metadata.destChain === SwapChain.AZTEC) {
        // Create counterparty on Aztec using Pedersen hash
        const txHash = await this.aztecService.initiateSwap({
          swapId: metadata.destSwapId,
          recipient: metadata.userDestAddress,
          amount: metadata.destAmount,
          tokenAddress: '0x0', // Native token
          hashLock: metadata.pedersenHash,
          hashType: 0, // Pedersen
          timeLockDuration: metadata.destTimeLock,
          targetChain: TargetChain.STARKNET,
          targetSwapId: metadata.sourceSwapId,
        });

        metadata.destInitTxHash = txHash;
        metadata.counterpartyCreatedAt = new Date();
        metadata.status = CrossChainSwapStatus.COUNTERPARTY_CREATED;

        this.logger.log(`✅ Aztec counterparty created: ${txHash}`);
        return txHash;
      } else if (metadata.destChain === SwapChain.STARKNET) {
        // Create counterparty on Starknet using Poseidon hash
        const txHash = await this.starknetService.initiateSwap({
          swapId: metadata.destSwapId,
          recipient: metadata.userDestAddress,
          amount: metadata.destAmount,
          tokenAddress: '0x0', // Native token
          hashLock: metadata.poseidonHash,
          timeLock: metadata.destTimeLock,
          targetChain: 'aztec',
          targetSwapId: metadata.sourceSwapId,
        });

        metadata.destInitTxHash = txHash;
        metadata.counterpartyCreatedAt = new Date();
        metadata.status = CrossChainSwapStatus.COUNTERPARTY_CREATED;

        this.logger.log(`✅ Starknet counterparty created: ${txHash}`);
        return txHash;
      }

      this.logger.warn(`Unsupported destination chain: ${metadata.destChain}`);
      return null;
    } catch (error) {
      this.logger.error(`Failed to create counterparty: ${error.message}`);
      metadata.status = CrossChainSwapStatus.FAILED;
      return null;
    }
  }

  /**
   * Handle swap initiated on Aztec
   * Action: Create counterparty swap on Starknet
   */
  @OnEvent('aztec.swap.initiated')
  async handleAztecSwapInitiated(event: AztecSwapInitiatedEvent) {
    try {
      this.logger.log(`🔵 Aztec swap initiated: ${event.swapId}`);
      this.logger.log(
        `   Target: ${TargetChain[event.targetChain]} (swap ${event.targetSwapId})`,
      );

      // Only handle if target is Starknet
      if (event.targetChain !== TargetChain.STARKNET) {
        this.logger.debug(`Skipping - target chain is not Starknet`);
        return;
      }

      // Store mapping
      const mapping: SwapMapping = {
        aztecSwapId: event.swapId,
        starknetSwapId: event.targetSwapId,
        secret: null,
        status: 'active',
        createdAt: event.timestamp,
      };
      this.swapMappings.set(event.swapId, mapping);

      this.logger.log(
        `✅ Swap mapping stored: Aztec ${event.swapId} ↔ Starknet ${event.targetSwapId}`,
      );

      // TODO: Create counterparty swap on Starknet
      // For now, just log
      this.logger.warn(`⏳ TODO: Create counterparty swap on Starknet`);
      this.logger.log(`   Would call: starknetService.initiateSwap({`);
      this.logger.log(`     swapId: ${event.targetSwapId},`);
      this.logger.log(`     recipient: <user_address>,`);
      this.logger.log(`     hashLock: <poseidon_hash>,`);
      this.logger.log(`     ...`);
      this.logger.log(`   })`);
    } catch (error) {
      this.logger.error(
        `Failed to handle Aztec swap initiated: ${error.message}`,
      );
    }
  }

  /**
   * Handle swap completed on Aztec
   * Action: Update mapping with revealed secret
   */
  @OnEvent('aztec.swap.completed')
  async handleAztecSwapCompleted(event: AztecSwapCompletedEvent) {
    try {
      this.logger.log(`✅ Aztec swap completed: ${event.swapId}`);
      this.logger.log(
        `   Secret revealed: ${event.secret.substring(0, 20)}...`,
      );

      // Update mapping
      const mapping = this.swapMappings.get(event.swapId);
      if (mapping) {
        mapping.secret = event.secret;
        mapping.status = 'completed';
        mapping.completedAt = event.timestamp;
        this.logger.log(`✅ Mapping updated with secret`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle Aztec swap completed: ${error.message}`,
      );
    }
  }

  /**
   * Handle swap initiated on Starknet
   * Action: Create counterparty swap on Aztec (if needed)
   */
  @OnEvent('starknet.swap.initiated')
  async handleStarknetSwapInitiated(event: StarknetSwapInitiatedEvent) {
    try {
      this.logger.log(`🔴 Starknet swap initiated: ${event.swapId}`);
      this.logger.log(
        `   Target: ${event.targetChain} (swap ${event.targetSwapId})`,
      );

      // Only handle if target is Aztec
      if (event.targetChain !== 'aztec') {
        this.logger.debug(`Skipping - target chain is not Aztec`);
        return;
      }

      // Store mapping
      const mapping: SwapMapping = {
        aztecSwapId: event.targetSwapId,
        starknetSwapId: event.swapId,
        secret: null,
        status: 'active',
        createdAt: event.timestamp,
      };
      this.swapMappings.set(event.targetSwapId, mapping);

      this.logger.log(
        `✅ Swap mapping stored: Starknet ${event.swapId} ↔ Aztec ${event.targetSwapId}`,
      );

      // TODO: Create counterparty swap on Aztec
      this.logger.warn(`⏳ TODO: Create counterparty swap on Aztec`);
    } catch (error) {
      this.logger.error(
        `Failed to handle Starknet swap initiated: ${error.message}`,
      );
    }
  }

  /**
   * Handle swap completed on Starknet
   * Action: Complete swap on Aztec with revealed secret
   *
   * THIS IS THE CRITICAL PATH!
   * When user reveals secret on Starknet, we use it to complete Aztec swap
   */
  @OnEvent('starknet.swap.completed')
  async handleStarknetSwapCompleted(event: StarknetSwapCompletedEvent) {
    try {
      this.logger.log(`✅ Starknet swap completed: ${event.swapId}`);
      this.logger.log(
        `   🔑 SECRET REVEALED: ${event.secret.substring(0, 20)}...`,
      );

      // Find linked Aztec swap
      const mapping = Array.from(this.swapMappings.values()).find(
        (m) => m.starknetSwapId === event.swapId,
      );

      if (!mapping) {
        this.logger.warn(`No mapping found for Starknet swap ${event.swapId}`);
        return;
      }

      this.logger.log(`📍 Found linked Aztec swap: ${mapping.aztecSwapId}`);

      // Update mapping
      mapping.secret = event.secret;
      mapping.status = 'completing';

      // Complete Aztec swap with revealed secret
      this.logger.log(
        `🔵 Completing Aztec swap ${mapping.aztecSwapId} with revealed secret...`,
      );

      try {
        const txHash = await this.aztecService.completeSwap({
          swapId: mapping.aztecSwapId,
          secret: event.secret,
          hashType: 0, // Pedersen
        });

        this.logger.log(`✅ Aztec swap completed! TX: ${txHash}`);
        mapping.status = 'completed';
        mapping.completedAt = new Date();
      } catch (error) {
        this.logger.error(`Failed to complete Aztec swap: ${error.message}`);
        mapping.status = 'failed';
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle Starknet swap completed: ${error.message}`,
      );
    }
  }

  /**
   * Get swap mapping by Aztec swap ID
   */
  getSwapMapping(aztecSwapId: string): SwapMapping | undefined {
    return this.swapMappings.get(aztecSwapId);
  }

  /**
   * Get all swap mappings
   */
  getAllSwapMappings(): SwapMapping[] {
    return Array.from(this.swapMappings.values());
  }

  /**
   * Get statistics
   */
  getStats() {
    const all = this.getAllSwapMappings();
    return {
      total: all.length,
      active: all.filter((m) => m.status === 'active').length,
      completed: all.filter((m) => m.status === 'completed').length,
      failed: all.filter((m) => m.status === 'failed').length,
    };
  }
}

/**
 * Swap mapping interface
 */
export interface SwapMapping {
  aztecSwapId: string;
  starknetSwapId: string;
  secret: string | null;
  status: 'active' | 'completing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

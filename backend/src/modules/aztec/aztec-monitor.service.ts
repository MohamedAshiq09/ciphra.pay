import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AztecService } from './aztec.service';
import { AppConfigService } from '../../common/config/config.service';
import {
  SwapStatus,
  SwapInitiatedEvent,
  SwapCompletedEvent,
  SwapRefundedEvent,
} from './dto/swap.dto';

/**
 * Aztec Monitor Service
 * 
 * Continuously monitors Aztec contract public state for swap events:
 * - Polls public_swap_status every 5 seconds
 * - Detects status changes (initiated, completed, refunded)
 * - Emits events for cross-chain coordination
 * 
 * This is CRITICAL for the backend to detect:
 * 1. New swaps initiated on Aztec → Create counterparty swap on Starknet
 * 2. Swaps completed on Aztec → Secret revealed, complete on other chain
 * 3. Swaps refunded on Aztec → Update database
 */
@Injectable()
export class AztecMonitorService implements OnModuleInit {
  private readonly logger = new Logger(AztecMonitorService.name);
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout;
  private lastProcessedSwap = 0n;
  private swapStatusCache: Map<string, SwapStatus> = new Map();

  constructor(
    private aztecService: AztecService,
    private config: AppConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    // Start monitoring after a short delay to ensure Aztec service is ready
    setTimeout(() => this.startMonitoring(), 2000);
  }

  /**
   * Start monitoring Aztec contract
   */
  async startMonitoring() {
    if (this.isMonitoring) {
      this.logger.warn('Monitoring already started');
      return;
    }

    this.logger.log('🔍 Starting Aztec contract monitoring...');
    this.isMonitoring = true;

    // Get current total swaps as starting point
    try {
      const totalSwaps = await this.aztecService.getTotalSwaps();
      this.lastProcessedSwap = totalSwaps;
      this.logger.log(`Starting from swap count: ${totalSwaps}`);
    } catch (error) {
      this.logger.error(`Failed to get initial swap count: ${error.message}`);
    }

    // Start polling interval
    const intervalMs = this.config.monitoringInterval;
    this.monitoringInterval = setInterval(
      () => this.pollSwaps(),
      intervalMs,
    );

    this.logger.log(`✅ Monitoring started (polling every ${intervalMs}ms)`);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    this.logger.log('Stopping Aztec contract monitoring...');
    clearInterval(this.monitoringInterval);
    this.isMonitoring = false;
    this.logger.log('✅ Monitoring stopped');
  }

  /**
   * Poll contract for new swaps and status changes
   */
  private async pollSwaps() {
    try {
      // Get current total swaps
      const totalSwaps = await this.aztecService.getTotalSwaps();

      // Check if there are new swaps
      if (totalSwaps > this.lastProcessedSwap) {
        this.logger.log(`📊 New swaps detected: ${this.lastProcessedSwap} → ${totalSwaps}`);
        
        // Process new swaps
        for (let i = this.lastProcessedSwap; i < totalSwaps; i++) {
          await this.processSwap(i.toString());
        }
        
        this.lastProcessedSwap = totalSwaps;
      }

      // Check existing swaps for status changes
      await this.checkStatusChanges();

    } catch (error) {
      this.logger.error(`Error polling swaps: ${error.message}`);
    }
  }

  /**
   * Process a single swap
   * 
   * @param swapId - Swap identifier
   */
  private async processSwap(swapId: string) {
    try {
      const details = await this.aztecService.getSwapDetails(swapId);
      
      this.logger.debug(`Processing swap ${swapId}: status=${SwapStatus[details.status]}`);
      
      // Cache current status
      this.swapStatusCache.set(swapId, details.status);

      // Emit event based on status
      switch (details.status) {
        case SwapStatus.ACTIVE:
          await this.handleSwapInitiated(swapId, details);
          break;
        case SwapStatus.COMPLETED:
          await this.handleSwapCompleted(swapId, details);
          break;
        case SwapStatus.REFUNDED:
          await this.handleSwapRefunded(swapId, details);
          break;
        default:
          // SwapStatus.NONE - ignore
          break;
      }
    } catch (error) {
      this.logger.error(`Error processing swap ${swapId}: ${error.message}`);
    }
  }

  /**
   * Check existing swaps for status changes
   */
  private async checkStatusChanges() {
    try {
      // Check cached swaps for status changes
      for (const [swapId, cachedStatus] of this.swapStatusCache.entries()) {
        // Skip if already completed or refunded
        if (cachedStatus === SwapStatus.COMPLETED || cachedStatus === SwapStatus.REFUNDED) {
          continue;
        }

        const currentStatus = await this.aztecService.getSwapStatus(swapId);
        
        // Status changed!
        if (currentStatus !== cachedStatus) {
          this.logger.log(`📢 Status change for swap ${swapId}: ${SwapStatus[cachedStatus]} → ${SwapStatus[currentStatus]}`);
          
          // Update cache
          this.swapStatusCache.set(swapId, currentStatus);
          
          // Handle status change
          const details = await this.aztecService.getSwapDetails(swapId);
          
          if (currentStatus === SwapStatus.COMPLETED) {
            await this.handleSwapCompleted(swapId, details);
          } else if (currentStatus === SwapStatus.REFUNDED) {
            await this.handleSwapRefunded(swapId, details);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error checking status changes: ${error.message}`);
    }
  }

  /**
   * Handle swap initiated event
   */
  private async handleSwapInitiated(swapId: string, details: any) {
    this.logger.log(`🆕 Swap initiated: ${swapId} → ${details.targetChain}`);
    
    const event: SwapInitiatedEvent = {
      swapId,
      targetChain: details.targetChain,
      targetSwapId: details.targetSwapId,
      tokenAddress: details.tokenAddress,
      timestamp: new Date(),
    };

    // Emit event for swap coordinator
    this.eventEmitter.emit('aztec.swap.initiated', event);
  }

  /**
   * Handle swap completed event
   * 
   * CRITICAL: This is where we get the revealed secret!
   */
  private async handleSwapCompleted(swapId: string, details: any) {
    this.logger.log(`✅ Swap completed: ${swapId} (secret revealed!)`);
    
    if (!details.secret) {
      this.logger.error(`Swap ${swapId} is completed but secret is not available!`);
      return;
    }

    const event: SwapCompletedEvent = {
      swapId,
      secret: details.secret,
      targetChain: details.targetChain,
      targetSwapId: details.targetSwapId,
      timestamp: new Date(),
    };

    // Emit event for swap coordinator
    this.eventEmitter.emit('aztec.swap.completed', event);
  }

  /**
   * Handle swap refunded event
   */
  private async handleSwapRefunded(swapId: string, details: any) {
    this.logger.log(`🔄 Swap refunded: ${swapId}`);
    
    const event: SwapRefundedEvent = {
      swapId,
      targetChain: details.targetChain,
      targetSwapId: details.targetSwapId,
      timestamp: new Date(),
    };

    // Emit event for swap coordinator
    this.eventEmitter.emit('aztec.swap.refunded', event);
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      lastProcessedSwap: this.lastProcessedSwap.toString(),
      cachedSwaps: this.swapStatusCache.size,
      intervalMs: this.config.monitoringInterval,
    };
  }
}

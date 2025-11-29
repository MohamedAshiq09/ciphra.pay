import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StarknetService } from './starknet.service';
import { AppConfigService } from '../../common/config/config.service';
import {
  StarknetSwapInitiatedEvent,
  StarknetSwapCompletedEvent,
  StarknetSwapRefundedEvent,
} from './dto/swap.dto';

/**
 * Starknet Listener Service
 * 
 * Continuously listens to Starknet contract events:
 * - Polls for events every 5 seconds
 * - Detects SwapInitiated, SwapCompleted, SwapRefunded events
 * - Emits events for cross-chain coordination
 * 
 * This is CRITICAL for detecting:
 * 1. New swaps initiated on Starknet → Create counterparty swap on Aztec
 * 2. Swaps completed on Starknet → SECRET REVEALED! Complete swap on Aztec
 * 3. Swaps refunded on Starknet → Update database
 */
@Injectable()
export class StarknetListenerService implements OnModuleInit {
  private readonly logger = new Logger(StarknetListenerService.name);
  private isListening = false;
  private listeningInterval: NodeJS.Timeout;
  private lastProcessedBlock = 0;

  constructor(
    private starknetService: StarknetService,
    private config: AppConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    // Start listening after a short delay
    setTimeout(() => this.startListening(), 2000);
  }

  /**
   * Start listening to Starknet events
   */
  async startListening() {
    if (this.isListening) {
      this.logger.warn('Listening already started');
      return;
    }

    this.logger.log('🔍 Starting Starknet event listening...');
    this.isListening = true;

    // Get current block as starting point
    try {
      const provider = this.starknetService.getProvider();
      const block = await provider.getBlockLatestAccepted();
      this.lastProcessedBlock = block.block_number;
      this.logger.log(`Starting from block: ${this.lastProcessedBlock}`);
    } catch (error) {
      this.logger.error(`Failed to get current block: ${error.message}`);
    }

    // Start polling interval
    const intervalMs = this.config.monitoringInterval;
    this.listeningInterval = setInterval(
      () => this.pollEvents(),
      intervalMs,
    );

    this.logger.log(`✅ Listening started (polling every ${intervalMs}ms)`);
  }

  /**
   * Stop listening
   */
  stopListening() {
    if (!this.isListening) {
      return;
    }

    this.logger.log('Stopping Starknet event listening...');
    clearInterval(this.listeningInterval);
    this.isListening = false;
    this.logger.log('✅ Listening stopped');
  }

  /**
   * Poll for new events
   */
  private async pollEvents() {
    try {
      const provider = this.starknetService.getProvider();
      const contractAddress = this.config.starknetAtomicSwapAddress;

      // Get events from last processed block to latest
      const events = await provider.getEvents({
        from_block: { block_number: this.lastProcessedBlock },
        to_block: 'latest',
        address: contractAddress,
        keys: [
          // Event selectors (hashed event names)
          // TODO: Calculate actual event selectors
          // hash.getSelectorFromName('SwapInitiated'),
          // hash.getSelectorFromName('SwapCompleted'),
          // hash.getSelectorFromName('SwapRefunded'),
        ],
        chunk_size: 100,
      });

      if (events.events.length > 0) {
        this.logger.log(`📊 Found ${events.events.length} new events`);
        
        for (const event of events.events) {
          await this.processEvent(event);
        }
      }

      // Update last processed block
      const latestBlock = await provider.getBlockLatestAccepted();
      this.lastProcessedBlock = latestBlock.block_number;

    } catch (error) {
      this.logger.error(`Error polling events: ${error.message}`);
    }
  }

  /**
   * Process a single event
   */
  private async processEvent(event: any) {
    try {
      const eventName = this.getEventName(event.keys[0]);
      
      this.logger.debug(`Processing event: ${eventName}`);

      switch (eventName) {
        case 'SwapInitiated':
          await this.handleSwapInitiated(event);
          break;
        case 'SwapCompleted':
          await this.handleSwapCompleted(event);
          break;
        case 'SwapRefunded':
          await this.handleSwapRefunded(event);
          break;
        default:
          this.logger.debug(`Unknown event: ${eventName}`);
      }
    } catch (error) {
      this.logger.error(`Error processing event: ${error.message}`);
    }
  }

  /**
   * Get event name from selector
   */
  private getEventName(selector: string): string {
    // TODO: Map selectors to event names
    // For now, return placeholder
    return 'Unknown';
  }

  /**
   * Handle SwapInitiated event
   */
  private async handleSwapInitiated(event: any) {
    this.logger.log(`🆕 Swap initiated on Starknet`);
    
    // Parse event data
    // Event structure:
    // keys: [event_selector, swap_id]
    // data: [initiator, recipient, amount, token_address, hash_lock, time_lock, target_chain, target_swap_id]
    
    const swapId = event.keys[1];
    const [
      initiator,
      recipient,
      amount,
      tokenAddress,
      hashLock,
      timeLock,
      targetChain,
      targetSwapId,
    ] = event.data;

    const eventData: StarknetSwapInitiatedEvent = {
      swapId,
      initiator,
      recipient,
      amount,
      tokenAddress,
      hashLock,
      timeLock: Number(timeLock),
      targetChain,
      targetSwapId,
      timestamp: new Date(),
      txHash: event.transaction_hash,
    };

    // Emit event for swap coordinator
    this.eventEmitter.emit('starknet.swap.initiated', eventData);
  }

  /**
   * Handle SwapCompleted event
   * 
   * CRITICAL: This is where we get the revealed secret!
   */
  private async handleSwapCompleted(event: any) {
    this.logger.log(`✅ Swap completed on Starknet (secret revealed!)`);
    
    // Parse event data
    // Event structure:
    // keys: [event_selector, swap_id]
    // data: [recipient, secret, amount_transferred, fee_collected, target_chain, target_swap_id]
    
    const swapId = event.keys[1];
    const [
      recipient,
      secret, // THE SECRET IS HERE!
      amountTransferred,
      feeCollected,
      targetChain,
      targetSwapId,
    ] = event.data;

    const eventData: StarknetSwapCompletedEvent = {
      swapId,
      recipient,
      secret, // Pass secret to coordinator!
      amountTransferred,
      feeCollected,
      targetChain,
      targetSwapId,
      timestamp: new Date(),
      txHash: event.transaction_hash,
    };

    // Emit event for swap coordinator
    this.eventEmitter.emit('starknet.swap.completed', eventData);
  }

  /**
   * Handle SwapRefunded event
   */
  private async handleSwapRefunded(event: any) {
    this.logger.log(`🔄 Swap refunded on Starknet`);
    
    // Parse event data
    // keys: [event_selector, swap_id]
    // data: [initiator, amount, target_chain]
    
    const swapId = event.keys[1];
    const [initiator, amount, targetChain] = event.data;

    const eventData: StarknetSwapRefundedEvent = {
      swapId,
      initiator,
      amount,
      targetChain,
      timestamp: new Date(),
      txHash: event.transaction_hash,
    };

    // Emit event for swap coordinator
    this.eventEmitter.emit('starknet.swap.refunded', eventData);
  }

  /**
   * Get listening status
   */
  getStatus() {
    return {
      isListening: this.isListening,
      lastProcessedBlock: this.lastProcessedBlock,
      intervalMs: this.config.monitoringInterval,
    };
  }
}

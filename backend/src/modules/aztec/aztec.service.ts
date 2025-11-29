import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createPXEClient, PXE, AztecAddress, Fr } from '@aztec/aztec.js';
import { AppConfigService } from '../../common/config/config.service';
import { PrivateAtomicSwapContract } from '../../../contract/aztec-contracts/src/artifacts/PrivateAtomicSwap.js';
import {
  SwapStatus,
  TargetChain,
  AztecSwapDetails,
  InitiateSwapDto,
  CompleteSwapDto,
  RefundSwapDto,
} from './dto/swap.dto';

/**
 * Aztec Service
 * 
 * Handles all interactions with the Aztec PrivateAtomicSwap contract:
 * - Connects to PXE (Private Execution Environment)
 * - Loads deployed contract
 * - Queries public state variables
 * - Calls contract functions
 */
@Injectable()
export class AztecService implements OnModuleInit {
  private readonly logger = new Logger(AztecService.name);
  private pxe: PXE;
  private contract: PrivateAtomicSwapContract;
  private contractAddress: AztecAddress;

  constructor(private config: AppConfigService) {}

  async onModuleInit() {
    await this.initialize();
  }

  /**
   * Initialize PXE connection and load contract
   */
  private async initialize() {
    try {
      this.logger.log(`Connecting to Aztec PXE at ${this.config.aztecPxeUrl}...`);
      
      // Create PXE client
      this.pxe = createPXEClient(this.config.aztecPxeUrl);
      
      // Parse contract address
      this.contractAddress = AztecAddress.fromString(
        this.config.aztecContractAddress,
      );
      
      // Load contract
      this.contract = await PrivateAtomicSwapContract.at(
        this.contractAddress,
        this.pxe,
      );
      
      this.logger.log(`✅ Connected to Aztec PXE`);
      this.logger.log(`✅ Loaded PrivateAtomicSwap contract at ${this.contractAddress.toString()}`);
      
      // Verify connection by reading total swaps
      const totalSwaps = await this.getTotalSwaps();
      this.logger.log(`📊 Total swaps on contract: ${totalSwaps}`);
      
    } catch (error) {
      this.logger.error(`Failed to initialize Aztec service: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get total number of swaps
   */
  async getTotalSwaps(): Promise<bigint> {
    try {
      const total = await this.contract.methods.get_total_swaps().simulate();
      return total;
    } catch (error) {
      this.logger.error(`Failed to get total swaps: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get number of completed swaps
   */
  async getCompletedSwaps(): Promise<bigint> {
    try {
      const completed = await this.contract.methods.get_completed_swaps().simulate();
      return completed;
    } catch (error) {
      this.logger.error(`Failed to get completed swaps: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get swap status
   * 
   * @param swapId - Swap identifier
   * @returns SwapStatus enum (0=None, 1=Active, 2=Completed, 3=Refunded)
   */
  async getSwapStatus(swapId: string): Promise<SwapStatus> {
    try {
      const swapIdField = Fr.fromString(swapId);
      const status = await this.contract.methods.get_swap_status(swapIdField).simulate();
      return Number(status) as SwapStatus;
    } catch (error) {
      this.logger.error(`Failed to get swap status for ${swapId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get revealed secret (only available when status = COMPLETED)
   * 
   * @param swapId - Swap identifier
   * @returns Secret as hex string, or null if not revealed
   */
  async getRevealedSecret(swapId: string): Promise<string | null> {
    try {
      const swapIdField = Fr.fromString(swapId);
      const secret = await this.contract.methods.get_revealed_secret(swapIdField).simulate();
      
      // Check if secret is zero (not revealed)
      if (secret === 0n) {
        return null;
      }
      
      return '0x' + secret.toString(16);
    } catch (error) {
      this.logger.error(`Failed to get revealed secret for ${swapId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get target chain for a swap
   * 
   * @param swapId - Swap identifier
   * @returns TargetChain enum
   */
  async getTargetChain(swapId: string): Promise<TargetChain> {
    try {
      const swapIdField = Fr.fromString(swapId);
      const chain = await this.contract.methods.get_target_chain(swapIdField).simulate();
      return Number(chain) as TargetChain;
    } catch (error) {
      this.logger.error(`Failed to get target chain for ${swapId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get target swap ID on other chain
   * 
   * @param swapId - Swap identifier
   * @returns Target swap ID as string
   */
  async getTargetSwapId(swapId: string): Promise<string> {
    try {
      const swapIdField = Fr.fromString(swapId);
      const targetId = await this.contract.methods.get_target_swap_id(swapIdField).simulate();
      return targetId.toString();
    } catch (error) {
      this.logger.error(`Failed to get target swap ID for ${swapId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get token address for a swap
   * 
   * @param swapId - Swap identifier
   * @returns Token contract address
   */
  async getTokenAddress(swapId: string): Promise<string> {
    try {
      const swapIdField = Fr.fromString(swapId);
      const tokenAddr = await this.contract.methods.get_token_address(swapIdField).simulate();
      return tokenAddr.toString();
    } catch (error) {
      this.logger.error(`Failed to get token address for ${swapId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get complete swap details
   * 
   * @param swapId - Swap identifier
   * @returns Complete swap details
   */
  async getSwapDetails(swapId: string): Promise<AztecSwapDetails> {
    try {
      const [status, targetChain, targetSwapId, tokenAddress, secret] = await Promise.all([
        this.getSwapStatus(swapId),
        this.getTargetChain(swapId),
        this.getTargetSwapId(swapId),
        this.getTokenAddress(swapId),
        this.getRevealedSecret(swapId),
      ]);

      return {
        swapId,
        status,
        targetChain,
        targetSwapId,
        tokenAddress,
        secret: secret || undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get swap details for ${swapId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get current fee percentage
   */
  async getFeePercentage(): Promise<bigint> {
    try {
      const fee = await this.contract.methods.get_fee_percentage().simulate();
      return fee;
    } catch (error) {
      this.logger.error(`Failed to get fee percentage: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get fee recipient address
   */
  async getFeeRecipient(): Promise<string> {
    try {
      const recipient = await this.contract.methods.get_fee_recipient().simulate();
      return recipient.toString();
    } catch (error) {
      this.logger.error(`Failed to get fee recipient: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get collected fees for a token
   * 
   * @param tokenAddress - Token contract address
   * @returns Collected fee amount
   */
  async getCollectedFees(tokenAddress: string): Promise<bigint> {
    try {
      const tokenAddr = AztecAddress.fromString(tokenAddress);
      const fees = await this.contract.methods.get_collected_fees(tokenAddr).simulate();
      return fees;
    } catch (error) {
      this.logger.error(`Failed to get collected fees: ${error.message}`);
      throw error;
    }
  }

  /**
   * Complete a swap with revealed secret
   * 
   * NOTE: This should be called by the backend when a secret is revealed on another chain
   * 
   * @param dto - Complete swap parameters
   * @returns Transaction hash
   */
  async completeSwap(dto: CompleteSwapDto): Promise<string> {
    try {
      this.logger.log(`Completing swap ${dto.swapId} with revealed secret...`);
      
      const swapIdField = Fr.fromString(dto.swapId);
      const secretField = Fr.fromString(dto.secret);
      
      // TODO: Get wallet from config and send transaction
      // For now, this is a placeholder
      // const tx = await this.contract.methods
      //   .complete_private_swap(swapIdField, secretField, dto.hashType)
      //   .send()
      //   .wait();
      
      this.logger.warn('Complete swap not yet implemented - needs wallet integration');
      return 'pending';
    } catch (error) {
      this.logger.error(`Failed to complete swap: ${error.message}`);
      throw error;
    }
  }

  /**
   * Refund an expired swap
   * 
   * @param dto - Refund swap parameters
   * @returns Transaction hash
   */
  async refundSwap(dto: RefundSwapDto): Promise<string> {
    try {
      this.logger.log(`Refunding swap ${dto.swapId}...`);
      
      const swapIdField = Fr.fromString(dto.swapId);
      
      // TODO: Get wallet from config and send transaction
      // const tx = await this.contract.methods
      //   .refund_private_swap(swapIdField)
      //   .send()
      //   .wait();
      
      this.logger.warn('Refund swap not yet implemented - needs wallet integration');
      return 'pending';
    } catch (error) {
      this.logger.error(`Failed to refund swap: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get PXE client (for advanced usage)
   */
  getPXE(): PXE {
    return this.pxe;
  }

  /**
   * Get contract instance (for advanced usage)
   */
  getContract(): PrivateAtomicSwapContract {
    return this.contract;
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  RpcProvider,
  Contract,
  Account,
  ec,
  hash,
  CallData,
  uint256,
} from 'starknet';
import { AppConfigService } from '../../common/config/config.service';
import {
  StarknetSwapStatus,
  StarknetSwapDetails,
  InitiateStarknetSwapDto,
  CompleteStarknetSwapDto,
  RefundStarknetSwapDto,
} from './dto/swap.dto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Starknet Service
 *
 * Handles all interactions with Starknet AtomicSwapV2 contract:
 * - Connects to Starknet RPC provider
 * - Loads deployed contract
 * - Queries swap details
 * - Calls contract functions
 */
@Injectable()
export class StarknetService implements OnModuleInit {
  private readonly logger = new Logger(StarknetService.name);
  private provider: RpcProvider;
  private contract: Contract;
  private account: Account;

  constructor(private config: AppConfigService) {}

  async onModuleInit() {
    await this.initialize();
  }

  /**
   * Initialize Starknet provider and load contract
   */
  private async initialize() {
    try {
      this.logger.log(
        `Connecting to Starknet RPC at ${this.config.starknetRpcUrl}...`,
      );

      // Create RPC provider
      this.provider = new RpcProvider({
        nodeUrl: this.config.starknetRpcUrl,
      });

      // Load contract ABI from file
      // Use process.cwd() for a stable path that works both in dev and prod
      try {
        const abiPath = path.join(
          process.cwd(),
          'src/contracts/AtomicSwapV2.json',
        );
        const abi = JSON.parse(fs.readFileSync(abiPath, 'utf-8'));

        // starknet.js v8 uses ContractOptions object
        this.contract = new Contract({
          abi: abi,
          address: this.config.starknetAtomicSwapAddress,
          providerOrAccount: this.provider,
        });
        this.logger.log(`✅ Loaded AtomicSwapV2 ABI from ${abiPath}`);
      } catch (abiError) {
        this.logger.warn(`⚠️ Could not load ABI file: ${abiError.message}`);
        this.logger.warn(`   Contract calls will be limited`);
      }

      this.logger.log(`✅ Connected to Starknet RPC`);
      this.logger.log(
        `✅ Loaded AtomicSwapV2 contract at ${this.config.starknetAtomicSwapAddress}`,
      );

      // Initialize account if private key is provided
      if (this.config.starknetWalletPrivateKey) {
        await this.initializeAccount();
      }
    } catch (error) {
      this.logger.error(
        `Failed to initialize Starknet service: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Initialize Starknet account for sending transactions
   */
  private async initializeAccount() {
    try {
      const privateKey = this.config.starknetWalletPrivateKey;
      const accountAddress = this.config.starknetWalletAddress;

      // starknet.js v8 uses AccountOptions object
      this.account = new Account({
        provider: this.provider,
        address: accountAddress,
        signer: privateKey,
      });

      this.logger.log(`✅ Initialized Starknet account: ${accountAddress}`);
    } catch (error) {
      this.logger.warn(`Failed to initialize account: ${error.message}`);
    }
  }

  /**
   * Get swap details from contract
   *
   * @param swapId - Swap identifier
   * @returns Swap details
   */
  async getSwapDetails(swapId: string): Promise<StarknetSwapDetails> {
    try {
      // TODO: Call contract.get_swap(swapId)
      // For now, return placeholder
      this.logger.warn(
        'getSwapDetails not yet implemented - needs contract ABI',
      );

      return {
        swapId,
        initiator: '0x0',
        recipient: '0x0',
        amount: '0',
        tokenAddress: '0x0',
        hashLock: '0x0',
        timeLock: 0,
        status: StarknetSwapStatus.EMPTY,
        secret: '0x0',
        targetChain: '',
        targetSwapId: '',
        createdAt: 0,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get swap details for ${swapId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Initiate a swap on Starknet
   *
   * @param dto - Swap parameters
   * @returns Transaction hash
   */
  async initiateSwap(dto: InitiateStarknetSwapDto): Promise<string> {
    try {
      this.logger.log(`🔴 Initiating swap ${dto.swapId} on Starknet...`);
      this.logger.log(`   Recipient: ${dto.recipient}`);
      this.logger.log(`   Amount: ${dto.amount}`);
      this.logger.log(`   Hash lock: ${dto.hashLock.substring(0, 20)}...`);
      this.logger.log(`   Time lock: ${dto.timeLock}s`);

      if (!this.account) {
        throw new Error(
          'Account not initialized - check STARKNET_WALLET_PRIVATE_KEY',
        );
      }

      if (!this.contract) {
        throw new Error('Contract not initialized - ABI not loaded');
      }

      // Create a new contract instance connected to the account for writing
      const connectedContract = new Contract({
        abi: this.contract.abi,
        address: this.contract.address,
        providerOrAccount: this.account,
      });

      // For u256, starknet.js v8 with ABI can accept BigInt directly
      // Or we can pass as { low, high } object
      const amountBigInt = BigInt(dto.amount);

      this.logger.log(`📝 Calling contract.initiate_swap()...`);
      this.logger.log(`   swap_id: ${dto.swapId}`);
      this.logger.log(`   recipient: ${dto.recipient}`);
      this.logger.log(`   hash_lock: ${dto.hashLock}`);
      this.logger.log(`   time_lock: ${dto.timeLock}`);
      this.logger.log(`   amount: ${amountBigInt}`);
      this.logger.log(`   token_address: ${dto.tokenAddress}`);
      this.logger.log(`   target_chain: ${dto.targetChain}`);
      this.logger.log(`   target_swap_id: ${dto.targetSwapId}`);

      // Call initiate_swap on the contract
      // With proper ABI, starknet.js handles type conversion
      const tx = await connectedContract.initiate_swap(
        dto.swapId, // swap_id: felt252
        dto.recipient, // recipient: ContractAddress
        dto.hashLock, // hash_lock: felt252
        dto.timeLock, // time_lock: u64
        amountBigInt, // amount: u256 - pass as BigInt
        dto.tokenAddress, // token_address: ContractAddress
        dto.targetChain, // target_chain: felt252
        dto.targetSwapId, // target_swap_id: felt252
      );

      this.logger.log(`✅ Transaction submitted: ${tx.transaction_hash}`);

      // Wait for transaction to be accepted
      this.logger.log(`⏳ Waiting for transaction confirmation...`);
      await this.provider.waitForTransaction(tx.transaction_hash);

      this.logger.log(`✅ Swap initiated successfully!`);
      return tx.transaction_hash;
    } catch (error) {
      this.logger.error(`Failed to initiate swap: ${error.message}`);
      throw error;
    }
  }

  /**
   * Complete a swap on Starknet
   *
   * @param dto - Complete swap parameters
   * @returns Transaction hash
   */
  async completeSwap(dto: CompleteStarknetSwapDto): Promise<string> {
    try {
      this.logger.log(`Completing swap ${dto.swapId} on Starknet...`);

      if (!this.account) {
        throw new Error('Account not initialized');
      }

      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      // Create a new contract instance connected to the account for signing
      const connectedContract = new Contract({
        abi: this.contract.abi,
        address: this.contract.address,
        providerOrAccount: this.account,
      });

      this.logger.log(`Calling complete_swap with swapId=${dto.swapId}`);
      this.logger.log(`Secret: ${dto.secret.substring(0, 20)}...`);

      // Call complete_swap on the contract
      // secret is felt252, not u256
      const tx = await connectedContract.complete_swap(
        dto.swapId,
        dto.secret,
      );

      this.logger.log(`Transaction submitted: ${tx.transaction_hash}`);

      // Wait for transaction
      await this.provider.waitForTransaction(tx.transaction_hash);
      this.logger.log(`Transaction confirmed`);

      this.logger.log(`✅ Swap completed successfully!`);
      return tx.transaction_hash;
    } catch (error) {
      this.logger.error(`Failed to complete swap: ${error.message}`);
      throw error;
    }
  }

  /**
   * Refund a swap on Starknet
   *
   * @param dto - Refund swap parameters
   * @returns Transaction hash
   */
  async refundSwap(dto: RefundStarknetSwapDto): Promise<string> {
    try {
      this.logger.log(`Refunding swap ${dto.swapId} on Starknet...`);

      if (!this.account) {
        throw new Error('Account not initialized');
      }

      // TODO: Call contract.refund_swap()
      this.logger.warn('refundSwap not yet implemented - needs contract ABI');
      return 'pending';
    } catch (error) {
      this.logger.error(`Failed to refund swap: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get provider (for advanced usage)
   */
  getProvider(): RpcProvider {
    return this.provider;
  }

  /**
   * Get contract instance (for advanced usage)
   */
  getContract(): Contract {
    return this.contract;
  }

  /**
   * Get account (for advanced usage)
   */
  getAccount(): Account | undefined {
    return this.account;
  }
}

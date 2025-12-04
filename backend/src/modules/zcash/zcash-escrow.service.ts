/**
 * Zcash Escrow Service
 * 
 * This service manages the facilitator's Zcash escrow wallet for cross-chain swaps.
 * 
 * ARCHITECTURE:
 * ============
 * For STRK → ZEC swaps:
 * 1. User locks STRK in Starknet contract with hash lock
 * 2. Backend (facilitator) verifies the lock
 * 3. Backend sends ZEC from escrow wallet to user's Zcash address
 * 4. User reveals secret to complete the Starknet side
 * 
 * For ZEC → STRK swaps:
 * 1. User sends ZEC to escrow address with HTLC memo
 * 2. Backend monitors for the deposit
 * 3. Backend releases STRK from contract to user
 * 4. Secret is revealed, completing the swap
 * 
 * REQUIREMENTS:
 * - Funded Zcash escrow wallet (YOUR private key)
 * - Tatum API for RPC access (no need to run a full node)
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AppConfigService } from '../../common/config/config.service';
import * as crypto from 'crypto';

// Zcash SDK types
interface UTXO {
  txid: string;
  vout: number;
  amount: number;
  scriptPubKey: {
    hex: string;
    addresses: string[];
  };
  confirmations: number;
}

interface ZcashConfig {
  server: {
    host: string;
    user: string;
    password: string;
  };
  mainnet: boolean;
}

@Injectable()
export class ZcashEscrowService implements OnModuleInit {
  private readonly logger = new Logger(ZcashEscrowService.name);
  private zcashLib: any;
  private config: ZcashConfig;
  
  // Escrow wallet (YOUR funded wallet)
  private escrowAddress: string;
  private escrowPrivateKey: string;

  constructor(private readonly configService: AppConfigService) {}

  async onModuleInit() {
    await this.initialize();
  }

  private async initialize() {
    try {
      // Dynamically import Zcash library
      this.zcashLib = await import('@mayaprotocol/zcash-js');
      
      // Configure for Tatum API
      const tatumApiKey = this.configService.tatumApiKey || 't-6931360ba55fabe01056b1cc-2cc677d35ead4761a07fb9ca';
      const isMainnet = this.configService.zcashNetwork === 'mainnet';
      
      this.config = {
        server: {
          host: isMainnet 
            ? `https://zcash-mainnet.gateway.tatum.io`
            : `https://zcash-testnet.gateway.tatum.io`,
          user: 'x-api-key',
          password: tatumApiKey,
        },
        mainnet: isMainnet,
      };

      // Load escrow wallet from config (using facilitator address)
      try {
        this.escrowPrivateKey = this.configService.zcashFacilitatorPrivateKey;
        this.escrowAddress = this.configService.zcashFacilitatorAddress;
      } catch {
        this.escrowPrivateKey = '';
        this.escrowAddress = '';
      }

      if (!this.escrowPrivateKey || !this.escrowAddress) {
        this.logger.warn('⚠️ Zcash escrow wallet not configured. Generate one with generateEscrowWallet()');
      } else {
        this.logger.log(`✅ Zcash Escrow Service initialized`);
        this.logger.log(`   Escrow Address: ${this.escrowAddress}`);
        this.logger.log(`   Network: ${isMainnet ? 'mainnet' : 'testnet'}`);
      }
    } catch (error) {
      this.logger.error('Failed to initialize Zcash Escrow Service', error);
    }
  }

  /**
   * Generate a new escrow wallet
   * IMPORTANT: Save the private key securely!
   */
  async generateEscrowWallet(): Promise<{
    address: string;
    privateKey: string;
    publicKey: string;
  }> {
    const { pkToAddr, testnetPrefix, mainnetPrefix } = this.zcashLib;
    
    // Generate random private key (32 bytes)
    const privateKeyBytes = crypto.randomBytes(32);
    const privateKeyHex = privateKeyBytes.toString('hex');
    
    // Derive public key using secp256k1 (same as Bitcoin)
    const { createPublicKey, createPrivateKey } = await import('crypto');
    const keyObject = createPrivateKey({
      key: Buffer.concat([
        Buffer.from('302e0201010420', 'hex'),
        privateKeyBytes,
        Buffer.from('a00706052b8104000a', 'hex'),
      ]),
      format: 'der',
      type: 'sec1',
    });
    
    const publicKeyDer = createPublicKey(keyObject).export({ type: 'spki', format: 'der' });
    const publicKeyHex = publicKeyDer.slice(-65).toString('hex'); // Uncompressed public key
    
    // Compress the public key (33 bytes)
    const publicKeyBytes = Buffer.from(publicKeyHex, 'hex');
    const prefix = publicKeyBytes[64] % 2 === 0 ? 0x02 : 0x03;
    const compressedPublicKey = Buffer.concat([
      Buffer.from([prefix]),
      publicKeyBytes.slice(1, 33),
    ]);
    
    // Generate address
    const isMainnet = this.config?.mainnet ?? false;
    const addressPrefix = isMainnet ? mainnetPrefix : testnetPrefix;
    const address = pkToAddr(compressedPublicKey, Buffer.from(addressPrefix));

    this.logger.log('🔑 New Zcash Escrow Wallet Generated');
    this.logger.log(`   Address: ${address}`);
    this.logger.log(`   SAVE THE PRIVATE KEY SECURELY!`);
    
    return {
      address,
      privateKey: privateKeyHex,
      publicKey: compressedPublicKey.toString('hex'),
    };
  }

  /**
   * Get escrow wallet balance
   */
  async getEscrowBalance(): Promise<{
    address: string;
    balance: number;
    utxoCount: number;
  }> {
    if (!this.escrowAddress) {
      throw new Error('Escrow wallet not configured');
    }

    const { getUTXOS } = this.zcashLib;
    
    try {
      const utxos: UTXO[] = await getUTXOS(this.escrowAddress, this.config);
      const balance = utxos.reduce((sum, utxo) => sum + utxo.amount, 0);
      
      return {
        address: this.escrowAddress,
        balance: balance / 100000000, // Convert satoshis to ZEC
        utxoCount: utxos.length,
      };
    } catch (error) {
      this.logger.error('Failed to get escrow balance', error);
      throw error;
    }
  }

  /**
   * Release ZEC from escrow to user
   * Called when user has locked STRK and we need to send them ZEC
   */
  async releaseToUser(params: {
    userZcashAddress: string;
    amountZec: number;
    swapId: string;
    hashLock: string;
  }): Promise<{
    txid: string;
    amount: number;
    fee: number;
  }> {
    const { buildTx, signAndFinalize, sendRawTransaction, getUTXOS } = this.zcashLib;
    
    if (!this.escrowPrivateKey || !this.escrowAddress) {
      throw new Error('Escrow wallet not configured');
    }

    // Validate user's address
    const { isValidAddr, testnetPrefix, mainnetPrefix } = this.zcashLib;
    const prefix = this.config.mainnet ? mainnetPrefix : testnetPrefix;
    
    if (!isValidAddr(params.userZcashAddress, Buffer.from(prefix))) {
      throw new Error(`Invalid Zcash address: ${params.userZcashAddress}`);
    }

    this.logger.log(`💸 Releasing ZEC from escrow`);
    this.logger.log(`   To: ${params.userZcashAddress}`);
    this.logger.log(`   Amount: ${params.amountZec} ZEC`);
    this.logger.log(`   Swap ID: ${params.swapId}`);

    try {
      // Get UTXOs for escrow address
      const utxos: UTXO[] = await getUTXOS(this.escrowAddress, this.config);
      
      if (utxos.length === 0) {
        throw new Error('No UTXOs available in escrow wallet');
      }

      // Calculate amount in satoshis
      const amountSatoshis = Math.floor(params.amountZec * 100000000);
      
      // Build memo for tracking (HTLC reference)
      const memo = `HTLC:${params.swapId}:${params.hashLock.substring(0, 16)}`;

      // Get current block height (approximate)
      const blockHeight = 0; // Library handles this

      // Build transaction
      const tx = await buildTx(
        blockHeight,
        this.escrowAddress,
        params.userZcashAddress,
        amountSatoshis,
        utxos,
        true, // extra fee for memo
        memo,
      );

      // Sign transaction
      const signedTx = await signAndFinalize(
        tx.height,
        this.escrowPrivateKey,
        tx.inputs,
        tx.outputs,
      );

      // Broadcast transaction
      const txid = await sendRawTransaction(signedTx, this.config);

      this.logger.log(`✅ ZEC released successfully`);
      this.logger.log(`   TXID: ${txid}`);

      return {
        txid,
        amount: params.amountZec,
        fee: tx.fee / 100000000, // Convert satoshis to ZEC
      };
    } catch (error) {
      this.logger.error('Failed to release ZEC from escrow', error);
      throw error;
    }
  }

  /**
   * Monitor for incoming ZEC deposits to escrow
   * Called when user wants to swap ZEC → STRK
   */
  async checkForDeposit(params: {
    expectedHashLock: string;
    minAmount: number;
    minConfirmations?: number;
  }): Promise<{
    found: boolean;
    txid?: string;
    amount?: number;
    confirmations?: number;
    sender?: string;
  }> {
    // Note: Full implementation would require transaction history lookup
    // Tatum API supports this via their REST endpoints
    
    this.logger.log(`🔍 Checking for deposit with hash: ${params.expectedHashLock}`);
    
    // In production, you would:
    // 1. List recent transactions to escrow address
    // 2. Check memo field for matching hash lock
    // 3. Verify amount and confirmations
    
    return {
      found: false,
      // Would return txid, amount, etc. when found
    };
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(txid: string): Promise<{
    confirmed: boolean;
    confirmations: number;
    blockHash?: string;
  }> {
    // Would use Tatum API to check transaction status
    this.logger.log(`📊 Checking transaction: ${txid}`);
    
    return {
      confirmed: false,
      confirmations: 0,
    };
  }

  /**
   * Validate a Zcash address
   */
  validateAddress(address: string): boolean {
    if (!this.zcashLib) {
      throw new Error('Zcash library not initialized');
    }

    const { isValidAddr, testnetPrefix, mainnetPrefix } = this.zcashLib;
    const prefix = this.config?.mainnet ? mainnetPrefix : testnetPrefix;
    
    return isValidAddr(address, Buffer.from(prefix));
  }

  /**
   * Get service status
   */
  getStatus(): {
    initialized: boolean;
    network: string;
    escrowConfigured: boolean;
    escrowAddress?: string;
  } {
    return {
      initialized: !!this.zcashLib,
      network: this.config?.mainnet ? 'mainnet' : 'testnet',
      escrowConfigured: !!(this.escrowPrivateKey && this.escrowAddress),
      escrowAddress: this.escrowAddress || undefined,
    };
  }
}

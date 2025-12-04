import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../common/config/config.service';
import * as crypto from 'crypto';

export interface ZcashTxResult {
  txid: string;
  success: boolean;
  rawTx?: string;
  error?: string;
}

export interface ZcashConfig {
  server: {
    host: string;
    user: string;
    password: string;
  };
  mainnet: boolean;
}

/**
 * Zcash Transaction Service
 * 
 * Handles real Zcash transaction building, signing, and broadcasting
 * Uses @mayaprotocol/zcash-js for transparent address transactions
 * 
 * Note: This requires a Zcash node with RPC enabled for full functionality
 */
@Injectable()
export class ZcashTransactionService {
  private readonly logger = new Logger(ZcashTransactionService.name);
  private config: ZcashConfig;
  private facilitatorPrivateKey: string;
  private facilitatorAddress: string;
  private isTestnet: boolean;
  private zcashLib: any = null;

  constructor(private appConfig: AppConfigService) {
    this.initialize();
  }

  private initialize() {
    const network = this.appConfig.zcashNetwork || 'testnet';
    this.isTestnet = network === 'testnet';
    
    // Get facilitator credentials from config
    this.facilitatorPrivateKey = this.appConfig.zcashFacilitatorPrivateKey;
    this.facilitatorAddress = this.appConfig.zcashFacilitatorAddress;

    // Configure Zcash connection
    this.config = {
      server: {
        host: this.appConfig.zcashRpcUrl || 'http://localhost:8232',
        user: this.appConfig.zcashRpcUser || 'zcashrpc',
        password: this.appConfig.zcashRpcPassword || 'password',
      },
      mainnet: !this.isTestnet,
    };

    this.logger.log(`Zcash Transaction Service initialized`);
    this.logger.log(`  Network: ${network}`);
    this.logger.log(`  RPC URL: ${this.config.server.host}`);
    this.logger.log(`  Facilitator: ${this.facilitatorAddress?.substring(0, 20)}...`);
  }

  /**
   * Lazy load the Zcash library
   */
  private async getLib() {
    if (!this.zcashLib) {
      try {
        this.zcashLib = await import('@mayaprotocol/zcash-js');
        this.logger.log('Zcash library loaded successfully');
      } catch (error) {
        this.logger.error(`Failed to load Zcash library: ${error.message}`);
        throw error;
      }
    }
    return this.zcashLib;
  }

  /**
   * Generate a new Zcash transparent address from private key
   */
  async generateAddressFromPrivateKey(privateKeyHex: string): Promise<string> {
    try {
      const lib = await this.getLib();
      
      // Derive public key from private key using elliptic
      const { ec } = require('elliptic');
      const secp256k1 = new ec('secp256k1');
      const keyPair = secp256k1.keyFromPrivate(privateKeyHex, 'hex');
      const publicKey = Buffer.from(keyPair.getPublic(true, 'hex'), 'hex');
      
      const prefix = this.isTestnet 
        ? Buffer.from(lib.testnetPrefix) 
        : Buffer.from(lib.mainnetPrefix);
      
      return lib.pkToAddr(publicKey, prefix);
    } catch (error) {
      this.logger.error(`Failed to generate address: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate a Zcash address
   */
  async validateAddress(address: string): Promise<boolean> {
    try {
      const lib = await this.getLib();
      const prefix = this.isTestnet 
        ? Buffer.from(lib.testnetPrefix) 
        : Buffer.from(lib.mainnetPrefix);
      return lib.isValidAddr(address, prefix);
    } catch (error) {
      this.logger.error(`Address validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get UTXOs for an address
   */
  async getUTXOs(address: string): Promise<any[]> {
    try {
      const lib = await this.getLib();
      const utxos = await lib.getUTXOS(address, this.config);
      return utxos;
    } catch (error) {
      this.logger.error(`Failed to get UTXOs for ${address}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build, sign, and send a Zcash transaction
   * 
   * @param fromAddress - Source address
   * @param toAddress - Destination address
   * @param amountSatoshis - Amount in satoshis (1 ZEC = 100,000,000 satoshis)
   * @param privateKeyHex - Private key for signing
   * @param memo - Optional memo for the transaction
   */
  async sendTransaction(
    fromAddress: string,
    toAddress: string,
    amountSatoshis: number,
    privateKeyHex: string,
    memo?: string,
  ): Promise<ZcashTxResult> {
    try {
      const lib = await this.getLib();
      
      this.logger.log(`Building transaction: ${amountSatoshis} satoshis from ${fromAddress} to ${toAddress}`);

      // Get UTXOs
      const utxos = await lib.getUTXOS(fromAddress, this.config);
      if (!utxos || utxos.length === 0) {
        throw new Error(`No UTXOs found for address ${fromAddress}`);
      }

      this.logger.log(`Found ${utxos.length} UTXOs`);

      // Build transaction
      const tx = await lib.buildTx(
        0, // current block height (0 = latest)
        fromAddress,
        toAddress,
        amountSatoshis,
        utxos,
        !!memo, // extra fee for memo
        memo,
      );

      this.logger.log(`Transaction built with ${tx.inputs.length} inputs and ${tx.outputs.length} outputs`);

      // Sign transaction
      const signedTx = await lib.signAndFinalize(
        tx.height,
        privateKeyHex,
        tx.inputs,
        tx.outputs,
      );

      this.logger.log(`Transaction signed, size: ${signedTx.length} bytes`);

      // Broadcast transaction
      const txid = await lib.sendRawTransaction(signedTx, this.config);

      this.logger.log(`✅ Transaction broadcast: ${txid}`);

      return {
        txid,
        success: true,
        rawTx: signedTx.toString('hex'),
      };
    } catch (error) {
      this.logger.error(`Transaction failed: ${error.message}`);
      return {
        txid: '',
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send ZEC from facilitator wallet
   * 
   * @param toAddress - Destination address
   * @param amountZec - Amount in ZEC (e.g., "0.1")
   * @param memo - Optional memo
   */
  async sendFromFacilitator(
    toAddress: string,
    amountZec: string,
    memo?: string,
  ): Promise<ZcashTxResult> {
    if (!this.facilitatorPrivateKey) {
      return {
        txid: '',
        success: false,
        error: 'Facilitator private key not configured',
      };
    }
    if (!this.facilitatorAddress) {
      return {
        txid: '',
        success: false,
        error: 'Facilitator address not configured',
      };
    }

    // Convert ZEC to satoshis
    const amountSatoshis = Math.floor(parseFloat(amountZec) * 100000000);

    return this.sendTransaction(
      this.facilitatorAddress,
      toAddress,
      amountSatoshis,
      this.facilitatorPrivateKey,
      memo,
    );
  }

  /**
   * Create an HTLC-style transaction with time lock
   * 
   * Note: Zcash doesn't have native smart contracts like Ethereum/Starknet.
   * This implements a facilitator-based HTLC where:
   * 1. User deposits ZEC to facilitator with memo containing hash lock
   * 2. Facilitator holds funds until secret is revealed or timeout expires
   * 3. On secret reveal, facilitator releases to recipient
   * 4. On timeout, facilitator refunds to sender
   */
  async createHTLCDeposit(
    fromAddress: string,
    amountZec: string,
    hashLock: string,
    timeLock: number,
    privateKeyHex: string,
  ): Promise<ZcashTxResult> {
    // Deposit to facilitator with memo containing swap details
    const memo = `HTLC:${hashLock.substring(0, 32)}:${timeLock}`;
    
    const amountSatoshis = Math.floor(parseFloat(amountZec) * 100000000);
    
    return this.sendTransaction(
      fromAddress,
      this.facilitatorAddress,
      amountSatoshis,
      privateKeyHex,
      memo,
    );
  }

  /**
   * Complete an HTLC by revealing the secret
   * The facilitator verifies the secret and releases funds
   */
  async completeHTLC(
    recipientAddress: string,
    amountZec: string,
    secret: string,
    hashLock: string,
  ): Promise<ZcashTxResult> {
    // Verify the secret matches the hash lock (SHA256)
    const computedHash = crypto.createHash('sha256')
      .update(Buffer.from(secret, 'hex'))
      .digest('hex');
    
    if (computedHash !== hashLock) {
      return {
        txid: '',
        success: false,
        error: `Invalid secret - hash does not match. Expected: ${hashLock}, Got: ${computedHash}`,
      };
    }

    this.logger.log(`✅ Secret verified for HTLC completion`);

    // Send from facilitator to recipient
    const memo = `HTLC_COMPLETE:${secret.substring(0, 16)}`;
    
    return this.sendFromFacilitator(recipientAddress, amountZec, memo);
  }

  /**
   * Refund an expired HTLC
   */
  async refundHTLC(
    originalSender: string,
    amountZec: string,
    hashLock: string,
    timeLock: number,
  ): Promise<ZcashTxResult> {
    // Verify time lock has expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime <= timeLock) {
      return {
        txid: '',
        success: false,
        error: `Time lock not expired. Current: ${currentTime}, Lock: ${timeLock}`,
      };
    }

    this.logger.log(`Time lock expired, processing refund`);

    // Refund to original sender
    const memo = `HTLC_REFUND:${hashLock.substring(0, 16)}`;
    
    return this.sendFromFacilitator(originalSender, amountZec, memo);
  }

  /**
   * Check if the Zcash RPC is available
   */
  async checkConnection(): Promise<boolean> {
    try {
      const lib = await this.getLib();
      // Try to get a simple RPC response
      await lib.getUTXOS(this.facilitatorAddress, this.config);
      return true;
    } catch (error) {
      this.logger.warn(`Zcash RPC not available: ${error.message}`);
      return false;
    }
  }
}

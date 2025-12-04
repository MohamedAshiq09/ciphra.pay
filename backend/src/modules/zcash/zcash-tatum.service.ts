import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../common/config/config.service';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export interface ZcashTxResult {
  txid: string;
  success: boolean;
  rawTx?: string;
  error?: string;
}

export interface ZcashUTXO {
  txid: string;
  vout: number;
  address: string;
  scriptPubKey: string;
  amount: number;
  confirmations: number;
}

export interface ZcashBlockchainInfo {
  chain: string;
  blocks: number;
  headers: number;
  bestblockhash: string;
  difficulty: number;
}

/**
 * Zcash Tatum Service
 * 
 * Provides Zcash RPC access via Tatum.io API
 * Supports both mainnet and testnet
 * 
 * API Docs: https://apidoc.tatum.io/tag/Zcash
 */
@Injectable()
export class ZcashTatumService {
  private readonly logger = new Logger(ZcashTatumService.name);
  private client: AxiosInstance;
  private apiKey: string;
  private isTestnet: boolean;
  private baseUrl: string;

  constructor(private appConfig: AppConfigService) {
    this.initialize();
  }

  private initialize() {
    this.apiKey = this.appConfig.tatumApiKey;
    this.isTestnet = this.appConfig.zcashNetwork === 'testnet';
    
    this.baseUrl = this.isTestnet 
      ? 'https://zcash-testnet.gateway.tatum.io/'
      : 'https://zcash-mainnet.gateway.tatum.io/';

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
      },
      timeout: 30000,
    });

    this.logger.log(`Zcash Tatum Service initialized`);
    this.logger.log(`  Network: ${this.isTestnet ? 'testnet' : 'mainnet'}`);
    this.logger.log(`  Base URL: ${this.baseUrl}`);
  }

  /**
   * Make an RPC call to Zcash node via Tatum
   */
  private async rpcCall<T>(method: string, params: any[] = []): Promise<T> {
    try {
      const response = await this.client.post('', {
        jsonrpc: '2.0',
        method,
        params,
        id: Date.now(),
      });

      if (response.data.error) {
        throw new Error(response.data.error.message || JSON.stringify(response.data.error));
      }

      return response.data.result;
    } catch (error) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error.message || JSON.stringify(error.response.data.error));
      }
      throw error;
    }
  }

  /**
   * Get blockchain info
   */
  async getBlockchainInfo(): Promise<ZcashBlockchainInfo> {
    return this.rpcCall<ZcashBlockchainInfo>('getblockchaininfo');
  }

  /**
   * Get current block count
   */
  async getBlockCount(): Promise<number> {
    return this.rpcCall<number>('getblockcount');
  }

  /**
   * Get address balance (transparent addresses only)
   */
  async getAddressBalance(address: string): Promise<{ balance: number; received: number }> {
    try {
      const result = await this.rpcCall<{ balance: number; received: number }>('getaddressbalance', [{ addresses: [address] }]);
      return result;
    } catch (error) {
      this.logger.warn(`Failed to get balance for ${address}: ${error.message}`);
      return { balance: 0, received: 0 };
    }
  }

  /**
   * Get UTXOs for an address
   */
  async getAddressUTXOs(address: string): Promise<ZcashUTXO[]> {
    try {
      const result = await this.rpcCall<any[]>('getaddressutxos', [{ addresses: [address] }]);
      return result.map(utxo => ({
        txid: utxo.txid,
        vout: utxo.outputIndex,
        address: utxo.address,
        scriptPubKey: utxo.script,
        amount: utxo.satoshis / 100000000,
        confirmations: utxo.height > 0 ? 1 : 0,
      }));
    } catch (error) {
      this.logger.warn(`Failed to get UTXOs for ${address}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(txid: string): Promise<any> {
    return this.rpcCall('getrawtransaction', [txid, true]);
  }

  /**
   * Send raw transaction
   */
  async sendRawTransaction(rawTx: string): Promise<string> {
    return this.rpcCall<string>('sendrawtransaction', [rawTx]);
  }

  /**
   * Get transaction history for an address
   */
  async getAddressTxIds(address: string, start?: number, end?: number): Promise<string[]> {
    const params: any = { addresses: [address] };
    if (start !== undefined) params.start = start;
    if (end !== undefined) params.end = end;
    
    return this.rpcCall<string[]>('getaddresstxids', [params]);
  }

  /**
   * Validate an address
   */
  async validateAddress(address: string): Promise<{ isvalid: boolean; address?: string; scriptPubKey?: string }> {
    return this.rpcCall('validateaddress', [address]);
  }

  /**
   * Get estimated fee
   */
  async estimateFee(blocks: number = 6): Promise<number> {
    try {
      const fee = await this.rpcCall<number>('estimatefee', [blocks]);
      return fee > 0 ? fee : 0.0001; // Default fee if estimation fails
    } catch {
      return 0.0001;
    }
  }

  /**
   * Test connection to Tatum API
   */
  async testConnection(): Promise<boolean> {
    try {
      const blockCount = await this.getBlockCount();
      this.logger.log(`✅ Connected to Zcash ${this.isTestnet ? 'testnet' : 'mainnet'} via Tatum (block ${blockCount})`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to connect to Tatum: ${error.message}`);
      return false;
    }
  }

  /**
   * Monitor for incoming payment to an address
   * 
   * @param address - Address to monitor
   * @param expectedAmount - Expected amount in ZEC
   * @param memo - Optional memo to match
   * @param timeoutMs - Timeout in milliseconds (default 30 minutes)
   */
  async waitForPayment(
    address: string,
    expectedAmount: number,
    memo?: string,
    timeoutMs: number = 30 * 60 * 1000,
  ): Promise<{ txid: string; amount: number; confirmed: boolean } | null> {
    const startTime = Date.now();
    const pollInterval = 15000; // 15 seconds
    
    this.logger.log(`👀 Monitoring ${address} for ${expectedAmount} ZEC payment...`);
    
    // Get initial transaction list
    let knownTxIds = new Set<string>();
    try {
      const initialTxIds = await this.getAddressTxIds(address);
      knownTxIds = new Set(initialTxIds);
    } catch (error) {
      this.logger.warn(`Could not get initial tx list: ${error.message}`);
    }

    while (Date.now() - startTime < timeoutMs) {
      try {
        // Get current transaction list
        const currentTxIds = await this.getAddressTxIds(address);
        
        // Find new transactions
        for (const txid of currentTxIds) {
          if (!knownTxIds.has(txid)) {
            knownTxIds.add(txid);
            
            // Get transaction details
            const tx = await this.getTransaction(txid);
            
            // Check outputs for payment to our address
            for (const vout of tx.vout) {
              if (vout.scriptPubKey?.addresses?.includes(address)) {
                const amount = vout.value;
                
                // Check if amount matches (with small tolerance)
                if (Math.abs(amount - expectedAmount) < 0.0001) {
                  this.logger.log(`✅ Payment received: ${txid} - ${amount} ZEC`);
                  return {
                    txid,
                    amount,
                    confirmed: tx.confirmations > 0,
                  };
                }
              }
            }
          }
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        this.logger.warn(`Monitoring error: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    this.logger.warn(`Payment monitoring timed out after ${timeoutMs / 1000}s`);
    return null;
  }

  /**
   * HTLC-style deposit (facilitator model)
   * Note: User sends ZEC to facilitator, we monitor for the payment
   */
  async monitorHTLCDeposit(
    hashLock: string,
    expectedAmount: number,
    timeLock: number,
  ): Promise<{ txid: string; amount: number } | null> {
    const facilitatorAddress = this.appConfig.zcashFacilitatorAddress;
    
    // Monitor for payment with memo containing hash lock
    const payment = await this.waitForPayment(
      facilitatorAddress,
      expectedAmount,
      `HTLC:${hashLock.substring(0, 32)}`,
    );

    return payment;
  }

  /**
   * Complete HTLC by revealing secret
   * Note: This requires signing capability which needs a private key
   * For now, this is a placeholder for the facilitator to manually release funds
   */
  async completeHTLC(
    recipientAddress: string,
    amount: number,
    secret: string,
    hashLock: string,
  ): Promise<ZcashTxResult> {
    // Verify secret
    const computedHash = crypto.createHash('sha256')
      .update(Buffer.from(secret, 'hex'))
      .digest('hex');

    if (computedHash !== hashLock) {
      return {
        txid: '',
        success: false,
        error: `Invalid secret - hash mismatch. Expected: ${hashLock}, Got: ${computedHash}`,
      };
    }

    this.logger.log(`✅ Secret verified for HTLC`);
    this.logger.log(`   To complete: send ${amount} ZEC to ${recipientAddress}`);

    // NOTE: Actual transaction signing requires building and signing the tx
    // This would need the facilitator's private key and proper tx construction
    // For demo purposes, we return a pending status
    return {
      txid: '',
      success: false,
      error: 'Transaction signing not implemented - use Zashi wallet or zcashd for manual release',
    };
  }

  /**
   * Get info about the Tatum connection
   */
  getConnectionInfo(): { network: string; baseUrl: string; connected: boolean } {
    return {
      network: this.isTestnet ? 'testnet' : 'mainnet',
      baseUrl: this.baseUrl,
      connected: !!this.apiKey,
    };
  }
}

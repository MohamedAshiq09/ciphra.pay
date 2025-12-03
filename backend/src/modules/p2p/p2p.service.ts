import { Injectable, Logger } from '@nestjs/common';
import { ZcashService } from '../zcash/zcash.service';
import { 
  CreateP2PTransferDto, 
  CreateZcashP2PDto,
  GetP2PHistoryDto 
} from './dto/p2p.dto';

export interface P2PTransfer {
  transferId: string;
  chain: string;
  type: 'custodial' | 'non_custodial';
  sender: string;
  recipient: string;
  amount: string;
  memo?: string;
  status: 'pending' | 'escrowed' | 'completed' | 'cancelled' | 'failed';
  paymentInstructions?: {
    address: string;
    qrCode: string;
    deepLink?: string;
    instructions: string[];
  };
  txid?: string;
  createdAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
}

export interface P2PStats {
  total: number;
  completed: number;
  pending: number;
  volume: Record<string, string>; // chain -> total volume
  successRate: string;
}

/**
 * P2P Transfer Service
 * 
 * Handles peer-to-peer transfers across multiple chains:
 * - Zcash: Custodial via facilitator wallet + Zashi integration
 * - NEAR: Direct and shielded transfers
 * - Starknet: Direct and shielded transfers  
 * - Mina: zkApp-based transfers
 * 
 * Supports both custodial (escrowed) and non-custodial (coordinated) flows
 */
@Injectable()
export class P2PService {
  private readonly logger = new Logger(P2PService.name);
  private transfers: Map<string, P2PTransfer> = new Map();

  constructor(
    private zcashService: ZcashService,
  ) {}

  /**
   * Create P2P transfer on specified chain
   */
  async createTransfer(dto: CreateP2PTransferDto): Promise<P2PTransfer> {
    try {
      switch (dto.chain) {
        case 'zcash':
          return await this.createZcashP2P({
            sender: dto.sender,
            recipient: dto.recipient,
            amount: dto.amount,
            memo: dto.memo,
            type: dto.type || 'custodial',
          });
        case 'near':
          return await this.createNearP2P(dto);
        case 'starknet':
          return await this.createStarknetP2P(dto);
        case 'mina':
          return await this.createMinaP2P(dto);
        default:
          throw new Error(`Unsupported chain: ${dto.chain}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create P2P transfer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create Zcash P2P transfer with Zashi integration
   */
  async createZcashP2P(dto: CreateZcashP2PDto): Promise<P2PTransfer> {
    try {
      const transferId = this.generateTransferId();
      const memo = dto.memo || `P2P-${transferId}`;

      this.logger.log(`Creating Zcash P2P transfer: ${transferId}`);
      this.logger.log(`  From: ${dto.sender}`);
      this.logger.log(`  To: ${dto.recipient}`);
      this.logger.log(`  Amount: ${dto.amount} ZEC`);
      this.logger.log(`  Type: ${dto.type}`);

      if (dto.type === 'custodial') {
        // Custodial flow: Sender pays to facilitator, we hold funds, recipient withdraws
        const paymentInstructions = await this.zcashService.getPaymentInstructions(
          dto.sender,
          dto.amount,
          memo,
        );

        const transfer: P2PTransfer = {
          transferId,
          chain: 'zcash',
          type: 'custodial',
          sender: dto.sender,
          recipient: dto.recipient,
          amount: dto.amount,
          memo,
          status: 'pending',
          paymentInstructions: {
            address: paymentInstructions.address,
            qrCode: paymentInstructions.qrPayload,
            deepLink: `zashi://pay?address=${paymentInstructions.address}&amount=${dto.amount}&memo=${encodeURIComponent(memo)}`,
            instructions: [
              'Open Zashi wallet on your mobile device',
              'Scan the QR code or tap the Zashi link',
              'Verify the payment details and memo',
              'Confirm the transaction in Zashi',
              'Funds will be held in escrow until recipient claims',
            ],
          },
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        };

        this.transfers.set(transferId, transfer);

        // Start watching for payment
        this.watchZcashPayment(transfer);

        return transfer;
      } else {
        // Non-custodial flow: Direct coordination, funds go directly sender -> recipient
        const recipientAddress = await this.getRecipientZcashAddress(dto.recipient);
        
        const transfer: P2PTransfer = {
          transferId,
          chain: 'zcash',
          type: 'non_custodial',
          sender: dto.sender,
          recipient: dto.recipient,
          amount: dto.amount,
          memo,
          status: 'pending',
          paymentInstructions: {
            address: recipientAddress,
            qrCode: `zcash:${recipientAddress}?amount=${dto.amount}&memo=${encodeURIComponent(memo)}`,
            deepLink: `zashi://pay?address=${recipientAddress}&amount=${dto.amount}&memo=${encodeURIComponent(memo)}`,
            instructions: [
              'Open Zashi wallet on your mobile device',
              'Scan the QR code or tap the Zashi link',
              'Verify the recipient address and amount',
              'Confirm the transaction in Zashi',
              'Funds will be sent directly to recipient',
            ],
          },
          createdAt: new Date(),
        };

        this.transfers.set(transferId, transfer);
        return transfer;
      }
    } catch (error) {
      this.logger.error(`Failed to create Zcash P2P: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create NEAR P2P transfer
   */
  private async createNearP2P(dto: CreateP2PTransferDto): Promise<P2PTransfer> {
    // TODO: Implement NEAR P2P transfer
    const transferId = this.generateTransferId();
    
    const transfer: P2PTransfer = {
      transferId,
      chain: 'near',
      type: dto.type || 'non_custodial',
      sender: dto.sender,
      recipient: dto.recipient,
      amount: dto.amount,
      memo: dto.memo,
      status: 'pending',
      createdAt: new Date(),
    };

    this.transfers.set(transferId, transfer);
    return transfer;
  }

  /**
   * Create Starknet P2P transfer
   */
  private async createStarknetP2P(dto: CreateP2PTransferDto): Promise<P2PTransfer> {
    // TODO: Implement Starknet P2P transfer
    const transferId = this.generateTransferId();
    
    const transfer: P2PTransfer = {
      transferId,
      chain: 'starknet',
      type: dto.type || 'non_custodial',
      sender: dto.sender,
      recipient: dto.recipient,
      amount: dto.amount,
      memo: dto.memo,
      status: 'pending',
      createdAt: new Date(),
    };

    this.transfers.set(transferId, transfer);
    return transfer;
  }

  /**
   * Create Mina P2P transfer
   */
  private async createMinaP2P(dto: CreateP2PTransferDto): Promise<P2PTransfer> {
    // TODO: Implement Mina P2P transfer
    const transferId = this.generateTransferId();
    
    const transfer: P2PTransfer = {
      transferId,
      chain: 'mina',
      type: dto.type || 'non_custodial',
      sender: dto.sender,
      recipient: dto.recipient,
      amount: dto.amount,
      memo: dto.memo,
      status: 'pending',
      createdAt: new Date(),
    };

    this.transfers.set(transferId, transfer);
    return transfer;
  }

  /**
   * Watch for Zcash payment confirmation
   */
  private async watchZcashPayment(transfer: P2PTransfer): Promise<void> {
    try {
      if (!transfer.paymentInstructions) return;

      const proof = await this.zcashService.watchIncomingPayment(
        transfer.paymentInstructions.address,
        transfer.amount,
        transfer.memo,
      );

      // Payment confirmed, update status
      transfer.status = 'escrowed';
      transfer.txid = proof.txid;
      
      this.logger.log(`✅ Zcash P2P payment confirmed: ${transfer.transferId}`);
      this.logger.log(`   TX: ${proof.txid}`);
      
      // TODO: Emit event when EventEmitter2 is available
      this.logger.log(`P2P payment confirmed: ${transfer.transferId}`);

      // For custodial transfers, notify recipient
      if (transfer.type === 'custodial') {
        this.logger.log(`💰 Funds escrowed for recipient: ${transfer.recipient}`);
        // TODO: Send notification to recipient
      }

    } catch (error) {
      transfer.status = 'failed';
      this.logger.error(`Zcash P2P payment failed: ${error.message}`);
    }
  }

  /**
   * Complete P2P transfer (for custodial flows)
   */
  async completeTransfer(
    transferId: string,
    options: { signature?: string; proof?: string },
  ): Promise<{ txid: string; message: string }> {
    try {
      const transfer = this.transfers.get(transferId);
      if (!transfer) {
        throw new Error('Transfer not found');
      }

      if (transfer.status !== 'escrowed') {
        throw new Error('Transfer not ready for completion');
      }

      this.logger.log(`Completing P2P transfer: ${transferId}`);

      if (transfer.chain === 'zcash') {
        // Get recipient's Zcash address
        const recipientAddress = await this.getRecipientZcashAddress(transfer.recipient);
        
        // Send from facilitator wallet
        const txid = await this.zcashService.sendFromFacilitator(
          recipientAddress,
          transfer.amount,
          `P2P-${transferId}`,
        );

        transfer.status = 'completed';
        transfer.txid = txid;
        transfer.completedAt = new Date();

        this.logger.log(`✅ P2P transfer completed: ${transferId} -> ${txid}`);

        return {
          txid,
          message: 'Transfer completed successfully',
        };
      }

      throw new Error(`Completion not implemented for chain: ${transfer.chain}`);
    } catch (error) {
      this.logger.error(`Failed to complete transfer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel P2P transfer
   */
  async cancelTransfer(transferId: string): Promise<{ message: string }> {
    try {
      const transfer = this.transfers.get(transferId);
      if (!transfer) {
        throw new Error('Transfer not found');
      }

      if (transfer.status === 'completed') {
        throw new Error('Cannot cancel completed transfer');
      }

      transfer.status = 'cancelled';
      
      this.logger.log(`P2P transfer cancelled: ${transferId}`);

      return {
        message: 'Transfer cancelled successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to cancel transfer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get P2P transfer by ID
   */
  async getTransfer(transferId: string): Promise<P2PTransfer> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      throw new Error('Transfer not found');
    }
    return transfer;
  }

  /**
   * Get user's P2P transfer history
   */
  async getUserHistory(userId: string, query: GetP2PHistoryDto): Promise<{
    transfers: P2PTransfer[];
    pagination: { page: number; limit: number; total: number };
  }> {
    try {
      const allTransfers = Array.from(this.transfers.values());
      
      // Filter by user (sender or recipient)
      let userTransfers = allTransfers.filter(
        t => t.sender === userId || t.recipient === userId,
      );

      // Filter by chain if specified
      if (query.chain) {
        userTransfers = userTransfers.filter(t => t.chain === query.chain);
      }

      // Filter by status if specified
      if (query.status) {
        userTransfers = userTransfers.filter(t => t.status === query.status);
      }

      // Sort by creation date (newest first)
      userTransfers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Pagination
      const page = query.page || 1;
      const limit = query.limit || 20;
      const offset = (page - 1) * limit;
      const paginatedTransfers = userTransfers.slice(offset, offset + limit);

      return {
        transfers: paginatedTransfers,
        pagination: {
          page,
          limit,
          total: userTransfers.length,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get user history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get P2P statistics
   */
  async getStats(): Promise<P2PStats> {
    try {
      const allTransfers = Array.from(this.transfers.values());
      
      const total = allTransfers.length;
      const completed = allTransfers.filter(t => t.status === 'completed').length;
      const pending = allTransfers.filter(t => t.status === 'pending' || t.status === 'escrowed').length;
      
      // Calculate volume by chain
      const volume: Record<string, string> = {};
      for (const transfer of allTransfers) {
        if (transfer.status === 'completed') {
          volume[transfer.chain] = (
            parseFloat(volume[transfer.chain] || '0') + parseFloat(transfer.amount)
          ).toString();
        }
      }

      const successRate = total > 0 ? ((completed / total) * 100).toFixed(2) : '0';

      return {
        total,
        completed,
        pending,
        volume,
        successRate: `${successRate}%`,
      };
    } catch (error) {
      this.logger.error(`Failed to get stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get supported P2P features by chain
   */
  async getSupportedFeatures() {
    return {
      zcash: {
        custodial: true,
        nonCustodial: true,
        shielded: true,
        memos: true,
        walletIntegration: 'zashi',
      },
      near: {
        custodial: true,
        nonCustodial: true,
        shielded: true,
        memos: false,
        walletIntegration: 'web',
      },
      starknet: {
        custodial: true,
        nonCustodial: true,
        shielded: true,
        memos: false,
        walletIntegration: 'browser_extension',
      },
      mina: {
        custodial: false,
        nonCustodial: true,
        shielded: true,
        memos: false,
        walletIntegration: 'browser_extension',
      },
    };
  }

  /**
   * Get recipient's Zcash address (placeholder implementation)
   */
  private async getRecipientZcashAddress(recipientId: string): Promise<string> {
    // TODO: Implement proper recipient address lookup
    // This could be from user profile, address book, or generated
    return 'ztestsapling1...'; // Placeholder shielded address
  }

  /**
   * Generate unique transfer ID
   */
  private generateTransferId(): string {
    return `p2p_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}
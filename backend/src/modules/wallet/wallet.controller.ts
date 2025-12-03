import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { WalletService } from './wallet.service.js';
import { 
  CreateWalletDto, 
  GetWalletBalanceDto,
  GetWalletHistoryDto 
} from './dto/wallet.dto.js';

/**
 * Wallet Controller
 * 
 * Multi-chain wallet operations:
 * - Zcash (via Zashi integration)
 * - NEAR
 * - Starknet  
 * - Mina
 * 
 * Provides unified interface for all supported chains
 */
@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  /**
   * Get wallet addresses for all supported chains
   */
  @Get(':userId/addresses')
  async getWalletAddresses(@Param('userId') userId: string) {
    try {
      const addresses = await this.walletService.getAllAddresses(userId);
      
      return {
        success: true,
        data: addresses,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get Zcash wallet info with Zashi integration
   */
  @Get(':userId/zcash')
  async getZcashWallet(@Param('userId') userId: string) {
    try {
      const walletInfo = await this.walletService.getZcashWallet(userId);
      
      return {
        success: true,
        data: walletInfo,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get NEAR wallet info
   */
  @Get(':userId/near')
  async getNearWallet(@Param('userId') userId: string) {
    try {
      const walletInfo = await this.walletService.getNearWallet(userId);
      
      return {
        success: true,
        data: walletInfo,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get Starknet wallet info
   */
  @Get(':userId/starknet')
  async getStarknetWallet(@Param('userId') userId: string) {
    try {
      const walletInfo = await this.walletService.getStarknetWallet(userId);
      
      return {
        success: true,
        data: walletInfo,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get Mina wallet info
   */
  @Get(':userId/mina')
  async getMinaWallet(@Param('userId') userId: string) {
    try {
      const walletInfo = await this.walletService.getMinaWallet(userId);
      
      return {
        success: true,
        data: walletInfo,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get aggregated balance across all chains
   */
  @Get(':userId/balance')
  async getAggregatedBalance(@Param('userId') userId: string) {
    try {
      const balances = await this.walletService.getAggregatedBalance(userId);
      
      return {
        success: true,
        data: balances,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get transaction history across all chains
   */
  @Get(':userId/history')
  async getTransactionHistory(
    @Param('userId') userId: string,
    @Query() query: GetWalletHistoryDto,
  ) {
    try {
      const history = await this.walletService.getTransactionHistory(userId, query);
      
      return {
        success: true,
        data: history,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create payment request for any supported chain
   */
  @Post(':userId/payment-request')
  async createPaymentRequest(
    @Param('userId') userId: string,
    @Body() body: {
      chain: 'zcash' | 'near' | 'starknet' | 'mina';
      amount: string;
      memo?: string;
    },
  ) {
    try {
      const paymentRequest = await this.walletService.createPaymentRequest(
        userId,
        body.chain,
        body.amount,
        body.memo,
      );
      
      return {
        success: true,
        data: paymentRequest,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get supported chains and their features
   */
  @Get('supported-chains')
  async getSupportedChains() {
    try {
      const chains = await this.walletService.getSupportedChains();
      
      return {
        success: true,
        data: chains,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
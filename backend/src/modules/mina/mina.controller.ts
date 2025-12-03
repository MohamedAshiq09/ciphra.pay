import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { MinaService } from './mina.service';

/**
 * Mina Controller
 * 
 * REST API endpoints for Mina zkApp operations:
 * - Atomic Swaps with zk-SNARK proofs
 * - Cross-chain proof verification
 * - Account and zkApp state queries
 */
@Controller('mina')
export class MinaController {
  constructor(private minaService: MinaService) {}

  // ============================================================================
  // SWAP ENDPOINTS
  // ============================================================================

  @Post('swap/initiate')
  async initiateSwap(@Body() body: {
    swapId: string;
    recipient: string;
    amount: string;
    hashLock: string;
    timeLockDuration: number;
    targetChain: string;
    targetSwapId: string;
  }) {
    try {
      const txHash = await this.minaService.initiateSwap(body);
      
      return {
        success: true,
        data: {
          txHash,
          swapId: body.swapId,
          message: 'Mina atomic swap initiated successfully',
          note: 'zk-SNARK proof generation may take 1-2 minutes',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('swap/:swapId/complete')
  async completeSwap(
    @Param('swapId') swapId: string,
    @Body() body: { 
      secret: string;
      crossChainProof?: any;
    },
  ) {
    try {
      const txHash = await this.minaService.completeSwap({
        swapId,
        secret: body.secret,
        crossChainProof: body.crossChainProof,
      });
      
      return {
        success: true,
        data: {
          txHash,
          swapId,
          message: 'Mina atomic swap completed successfully',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('swap/:swapId/refund')
  async refundSwap(@Param('swapId') swapId: string) {
    try {
      const txHash = await this.minaService.refundSwap(swapId);
      
      return {
        success: true,
        data: {
          txHash,
          swapId,
          message: 'Mina atomic swap refunded successfully',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('swap/:swapId')
  async getSwapDetails(@Param('swapId') swapId: string) {
    try {
      const swapDetails = await this.minaService.getSwapDetails(swapId);
      
      return {
        success: true,
        data: swapDetails,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ============================================================================
  // CROSS-CHAIN PROOF ENDPOINTS
  // ============================================================================

  @Post('proof/submit')
  async submitCrossChainProof(@Body() body: {
    chainId: string;
    txHash: string;
    blockNumber: number;
    proofData: string;
  }) {
    try {
      const txHash = await this.minaService.submitCrossChainProof(body);
      
      return {
        success: true,
        data: {
          txHash,
          message: 'Cross-chain proof submitted successfully',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ============================================================================
  // ACCOUNT ENDPOINTS
  // ============================================================================

  @Get('account/:address')
  async getAccountInfo(@Param('address') address: string) {
    try {
      const accountInfo = await this.minaService.getAccountInfo(address);
      
      return {
        success: true,
        data: accountInfo,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('zkapp/:address')
  async getZkAppAccount(@Param('address') address: string) {
    try {
      const zkAppInfo = await this.minaService.getZkAppAccount(address);
      
      return {
        success: true,
        data: zkAppInfo,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ============================================================================
  // UTILITY ENDPOINTS
  // ============================================================================

  @Get('network-info')
  async getNetworkInfo() {
    return {
      success: true,
      data: {
        network: 'devnet',
        rpcUrl: 'https://api.minascan.io/node/devnet/v1/graphql',
        contracts: {
          atomicSwap: 'B62qo6UoWj3YEH4xKny25gwxAeYmad9pgvYxo4NtgBBJuhFVzpUPuqx',
        },
        features: {
          zkSnarks: true,
          constantSizeBlockchain: true,
          atomicSwaps: true,
          crossChainProofs: true,
          privacyPreserving: true,
        },
        wallets: ['Auro Wallet'],
        explorer: 'https://minascan.io/devnet',
      },
    };
  }
}
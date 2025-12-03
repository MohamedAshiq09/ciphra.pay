import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { NearService } from './near.service';

/**
 * NEAR Controller
 * 
 * REST API endpoints for NEAR contract operations:
 * - Atomic Swaps
 * - P2P Transfers (Direct & Shielded)
 * - Escrow Services
 */
@Controller('near')
export class NearController {
  constructor(private nearService: NearService) {}

  // ============================================================================
  // SWAP ENDPOINTS
  // ============================================================================

  @Post('swap/initiate')
  async initiateSwap(@Body() body: {
    swapId: string;
    participant: string;
    hashLock: string;
    timeLockDuration: number;
    targetChain: string;
    targetAddress: string;
    amount: string;
  }) {
    try {
      const txHash = await this.nearService.initiateSwap(body);
      
      return {
        success: true,
        data: {
          txHash,
          swapId: body.swapId,
          message: 'NEAR atomic swap initiated successfully',
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
    @Body() body: { secret: string },
  ) {
    try {
      const txHash = await this.nearService.completeSwap(swapId, body.secret);
      
      return {
        success: true,
        data: {
          txHash,
          swapId,
          message: 'NEAR atomic swap completed successfully',
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
      const swapDetails = await this.nearService.getSwapDetails(swapId);
      
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
  // P2P TRANSFER ENDPOINTS
  // ============================================================================

  @Post('p2p/direct')
  async sendDirectP2P(@Body() body: {
    transferId: string;
    recipient: string;
    memo: string;
    amount: string;
  }) {
    try {
      const txHash = await this.nearService.sendDirectP2P(body);
      
      return {
        success: true,
        data: {
          txHash,
          transferId: body.transferId,
          message: 'NEAR P2P transfer sent successfully',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('p2p/shielded/deposit')
  async shieldedDeposit(@Body() body: {
    noteId: string;
    commitment: string;
    amount: string;
  }) {
    try {
      const txHash = await this.nearService.shieldedDeposit(body);
      
      return {
        success: true,
        data: {
          txHash,
          noteId: body.noteId,
          message: 'NEAR shielded deposit created successfully',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('p2p/:transferId')
  async getP2PTransfer(@Param('transferId') transferId: string) {
    try {
      const transfer = await this.nearService.getP2PTransfer(transferId);
      
      return {
        success: true,
        data: transfer,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ============================================================================
  // ESCROW ENDPOINTS
  // ============================================================================

  @Post('escrow/create')
  async createEscrow(@Body() body: {
    escrowId: string;
    beneficiary: string;
    releaseTime: number;
    metadata: string;
    amount: string;
  }) {
    try {
      const txHash = await this.nearService.createEscrow(body);
      
      return {
        success: true,
        data: {
          txHash,
          escrowId: body.escrowId,
          message: 'NEAR escrow created successfully',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('escrow/:escrowId/release')
  async releaseEscrow(@Param('escrowId') escrowId: string) {
    try {
      const txHash = await this.nearService.releaseEscrow(escrowId);
      
      return {
        success: true,
        data: {
          txHash,
          escrowId,
          message: 'NEAR escrow released successfully',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('escrow/:escrowId')
  async getEscrowDetails(@Param('escrowId') escrowId: string) {
    try {
      const escrow = await this.nearService.getEscrowDetails(escrowId);
      
      return {
        success: true,
        data: escrow,
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
        network: 'testnet',
        rpcUrl: 'https://rpc.testnet.near.org',
        contracts: {
          swap: 'dev-swap.testnet',
          p2p: 'dev-p2p.testnet',
          escrow: 'dev-escrow.testnet',
        },
        features: {
          atomicSwaps: true,
          p2pTransfers: true,
          shieldedTransfers: true,
          escrowServices: true,
          crossChainBridge: true,
        },
      },
    };
  }
}
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { P2PService } from './p2p.service.js';
import { 
  CreateP2PTransferDto, 
  GetP2PTransferDto,
  CreateZcashP2PDto,
  GetP2PHistoryDto 
} from './dto/p2p.dto.js';

/**
 * P2P Transfer Controller
 * 
 * Handles peer-to-peer transfers across all supported chains:
 * - Zcash (via Zashi integration)
 * - NEAR (direct and shielded)
 * - Starknet (direct and shielded)
 * - Mina (zkApp-based)
 * 
 * Supports both custodial and non-custodial flows
 */
@Controller('p2p')
export class P2PController {
  constructor(private p2pService: P2PService) {}

  /**
   * Create P2P transfer on any supported chain
   */
  @Post('create')
  async createP2PTransfer(@Body() dto: CreateP2PTransferDto) {
    try {
      const transfer = await this.p2pService.createTransfer(dto);
      
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

  /**
   * Create Zcash P2P transfer with Zashi integration
   */
  @Post('zcash/create')
  async createZcashP2P(@Body() dto: CreateZcashP2PDto) {
    try {
      const transfer = await this.p2pService.createZcashP2P(dto);
      
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

  /**
   * Get P2P transfer status
   */
  @Get(':transferId')
  async getP2PTransfer(@Param('transferId') transferId: string) {
    try {
      const transfer = await this.p2pService.getTransfer(transferId);
      
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

  /**
   * Get P2P transfer history for user
   */
  @Get('user/:userId/history')
  async getP2PHistory(
    @Param('userId') userId: string,
    @Query() query: GetP2PHistoryDto,
  ) {
    try {
      const history = await this.p2pService.getUserHistory(userId, query);
      
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
   * Complete P2P transfer (for custodial flows)
   */
  @Post(':transferId/complete')
  async completeP2PTransfer(
    @Param('transferId') transferId: string,
    @Body() body: { signature?: string; proof?: string },
  ) {
    try {
      const result = await this.p2pService.completeTransfer(transferId, body);
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Cancel P2P transfer
   */
  @Post(':transferId/cancel')
  async cancelP2PTransfer(@Param('transferId') transferId: string) {
    try {
      const result = await this.p2pService.cancelTransfer(transferId);
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get P2P statistics
   */
  @Get('stats/overview')
  async getP2PStats() {
    try {
      const stats = await this.p2pService.getStats();
      
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get supported P2P features by chain
   */
  @Get('features/supported')
  async getSupportedFeatures() {
    try {
      const features = await this.p2pService.getSupportedFeatures();
      
      return {
        success: true,
        data: features,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { SwapCoordinatorService } from './swap-coordinator.service';
import { SwapService } from './swap.service.js';
import { AztecService } from '../aztec/aztec.service';
import { 
  CreateSwapDto, 
  CreateZcashSwapDto,
  GetSwapHistoryDto 
} from './dto/swap.dto.js';

@Controller('swap')
export class SwapController {
  constructor(
    private swapCoordinator: SwapCoordinatorService,
    private swapService: SwapService,
    private aztecService: AztecService,
  ) {}

  /**
   * Get swap mapping by ID
   */
  @Get(':swapId')
  async getSwap(@Param('swapId') swapId: string) {
    const mapping = this.swapCoordinator.getSwapMapping(swapId);
    
    if (!mapping) {
      return {
        success: false,
        message: 'Swap not found',
      };
    }

    return {
      success: true,
      data: mapping,
    };
  }

  /**
   * Get all swaps
   */
  @Get()
  async getAllSwaps() {
    const swaps = this.swapCoordinator.getAllSwapMappings();
    const stats = this.swapCoordinator.getStats();

    return {
      success: true,
      data: {
        swaps,
        stats,
      },
    };
  }

  /**
   * Create atomic swap between any supported chains
   */
  @Post('create')
  async createSwap(@Body() dto: CreateSwapDto) {
    try {
      const swap = await this.swapService.createSwap(dto);
      
      return {
        success: true,
        data: swap,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create Zcash atomic swap with Zashi integration
   */
  @Post('zcash/create')
  async createZcashSwap(@Body() dto: CreateZcashSwapDto) {
    try {
      const swap = await this.swapService.createZcashSwap(dto);
      
      return {
        success: true,
        data: swap,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Complete swap with secret
   */
  @Post(':swapId/complete')
  async completeSwap(
    @Param('swapId') swapId: string,
    @Body() body: { secret: string; chain?: string },
  ) {
    try {
      const result = await this.swapService.completeSwap(swapId, body.secret, body.chain);
      
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
   * Refund expired swap
   */
  @Post(':swapId/refund')
  async refundSwap(@Param('swapId') swapId: string) {
    try {
      const result = await this.swapService.refundSwap(swapId);
      
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
   * Get swap history for user
   */
  @Get('user/:userId/history')
  async getSwapHistory(
    @Param('userId') userId: string,
    @Query() query: GetSwapHistoryDto,
  ) {
    try {
      const history = await this.swapService.getUserSwapHistory(userId, query);
      
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
   * Get supported swap pairs
   */
  @Get('pairs/supported')
  async getSupportedPairs() {
    try {
      const pairs = await this.swapService.getSupportedSwapPairs();
      
      return {
        success: true,
        data: pairs,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get bridge statistics
   */
  @Get('bridge/stats')
  async getBridgeStats() {
    try {
      const [totalSwaps, completedSwaps, feePercentage] = await Promise.all([
        this.aztecService.getTotalSwaps(),
        this.aztecService.getCompletedSwaps(),
        this.aztecService.getFeePercentage(),
      ]);

      const coordinatorStats = this.swapCoordinator.getStats();
      const swapStats = await this.swapService.getSwapStats();

      return {
        success: true,
        data: {
          aztec: {
            totalSwaps: totalSwaps.toString(),
            completedSwaps: completedSwaps.toString(),
            feePercentage: feePercentage.toString(),
          },
          coordinator: coordinatorStats,
          multiChain: swapStats,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
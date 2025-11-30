import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { SwapCoordinatorService } from './swap-coordinator.service';
import { AztecService } from '../aztec/aztec.service';
import { StarknetService } from '../starknet/starknet.service';

@Controller('swap')
export class SwapController {
  constructor(
    private swapCoordinator: SwapCoordinatorService,
    private aztecService: AztecService,
    private starknetService: StarknetService,
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
   * Get bridge statistics
   */
  @Get('bridge/stats')
  async getBridgeStats() {
    const [totalSwaps, completedSwaps, feePercentage] = await Promise.all([
      this.aztecService.getTotalSwaps(),
      this.aztecService.getCompletedSwaps(),
      this.aztecService.getFeePercentage(),
    ]);

    const coordinatorStats = this.swapCoordinator.getStats();

    return {
      success: true,
      data: {
        aztec: {
          totalSwaps: totalSwaps.toString(),
          completedSwaps: completedSwaps.toString(),
          feePercentage: feePercentage.toString(),
        },
        coordinator: coordinatorStats,
      },
    };
  }
}

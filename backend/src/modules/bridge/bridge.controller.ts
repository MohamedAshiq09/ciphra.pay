import { Controller, Get } from '@nestjs/common';
import { AztecService } from '../aztec/aztec.service';
import { AztecMonitorService } from '../aztec/aztec-monitor.service';
import { StarknetService } from '../starknet/starknet.service';
import { StarknetListenerService } from '../starknet/starknet-listener.service';
import { SwapCoordinatorService } from '../swap/swap-coordinator.service';

@Controller('bridge')
export class BridgeController {
  constructor(
    private aztecService: AztecService,
    private aztecMonitor: AztecMonitorService,
    private starknetService: StarknetService,
    private starknetListener: StarknetListenerService,
    private swapCoordinator: SwapCoordinatorService,
  ) {}

  /**
   * Health check endpoint
   */
  @Get('health')
  async getHealth() {
    const aztecMonitorStatus = this.aztecMonitor.getStatus();
    const starknetListenerStatus = this.starknetListener.getStatus();

    return {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          aztec: {
            monitoring: aztecMonitorStatus.isMonitoring,
            lastProcessedSwap: aztecMonitorStatus.lastProcessedSwap,
          },
          starknet: {
            listening: starknetListenerStatus.isListening,
            lastProcessedBlock: starknetListenerStatus.lastProcessedBlock,
          },
        },
      },
    };
  }

  /**
   * Get bridge statistics
   */
  @Get('stats')
  async getStats() {
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
          successRate: totalSwaps > 0n 
            ? ((Number(completedSwaps) / Number(totalSwaps)) * 100).toFixed(2) + '%'
            : '0%',
          feePercentage: (Number(feePercentage) / 100).toFixed(2) + '%',
        },
        coordinator: {
          totalMappings: coordinatorStats.total,
          active: coordinatorStats.active,
          completed: coordinatorStats.completed,
          failed: coordinatorStats.failed,
        },
      },
    };
  }

  /**
   * Get bridge status
   */
  @Get('status')
  async getStatus() {
    const aztecMonitorStatus = this.aztecMonitor.getStatus();
    const starknetListenerStatus = this.starknetListener.getStatus();
    const coordinatorStats = this.swapCoordinator.getStats();

    return {
      success: true,
      data: {
        aztec: {
          connected: true,
          monitoring: aztecMonitorStatus.isMonitoring,
          lastProcessedSwap: aztecMonitorStatus.lastProcessedSwap,
          cachedSwaps: aztecMonitorStatus.cachedSwaps,
          pollingInterval: aztecMonitorStatus.intervalMs,
        },
        starknet: {
          connected: true,
          listening: starknetListenerStatus.isListening,
          lastProcessedBlock: starknetListenerStatus.lastProcessedBlock,
          pollingInterval: starknetListenerStatus.intervalMs,
        },
        coordinator: {
          active: true,
          stats: coordinatorStats,
        },
      },
    };
  }
}

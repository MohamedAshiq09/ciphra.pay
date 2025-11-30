import { Controller, Get, Post, UseGuards, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { X402Guard } from './modules/payment/x402.guard';

/**
 * App Controller
 * Main application controller with test endpoints
 */
@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  /**
   * GET /api
   * API information (public endpoint)
   */
  @Get()
  getInfo() {
    return this.appService.getInfo();
  }

  /**
   * GET /api/health
   * Health check (public endpoint)
   */
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  /**
   * POST /api/swap/initiate
   * Protected endpoint - requires X402 payment
   * Use this to test payment integration
   */
  @Post('swap/initiate')
  @UseGuards(X402Guard)
  initiateSwap() {
    this.logger.log('Swap initiated (payment verified)');
    return {
      success: true,
      message: 'Swap initiated successfully',
      note: 'This endpoint is protected by X402 payment',
    };
  }

  /**
   * POST /api/swap/coordinate
   * Protected endpoint - requires X402 payment
   */
  @Post('swap/coordinate')
  @UseGuards(X402Guard)
  coordinateSwap() {
    this.logger.log('Swap coordinated (payment verified)');
    return {
      success: true,
      message: 'Swap coordinated successfully',
      note: 'This endpoint is protected by X402 payment',
    };
  }

  /**
   * GET /api/bridge/stats
   * Protected endpoint - requires X402 payment
   */
  @Get('bridge/stats')
  @UseGuards(X402Guard)
  getBridgeStats() {
    this.logger.log('Bridge stats requested (payment verified)');
    return {
      totalSwaps: 0,
      completedSwaps: 0,
      pendingSwaps: 0,
      totalVolume: '0',
      note: 'This endpoint is protected by X402 payment',
    };
  }
}

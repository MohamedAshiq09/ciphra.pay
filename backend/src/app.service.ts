import { Injectable } from '@nestjs/common';

/**
 * App Service
 * Basic application service for general operations
 */
@Injectable()
export class AppService {
  getInfo(): any {
    return {
      name: 'Ciphra.Pay API',
      description: 'Cross-Chain Privacy Payment Infrastructure',
      version: '1.0.0',
      features: [
        'Aztec Network (Privacy Layer)',
        'Starknet (ZK-Rollup + X402 Payments)',
        'NEAR Protocol (Fast Layer)',
        'Hash Compatibility Oracle',
        'Atomic Swaps',
      ],
      endpoints: {
        health: 'GET /api/health',
        swap: {
          initiate: 'POST /api/swap/initiate (💳 Payment Required)',
          coordinate: 'POST /api/swap/coordinate (💳 Payment Required)',
        },
        bridge: {
          stats: 'GET /api/bridge/stats (💳 Payment Required)',
        },
      },
      x402: {
        enabled: process.env.X402_ENABLED === 'true',
        network: process.env.STARKNET_NETWORK || 'starknet-sepolia',
        paymentAmount: process.env.X402_PAYMENT_AMOUNT || '1000000',
      },
    };
  }

  getHealth(): any {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      x402Enabled: process.env.X402_ENABLED === 'true',
    };
  }
}

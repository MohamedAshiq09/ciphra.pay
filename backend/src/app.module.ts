import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Existing modules
import { AppConfigModule } from './common/config/config.module';
import { HashOracleModule } from './modules/hash-oracle/hash-oracle.module';
// import { AztecModule } from './modules/aztec/aztec.module'; // Temporarily disabled for X402 testing
import { StarknetModule } from './modules/starknet/starknet.module';
import { SwapModule } from './modules/swap/swap.module';
import { BridgeModule } from './modules/bridge/bridge.module';

// New multi-chain modules
import { ZcashModule } from './modules/zcash/zcash.module';
import { NearModule } from './modules/near/near.module';
import { MinaModule } from './modules/mina/mina.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { P2PModule } from './modules/p2p/p2p.module';

// X402 Payment Module
import { PaymentModule } from './modules/payment/payment.module';
import { X402Middleware } from './modules/payment/x402.middleware';

/**
 * Root Application Module
 * Ciphra.Pay Cross-Chain Privacy Payment Infrastructure
 */
@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Event system
    EventEmitterModule.forRoot(),

    // Core modules
    AppConfigModule,
    HashOracleModule,
    // AztecModule, // Temporarily disabled for X402 testing
    StarknetModule,
    SwapModule,
    BridgeModule,

    // Multi-chain modules
    ZcashModule,
    NearModule,
    MinaModule,
    WalletModule,
    P2PModule,

    // X402 Payment Module
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply X402 middleware to protect specific routes
    consumer
      .apply(X402Middleware)
      .exclude(
        // Public endpoints (free access)
        { path: '/', method: RequestMethod.ALL },
        { path: 'api', method: RequestMethod.GET },
        { path: 'api/health', method: RequestMethod.GET },
        { path: 'bridge/health', method: RequestMethod.GET },
      )
      .forRoutes(
        // Protected endpoints (require X402 payment)
        { path: 'api/swap/initiate', method: RequestMethod.POST },
        { path: 'api/swap/coordinate', method: RequestMethod.POST },
        { path: 'api/bridge/stats', method: RequestMethod.GET },
      );
  }
}

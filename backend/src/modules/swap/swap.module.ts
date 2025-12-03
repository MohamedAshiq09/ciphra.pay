import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SwapCoordinatorService } from './swap-coordinator.service';
import { SwapService } from './swap.service';
import { SwapController } from './swap.controller';
import { StarknetModule } from '../starknet/starknet.module';
import { ZcashModule } from '../zcash/zcash.module';
import { NearModule } from '../near/near.module';
import { MinaModule } from '../mina/mina.module';
import { HashOracleModule } from '../hash-oracle/hash-oracle.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(), 
    StarknetModule, 
    ZcashModule, 
    NearModule,
    MinaModule,
    HashOracleModule
  ],
  providers: [SwapCoordinatorService, SwapService],
  controllers: [SwapController],
  exports: [SwapCoordinatorService, SwapService],
})
export class SwapModule {}

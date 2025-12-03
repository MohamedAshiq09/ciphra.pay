import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SwapCoordinatorService } from './swap-coordinator.service';
import { SwapService } from './swap.service';
import { SwapController } from './swap.controller';
import { AztecModule } from '../aztec/aztec.module';
import { StarknetModule } from '../starknet/starknet.module';
import { ZcashModule } from '../zcash/zcash.module';
import { HashOracleModule } from '../hash-oracle/hash-oracle.module';

@Module({
  imports: [EventEmitterModule.forRoot(), AztecModule, StarknetModule, ZcashModule, HashOracleModule],
  providers: [SwapCoordinatorService, SwapService],
  controllers: [SwapController],
  exports: [SwapCoordinatorService, SwapService],
})
export class SwapModule {}

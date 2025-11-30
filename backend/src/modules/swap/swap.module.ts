import { Module } from '@nestjs/common';
import { SwapCoordinatorService } from './swap-coordinator.service';
import { SwapController } from './swap.controller';
import { AztecModule } from '../aztec/aztec.module';
import { StarknetModule } from '../starknet/starknet.module';
import { HashOracleModule } from '../hash-oracle/hash-oracle.module';

@Module({
  imports: [AztecModule, StarknetModule, HashOracleModule],
  providers: [SwapCoordinatorService],
  controllers: [SwapController],
  exports: [SwapCoordinatorService],
})
export class SwapModule {}

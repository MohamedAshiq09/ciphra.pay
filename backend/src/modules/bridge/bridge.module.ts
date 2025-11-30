import { Module } from '@nestjs/common';
import { BridgeController } from './bridge.controller';
import { AztecModule } from '../aztec/aztec.module';
import { StarknetModule } from '../starknet/starknet.module';
import { SwapModule } from '../swap/swap.module';

@Module({
  imports: [AztecModule, StarknetModule, SwapModule],
  controllers: [BridgeController],
})
export class BridgeModule {}

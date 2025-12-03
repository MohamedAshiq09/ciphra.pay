import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { ZcashModule } from '../zcash/zcash.module';
import { StarknetModule } from '../starknet/starknet.module';

@Module({
  imports: [EventEmitterModule.forRoot(), ZcashModule, StarknetModule],
  providers: [WalletService],
  controllers: [WalletController],
  exports: [WalletService],
})
export class WalletModule {}
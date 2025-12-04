import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppConfigModule } from '../../common/config/config.module';
import { ZcashService } from './zcash.service';
import { ZcashTransactionService } from './zcash-transaction.service';
import { ZcashTatumService } from './zcash-tatum.service';
import { ZcashController } from './zcash.controller';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    AppConfigModule,
  ],
  providers: [ZcashService, ZcashTransactionService, ZcashTatumService],
  controllers: [ZcashController],
  exports: [ZcashService, ZcashTransactionService, ZcashTatumService],
})
export class ZcashModule {}
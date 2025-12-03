import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppConfigModule } from '../../common/config/config.module';
import { ZcashService } from './zcash.service';
import { ZcashController } from './zcash.controller';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    AppConfigModule,
  ],
  providers: [ZcashService],
  controllers: [ZcashController],
  exports: [ZcashService],
})
export class ZcashModule {}
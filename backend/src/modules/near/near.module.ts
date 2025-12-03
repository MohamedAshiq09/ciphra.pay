import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppConfigModule } from '../../common/config/config.module';
import { NearService } from './near.service';
import { NearController } from './near.controller';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    AppConfigModule,
  ],
  providers: [NearService],
  controllers: [NearController],
  exports: [NearService],
})
export class NearModule {}
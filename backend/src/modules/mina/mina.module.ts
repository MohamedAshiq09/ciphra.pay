import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppConfigModule } from '../../common/config/config.module';
import { MinaService } from './mina.service';
import { MinaController } from './mina.controller';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    AppConfigModule,
  ],
  providers: [MinaService],
  controllers: [MinaController],
  exports: [MinaService],
})
export class MinaModule {}
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AztecService } from './aztec.service';
import { AztecMonitorService } from './aztec-monitor.service';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [AztecService, AztecMonitorService],
  exports: [AztecService, AztecMonitorService],
})
export class AztecModule {}

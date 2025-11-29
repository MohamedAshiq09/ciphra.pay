import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { StarknetService } from './starknet.service';
import { StarknetListenerService } from './starknet-listener.service';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [StarknetService, StarknetListenerService],
  exports: [StarknetService, StarknetListenerService],
})
export class StarknetModule {}

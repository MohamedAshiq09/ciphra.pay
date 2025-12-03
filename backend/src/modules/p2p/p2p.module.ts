import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { P2PService } from './p2p.service';
import { P2PController } from './p2p.controller';
import { ZcashModule } from '../zcash/zcash.module';

@Module({
  imports: [EventEmitterModule.forRoot(), ZcashModule],
  providers: [P2PService],
  controllers: [P2PController],
  exports: [P2PService],
})
export class P2PModule {}
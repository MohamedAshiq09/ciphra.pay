import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './common/config/config.module';
import { HashOracleModule } from './modules/hash-oracle/hash-oracle.module';
import { AztecModule } from './modules/aztec/aztec.module';
import { StarknetModule } from './modules/starknet/starknet.module';

@Module({
  imports: [
    AppConfigModule,
    HashOracleModule,
    AztecModule,
    StarknetModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

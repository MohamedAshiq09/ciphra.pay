import { Module } from '@nestjs/common';
import { HashOracleService } from './hash-oracle.service';
import { HashOracleController } from './hash-oracle.controller';

@Module({
  controllers: [HashOracleController],
  providers: [HashOracleService],
  exports: [HashOracleService],
})
export class HashOracleModule {}

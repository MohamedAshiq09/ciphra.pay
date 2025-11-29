import { Module } from '@nestjs/common';
import { HashOracleService } from './hash-oracle.service';

@Module({
  providers: [HashOracleService],
  exports: [HashOracleService],
})
export class HashOracleModule {}

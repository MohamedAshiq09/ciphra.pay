import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private configService: NestConfigService) {}

  // App Config
  get port(): number {
    return this.configService.get<number>('PORT', 3000);
  }

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  // Aztec Config
  get aztecPxeUrl(): string {
    return this.configService.get<string>('AZTEC_PXE_URL', 'http://localhost:8080');
  }

  get aztecContractAddress(): string {
    return this.configService.getOrThrow<string>('AZTEC_CONTRACT_ADDRESS');
  }

  get aztecWalletPrivateKey(): string {
    return this.configService.getOrThrow<string>('AZTEC_WALLET_PRIVATE_KEY');
  }

  get aztecPollInterval(): number {
    return this.configService.get<number>('AZTEC_POLL_INTERVAL', 5000);
  }

  // Starknet Config
  get starknetNetwork(): string {
    return this.configService.get<string>('STARKNET_NETWORK', 'starknet-sepolia');
  }

  get starknetRpcUrl(): string {
    return this.configService.get<string>('STARKNET_RPC_URL', 'http://localhost:5050');
  }

  get starknetAtomicSwapAddress(): string {
    return this.configService.getOrThrow<string>('STARKNET_ATOMIC_SWAP_ADDRESS');
  }

  get starknetWalletPrivateKey(): string {
    return this.configService.getOrThrow<string>('STARKNET_WALLET_PRIVATE_KEY');
  }

  get starknetPollInterval(): number {
    return this.configService.get<number>('STARKNET_POLL_INTERVAL', 5000);
  }

  // Database Config
  get databaseUrl(): string {
    return this.configService.get<string>('DATABASE_URL',
      'postgresql://postgres:postgres@localhost:5432/ciphra_pay');
  }

  // Redis Config
  get redisUrl(): string {
    return this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
  }

  // Security Config
  get jwtSecret(): string {
    return this.configService.getOrThrow<string>('JWT_SECRET');
  }

  get adminApiKey(): string {
    return this.configService.getOrThrow<string>('ADMIN_API_KEY');
  }

  // Hash Oracle Config
  get secretLength(): number {
    return this.configService.get<number>('SECRET_LENGTH', 32);
  }

  // Swap Config
  get defaultTimeLockDuration(): number {
    return this.configService.get<number>('DEFAULT_TIME_LOCK_DURATION', 3600);
  }

  get minTimeLockDuration(): number {
    return this.configService.get<number>('MIN_TIME_LOCK_DURATION', 3600);
  }

  get maxTimeLockDuration(): number {
    return this.configService.get<number>('MAX_TIME_LOCK_DURATION', 172800);
  }

  get defaultFeePercentage(): number {
    return this.configService.get<number>('DEFAULT_FEE_PERCENTAGE', 30);
  }

  // X402 Payment Config
  get paymasterEndpoint(): string {
    return this.configService.get<string>('PAYMASTER_ENDPOINT',
      'https://sepolia.paymaster.avnu.fi');
  }

  get x402PaymentTokenAddress(): string {
    return this.configService.getOrThrow<string>('X402_PAYMENT_TOKEN_ADDRESS');
  }

  get x402PaymentAmount(): string {
    return this.configService.get<string>('X402_PAYMENT_AMOUNT', '1000000');
  }

  get x402PaymentRecipient(): string {
    return this.configService.getOrThrow<string>('X402_PAYMENT_RECIPIENT');
  }
}

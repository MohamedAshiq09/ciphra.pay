import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private configService: NestConfigService) {}

  // Aztec Configuration
  get aztecPxeUrl(): string {
    return this.configService.get<string>('AZTEC_PXE_URL', 'http://localhost:8080');
  }

  get aztecContractAddress(): string {
    const address = this.configService.get<string>('AZTEC_CONTRACT_ADDRESS');
    if (!address) {
      throw new Error('AZTEC_CONTRACT_ADDRESS is required');
    }
    return address;
  }

  get aztecWalletPrivateKey(): string {
    const key = this.configService.get<string>('AZTEC_WALLET_PRIVATE_KEY');
    if (!key) {
      throw new Error('AZTEC_WALLET_PRIVATE_KEY is required');
    }
    return key;
  }

  // Starknet Configuration
  get starknetRpcUrl(): string {
    return this.configService.get<string>('STARKNET_RPC_URL', 'http://localhost:5050');
  }

  get starknetNetwork(): string {
    return this.configService.get<string>('STARKNET_NETWORK', 'starknet-devnet');
  }

  get starknetAtomicSwapAddress(): string {
    const address = this.configService.get<string>('STARKNET_ATOMIC_SWAP_ADDRESS');
    if (!address) {
      throw new Error('STARKNET_ATOMIC_SWAP_ADDRESS is required');
    }
    return address;
  }

  get starknetBridgeAddress(): string {
    const address = this.configService.get<string>('STARKNET_BRIDGE_ADDRESS');
    if (!address) {
      throw new Error('STARKNET_BRIDGE_ADDRESS is required');
    }
    return address;
  }

  get starknetWalletPrivateKey(): string {
    const key = this.configService.get<string>('STARKNET_WALLET_PRIVATE_KEY');
    if (!key) {
      throw new Error('STARKNET_WALLET_PRIVATE_KEY is required');
    }
    return key;
  }

  // x402 Paymaster Configuration
  get paymasterEndpoint(): string {
    return this.configService.get<string>('PAYMASTER_ENDPOINT', 'http://localhost:12777');
  }

  get paymasterApiKey(): string | undefined {
    return this.configService.get<string>('PAYMASTER_API_KEY');
  }

  // Database Configuration
  get databaseHost(): string {
    return this.configService.get<string>('DATABASE_HOST', 'localhost');
  }

  get databasePort(): number {
    return this.configService.get<number>('DATABASE_PORT', 5432);
  }

  get databaseName(): string {
    return this.configService.get<string>('DATABASE_NAME', 'ciphra_pay');
  }

  get databaseUser(): string {
    return this.configService.get<string>('DATABASE_USER', 'postgres');
  }

  get databasePassword(): string {
    return this.configService.get<string>('DATABASE_PASSWORD', 'postgres');
  }

  // Redis Configuration
  get redisHost(): string {
    return this.configService.get<string>('REDIS_HOST', 'localhost');
  }

  get redisPort(): number {
    return this.configService.get<number>('REDIS_PORT', 6379);
  }

  // API Configuration
  get port(): number {
    return this.configService.get<number>('PORT', 3000);
  }

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  // Security Configuration
  get jwtSecret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret && this.isProduction) {
      throw new Error('JWT_SECRET is required in production');
    }
    return secret || 'dev-secret-change-in-production';
  }

  get adminApiKey(): string {
    const key = this.configService.get<string>('ADMIN_API_KEY');
    if (!key && this.isProduction) {
      throw new Error('ADMIN_API_KEY is required in production');
    }
    return key || 'dev-admin-key';
  }

  // Monitoring Configuration
  get monitoringInterval(): number {
    return this.configService.get<number>('MONITORING_INTERVAL_MS', 5000); // 5 seconds
  }
}

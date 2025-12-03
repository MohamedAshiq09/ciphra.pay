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

  get starknetP2PAddress(): string {
    const address = this.configService.get<string>('STARKNET_P2P_TRANSFER_ADDRESS');
    if (!address) {
      throw new Error('STARKNET_P2P_TRANSFER_ADDRESS is required');
    }
    return address;
  }

  get starknetEscrowAddress(): string {
    const address = this.configService.get<string>('STARKNET_ESCROW_ADDRESS');
    if (!address) {
      throw new Error('STARKNET_ESCROW_ADDRESS is required');
    }
    return address;
  }

  get starknetBridgeConnectorAddress(): string {
    const address = this.configService.get<string>('STARKNET_BRIDGE_CONNECTOR_ADDRESS');
    if (!address) {
      throw new Error('STARKNET_BRIDGE_CONNECTOR_ADDRESS is required');
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

  // Zcash Configuration
  get zcashNetwork(): string {
    return this.configService.get<string>('ZCASH_NETWORK', 'testnet');
  }

  get zcashLightwalletdUrl(): string {
    return this.configService.get<string>('ZCASH_LIGHTWALLETD_URL', 'https://lightwalletd.testnet.electriccoin.co:9067');
  }

  get zcashFacilitatorAddress(): string {
    const address = this.configService.get<string>('ZCASH_FACILITATOR_ADDRESS');
    if (!address) {
      throw new Error('ZCASH_FACILITATOR_ADDRESS is required');
    }
    return address;
  }

  get zcashFacilitatorPrivateKey(): string {
    const key = this.configService.get<string>('ZCASH_FACILITATOR_PRIVATE_KEY');
    if (!key) {
      throw new Error('ZCASH_FACILITATOR_PRIVATE_KEY is required');
    }
    return key;
  }

  // NEAR Configuration
  get nearNetwork(): string {
    return this.configService.get<string>('NEAR_NETWORK', 'testnet');
  }

  get nearRpcUrl(): string {
    return this.configService.get<string>('NEAR_RPC_URL', 'https://rpc.testnet.near.org');
  }

  get nearSwapContractId(): string {
    const contractId = this.configService.get<string>('NEAR_SWAP_CONTRACT_ID');
    if (!contractId) {
      throw new Error('NEAR_SWAP_CONTRACT_ID is required');
    }
    return contractId;
  }

  get nearP2PContractId(): string {
    const contractId = this.configService.get<string>('NEAR_P2P_CONTRACT_ID');
    if (!contractId) {
      throw new Error('NEAR_P2P_CONTRACT_ID is required');
    }
    return contractId;
  }

  get nearEscrowContractId(): string {
    const contractId = this.configService.get<string>('NEAR_ESCROW_CONTRACT_ID');
    if (!contractId) {
      throw new Error('NEAR_ESCROW_CONTRACT_ID is required');
    }
    return contractId;
  }

  // Mina Configuration
  get minaNetwork(): string {
    return this.configService.get<string>('MINA_NETWORK', 'devnet');
  }

  get minaRpcUrl(): string {
    return this.configService.get<string>('MINA_RPC_URL', 'https://api.minascan.io/node/devnet/v1/graphql');
  }

  get minaSwapContractAddress(): string {
    const address = this.configService.get<string>('MINA_SWAP_CONTRACT_ADDRESS');
    if (!address) {
      throw new Error('MINA_SWAP_CONTRACT_ADDRESS is required');
    }
    return address;
  }

  // X402 Payment Configuration
  get x402PaymentTokenAddress(): string {
    const address = this.configService.get<string>('X402_PAYMENT_TOKEN_ADDRESS');
    if (!address) {
      throw new Error('X402_PAYMENT_TOKEN_ADDRESS is required');
    }
    return address;
  }

  get x402PaymentAmount(): string {
    return this.configService.get<string>('X402_PAYMENT_AMOUNT', '1000000');
  }

  get x402PaymentRecipient(): string {
    const recipient = this.configService.get<string>('X402_PAYMENT_RECIPIENT');
    if (!recipient) {
      throw new Error('X402_PAYMENT_RECIPIENT is required');
    }
    return recipient;
  }
}

# X402 WALLET - INTEGRATION ARCHITECTURE
## NEAR + Starknet + Aztec Cross-Chain Integration

---

## SYSTEM OVERVIEW

X402 Wallet integrates three blockchain ecosystems for privacy-preserving cross-chain swaps:

```
┌───────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + TypeScript)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Wallet     │  │    Swap      │  │   Privacy    │        │
│  │  Dashboard   │  │  Interface   │  │   Settings   │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└────────────┬──────────────────┬──────────────────┬────────────┘
             │                  │                  │
    ┌────────▼────────┐  ┌─────▼──────┐  ┌───────▼────────┐
    │  NEAR Module    │  │ Starknet   │  │  Aztec Module  │
    │  (near-api-js)  │  │ Module     │  │  (aztec.js)    │
    │                 │  │(starknet.js)│  │                │
    └────────┬────────┘  └─────┬──────┘  └───────┬────────┘
             │                  │                  │
    ┌────────▼──────────────────▼──────────────────▼────────┐
    │         NESTJS BACKEND (TypeScript)                    │
    │                                                         │
    │  ┌──────────────────────────────────────────────────┐ │
    │  │  Hash Compatibility Oracle                       │ │
    │  │  • Convert SHA256 ↔ Poseidon ↔ Pedersen         │ │
    │  └──────────────────────────────────────────────────┘ │
    │                                                         │
    │  ┌──────────────────────────────────────────────────┐ │
    │  │  Cross-Chain Event Monitor                       │ │
    │  │  • NEAR event listener                           │ │
    │  │  • Starknet event listener                       │ │
    │  │  • Aztec event listener                          │ │
    │  └──────────────────────────────────────────────────┘ │
    │                                                         │
    │  ┌──────────────────────────────────────────────────┐ │
    │  │  Atomic Swap Coordinator                         │ │
    │  │  • NEAR ↔ Starknet swaps                        │ │
    │  │  • NEAR ↔ Aztec swaps                           │ │
    │  │  • Starknet ↔ Aztec swaps                       │ │
    │  └──────────────────────────────────────────────────┘ │
    │                                                         │
    │  ┌──────────────────────────────────────────────────┐ │
    │  │  X402 Payment Verification                       │ │
    │  │  • HTTP 402 payment handler                      │ │
    │  │  • On-chain payment verification                 │ │
    │  └──────────────────────────────────────────────────┘ │
    └─────────────────────────────────────────────────────────┘
             │                  │                  │
    ┌────────▼────────┐  ┌─────▼──────┐  ┌───────▼────────┐
    │ NEAR Protocol   │  │  Starknet  │  │ Aztec Network  │
    │   (Testnet)     │  │  (Sepolia) │  │   (Testnet)    │
    └─────────────────┘  └────────────┘  └────────────────┘
```

---

## CROSS-CHAIN SWAP FLOW

### Example: 100 NEAR → 1000 STRK Atomic Swap

```
User                           NestJS Backend                     Blockchains
 │                                  │                                  │
 │ 1. Request swap                  │                                  │
 │    100 NEAR → 1000 STRK         │                                  │
 ├─────────────────────────────────>│                                  │
 │                                  │                                  │
 │                                  │ 2. Generate secret & hashes      │
 │                                  │    secret = "mysecret123"        │
 │                                  │    SHA256 = "abc..."             │
 │                                  │    Poseidon = "0x456..."         │
 │                                  │                                  │
 │                                  │ 3. Return swap metadata          │
 │<─────────────────────────────────│                                  │
 │                                  │                                  │
 │ 4. Initiate on NEAR              │                                  │
 │    (lock 100 NEAR with SHA256)   │                                  │
 ├──────────────────────────────────────────────────────────────────>│ NEAR
 │                                  │                                  │
 │                                  │ 5. Detect SwapInitiated event    │
 │                                  │<─────────────────────────────────│ NEAR
 │                                  │                                  │
 │                                  │ 6. Initiate on Starknet          │
 │                                  │    (lock 1000 STRK with Poseidon)│
 │                                  ├─────────────────────────────────>│ Starknet
 │                                  │                                  │
 │ 7. Complete Starknet swap        │                                  │
 │    (reveal secret)               │                                  │
 ├──────────────────────────────────────────────────────────────────>│ Starknet
 │                                  │                                  │
 │                                  │ 8. Detect SwapCompleted event    │
 │                                  │    (secret revealed!)            │
 │                                  │<─────────────────────────────────│ Starknet
 │                                  │                                  │
 │                                  │ 9. Complete NEAR swap            │
 │                                  │    (use revealed secret)         │
 │                                  ├─────────────────────────────────>│ NEAR
 │                                  │                                  │
 │ ✅ Swap complete!                │                                  │
 │    Gave 100 NEAR                 │                                  │
 │    Got 1000 STRK                 │                                  │
```

---

## HASH COMPATIBILITY SOLUTION

### The Core Problem

Different chains use different hash functions:
- **NEAR**: SHA256
- **Starknet**: Poseidon (SNARK-friendly)
- **Aztec**: Pedersen

**Challenge**: Same secret produces different hashes on each chain!

### Solution: Backend Hash Oracle

```typescript
// backend/src/services/hash-oracle.service.ts

import { Injectable } from '@nestjs/common';
import { hash } from 'starknet';
import { createHash } from 'crypto';

@Injectable()
export class HashOracleService {
  /**
   * Compute hashes for all chains from a single secret
   */
  computeAllHashes(secret: string) {
    return {
      sha256: this.computeSHA256(secret),      // For NEAR
      poseidon: this.computePoseidon(secret),  // For Starknet
      pedersen: this.computePedersen(secret),  // For Aztec
    };
  }
  
  /**
   * SHA256 hash for NEAR
   * Returns 64 hex characters
   */
  computeSHA256(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }
  
  /**
   * Poseidon hash for Starknet
   * Returns felt252 as string
   */
  computePoseidon(secret: string): string {
    // Convert string to felt252
    const secretBuffer = Buffer.from(secret);
    const secretBigInt = BigInt('0x' + secretBuffer.toString('hex'));
    
    // Compute Poseidon hash using starknet.js
    return hash.computeHashOnElements([secretBigInt]);
  }
  
  /**
   * Pedersen hash for Aztec
   * Returns Field element as string
   */
  computePedersen(secret: string): string {
    // Implementation using @aztec/aztec.js
    // Placeholder for now
    return '0x...';
  }
  
  /**
   * Verify that secret matches hash lock for given algorithm
   */
  verifySecret(secret: string, hashLock: string, algorithm: 'sha256' | 'poseidon' | 'pedersen'): boolean {
    const computedHash = this.computeAllHashes(secret);
    return computedHash[algorithm] === hashLock;
  }
}
```

---

## NESTJS BACKEND ARCHITECTURE

### Module Structure

```
backend/
├── src/
│   ├── modules/
│   │   ├── hash-oracle/
│   │   │   ├── hash-oracle.service.ts
│   │   │   ├── hash-oracle.controller.ts
│   │   │   └── hash-oracle.module.ts
│   │   │
│   │   ├── event-monitor/
│   │   │   ├── near-listener.service.ts
│   │   │   ├── starknet-listener.service.ts
│   │   │   ├── aztec-listener.service.ts
│   │   │   ├── event-monitor.service.ts
│   │   │   └── event-monitor.module.ts
│   │   │
│   │   ├── swap-coordinator/
│   │   │   ├── swap-coordinator.service.ts
│   │   │   ├── swap-coordinator.controller.ts
│   │   │   └── swap-coordinator.module.ts
│   │   │
│   │   ├── x402-payments/
│   │   │   ├── x402.middleware.ts
│   │   │   ├── x402.service.ts
│   │   │   ├── x402.controller.ts
│   │   │   └── x402.module.ts
│   │   │
│   │   └── database/
│   │       ├── entities/
│   │       │   ├── swap.entity.ts
│   │       │   ├── payment.entity.ts
│   │       │   └── user.entity.ts
│   │       └── database.module.ts
│   │
│   ├── app.module.ts
│   ├── app.controller.ts
│   └── main.ts
│
├── package.json
├── tsconfig.json
├── nest-cli.json
└── .env
```

### Event Monitor Service

```typescript
// backend/src/modules/event-monitor/event-monitor.service.ts

import { Injectable, OnModuleInit } from '@nestjs/common';
import { NearListenerService } from './near-listener.service';
import { StarknetListenerService } from './starknet-listener.service';
import { AztecListenerService } from './aztec-listener.service';

@Injectable()
export class EventMonitorService implements OnModuleInit {
  constructor(
    private readonly nearListener: NearListenerService,
    private readonly starknetListener: StarknetListenerService,
    private readonly aztecListener: AztecListenerService,
  ) {}
  
  async onModuleInit() {
    // Start monitoring all chains
    await Promise.all([
      this.nearListener.startListening(),
      this.starknetListener.startListening(),
      this.aztecListener.startListening(),
    ]);
  }
  
  /**
   * Register handler for swap events
   */
  onSwapInitiated(chain: 'near' | 'starknet' | 'aztec', handler: Function) {
    switch (chain) {
      case 'near':
        this.nearListener.onSwapInitiated(handler);
        break;
      case 'starknet':
        this.starknetListener.onSwapInitiated(handler);
        break;
      case 'aztec':
        this.aztecListener.onSwapInitiated(handler);
        break;
    }
  }
  
  onSwapCompleted(chain: 'near' | 'starknet' | 'aztec', handler: Function) {
    // Similar pattern
  }
}
```

### NEAR Event Listener

```typescript
// backend/src/modules/event-monitor/near-listener.service.ts

import { Injectable } from '@nestjs/common';
import { connect, keyStores, Near } from 'near-api-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NearListenerService {
  private near: Near;
  private lastProcessedBlock: number = 0;
  
  constructor(private configService: ConfigService) {}
  
  async onModuleInit() {
    const config = {
      networkId: this.configService.get('NEAR_NETWORK'),
      nodeUrl: this.configService.get('NEAR_RPC_URL'),
      keyStore: new keyStores.InMemoryKeyStore(),
    };
    
    this.near = await connect(config);
  }
  
  async startListening() {
    setInterval(() => this.pollBlocks(), 2000); // Poll every 2 seconds
  }
  
  private async pollBlocks() {
    const latestBlock = await this.near.connection.provider.block({ finality: 'final' });
    const currentHeight = latestBlock.header.height;
    
    if (currentHeight > this.lastProcessedBlock) {
      // Process new blocks
      for (let height = this.lastProcessedBlock + 1; height <= currentHeight; height++) {
        await this.processBlock(height);
      }
      this.lastProcessedBlock = currentHeight;
    }
  }
  
  private async processBlock(blockHeight: number) {
    // Fetch block data
    // Parse transaction logs
    // Extract swap events
    // Call registered handlers
  }
  
  onSwapInitiated(handler: Function) {
    // Register handler
  }
}
```

### Starknet Event Listener

```typescript
// backend/src/modules/event-monitor/starknet-listener.service.ts

import { Injectable } from '@nestjs/common';
import { RpcProvider, Contract } from 'starknet';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StarknetListenerService {
  private provider: RpcProvider;
  private contract: Contract;
  private lastProcessedBlock: number = 0;
  
  constructor(private configService: ConfigService) {}
  
  async onModuleInit() {
    this.provider = new RpcProvider({
      nodeUrl: this.configService.get('STARKNET_RPC_URL'),
    });
    
    // Initialize contract for event parsing
    const contractAddress = this.configService.get('STARKNET_ATOMIC_SWAP_CONTRACT');
    this.contract = new Contract(ABI, contractAddress, this.provider);
  }
  
  async startListening() {
    setInterval(() => this.pollEvents(), 5000); // Poll every 5 seconds
  }
  
  private async pollEvents() {
    const latestBlock = await this.provider.getBlockLatestAccepted();
    
    if (latestBlock.block_number > this.lastProcessedBlock) {
      // Get events from contract
      const events = await this.provider.getEvents({
        from_block: { block_number: this.lastProcessedBlock + 1 },
        to_block: { block_number: latestBlock.block_number },
        address: this.contract.address,
        keys: [['SwapInitiated', 'SwapCompleted', 'SwapRefunded']],
      });
      
      // Process events
      for (const event of events.events) {
        await this.processEvent(event);
      }
      
      this.lastProcessedBlock = latestBlock.block_number;
    }
  }
  
  private async processEvent(event: any) {
    // Parse event data
    // Call registered handlers
  }
}
```

### Swap Coordinator Service

```typescript
// backend/src/modules/swap-coordinator/swap-coordinator.service.ts

import { Injectable } from '@nestjs/common';
import { HashOracleService } from '../hash-oracle/hash-oracle.service';
import { EventMonitorService } from '../event-monitor/event-monitor.service';
import { randomBytes } from 'crypto';

@Injectable()
export class SwapCoordinatorService {
  constructor(
    private readonly hashOracle: HashOracleService,
    private readonly eventMonitor: EventMonitorService,
  ) {
    // Register event handlers
    this.eventMonitor.onSwapInitiated('near', this.handleNearSwapInitiated.bind(this));
    this.eventMonitor.onSwapCompleted('starknet', this.handleStarknetSwapCompleted.bind(this));
  }
  
  /**
   * Initiate cross-chain atomic swap
   */
  async initiateSwap(params: {
    sourceChain: 'near' | 'starknet' | 'aztec';
    destChain: 'near' | 'starknet' | 'aztec';
    amount: string;
    userAddress: {
      near?: string;
      starknet?: string;
      aztec?: string;
    };
  }) {
    // Generate secret
    const secret = randomBytes(32).toString('hex');
    
    // Compute hashes for all chains
    const hashes = this.hashOracle.computeAllHashes(secret);
    
    // Generate swap IDs
    const sourceSwapId = `${params.sourceChain}_${randomBytes(16).toString('hex')}`;
    const destSwapId = `${params.destChain}_${randomBytes(16).toString('hex')}`;
    
    // Store swap metadata in database
    await this.storeSwapMetadata({
      sourceSwapId,
      destSwapId,
      secret,
      hashes,
      ...params,
    });
    
    return {
      sourceSwapId,
      destSwapId,
      secret,
      sourceHash: hashes[this.getHashAlgorithm(params.sourceChain)],
      destHash: hashes[this.getHashAlgorithm(params.destChain)],
    };
  }
  
  /**
   * Handler for NEAR SwapInitiated event
   * Automatically creates counterparty swap on destination chain
   */
  private async handleNearSwapInitiated(event: any) {
    const { swap_id, target_chain, counterparty_swap_id } = event;
    
    // Get swap metadata from database
    const metadata = await this.getSwapMetadata(swap_id);
    
    if (target_chain === 'starknet') {
      // Initiate swap on Starknet
      await this.initiateStarknetSwap({
        swapId: counterparty_swap_id,
        hashLock: metadata.destHash,
        amount: metadata.destAmount,
        recipient: metadata.userAddress.starknet,
      });
    }
  }
  
  /**
   * Handler for Starknet SwapCompleted event
   * Automatically completes corresponding NEAR swap
   */
  private async handleStarknetSwapCompleted(event: any) {
    const { swap_id, secret } = event;
    
    // Get linked NEAR swap
    const metadata = await this.getSwapMetadata(swap_id);
    const nearSwapId = metadata.sourceSwapId;
    
    // Complete NEAR swap using revealed secret
    await this.completeNearSwap(nearSwapId, secret);
  }
  
  private getHashAlgorithm(chain: string): 'sha256' | 'poseidon' | 'pedersen' {
    const algoMap = {
      near: 'sha256',
      starknet: 'poseidon',
      aztec: 'pedersen',
    };
    return algoMap[chain];
  }
}
```

---

## X402 PAYMENT INTEGRATION

### X402 Middleware

```typescript
// backend/src/modules/x402-payments/x402.middleware.ts

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { X402Service } from './x402.service';

@Injectable()
export class X402Middleware implements NestMiddleware {
  constructor(private x402Service: X402Service) {}
  
  async use(req: Request, res: Response, next: NextFunction) {
    // Check if route requires payment
    const routeConfig = this.x402Service.getRouteConfig(req.path);
    
    if (!routeConfig) {
      return next();
    }
    
    // Check for X-PAYMENT header
    const xPayment = req.headers['x-payment'] as string;
    
    if (!xPayment) {
      // Return 402 Payment Required
      return res.status(402).json({
        x402Version: 1,
        accepts: [{
          scheme: 'exact',
          network: 'starknet-sepolia',
          maxAmountRequired: routeConfig.amount,
          resource: req.path,
          description: routeConfig.description,
          payTo: routeConfig.recipient,
          asset: routeConfig.token,
        }],
      });
    }
    
    // Verify payment
    const isValid = await this.x402Service.verifyPayment(xPayment, req.path);
    
    if (!isValid) {
      return res.status(402).json({ error: 'Invalid payment' });
    }
    
    // Payment verified, continue
    next();
  }
}
```

---

## DEPLOYMENT CONFIGURATION

### Environment Variables

```bash
# .env

# Network Configuration
NEAR_NETWORK=testnet
NEAR_RPC_URL=https://rpc.testnet.near.org
STARKNET_NETWORK=sepolia
STARKNET_RPC_URL=https://rpc.nethermind.io/sepolia-juno/
AZTEC_RPC_URL=https://aztec-testnet.rpc.url

# Contract Addresses
NEAR_ATOMIC_SWAP_CONTRACT=dev-123-atomic-swap.testnet
STARKNET_ATOMIC_SWAP_CONTRACT=0x...
STARKNET_X402_PAYMENT_CONTRACT=0x...
AZTEC_PRIVATE_SWAP_CONTRACT=0x...

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/x402_wallet
REDIS_URL=redis://localhost:6379

# Oracle (Backend Wallet)
NEAR_ORACLE_ACCOUNT_ID=oracle.testnet
NEAR_ORACLE_PRIVATE_KEY=ed25519:...
STARKNET_ORACLE_PRIVATE_KEY=0x...

# API Security
JWT_SECRET=your-secret-key
PORT=3000
```

---

## QUICK START

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Services
```bash
# Start PostgreSQL
docker-compose up -d postgres

# Start Redis
docker-compose up -d redis

# Start NestJS backend
npm run start:dev
```

### 3. Deploy Contracts
```bash
# NEAR
near deploy --accountId your-account.testnet --wasmFile atomic_swap.wasm --networkId testnet

# Starknet
starkli deploy <class-hash> --rpc https://rpc.nethermind.io/sepolia-juno/

# Aztec
aztec-cli deploy PrivateAtomicSwap
```

### 4. Test Swap
```bash
curl -X POST http://localhost:3000/swap/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "sourceChain": "near",
    "destChain": "starknet",
    "amount": "100000000000000000000000000",
    "userAddress": {
      "near": "alice.testnet",
      "starknet": "0x123..."
    }
  }'
```

---

## KEY TAKEAWAYS

1. **NestJS provides production-grade architecture** - Modular, scalable, TypeScript
2. **Hash oracle is critical** - Bridges SHA256 ↔ Poseidon ↔ Pedersen
3. **Event monitoring is automated** - Backend detects and coordinates swaps
4. **All testnets** - Safe development environment
5. **X402 enables monetization** - Micropayments for premium features

**Ready to generate code from this architecture!** 🚀
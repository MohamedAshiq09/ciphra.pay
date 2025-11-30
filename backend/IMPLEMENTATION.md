# CIPHRA.PAY BACKEND - IMPLEMENTATION GUIDE

**Cross-Chain Privacy Payment Infrastructure**
**Aztec + Starknet + NEAR Integration**

Last Updated: 2025-11-29

---

## TABLE OF CONTENTS

1. [Overview](#overview)
2. [Contract Analysis](#contract-analysis)
3. [Architecture](#architecture)
4. [Critical Components](#critical-components)
5. [Implementation Plan](#implementation-plan)
6. [API Endpoints](#api-endpoints)
7. [Database Schema](#database-schema)
8. [Deployment](#deployment)

---

## OVERVIEW

### What We're Building

A **NestJS backend** that acts as an **oracle and coordinator** for cross-chain atomic swaps between:
- **Aztec Network** (Privacy Layer - ZK Proofs)
- **Starknet** (Public Layer - ZK Rollup)
- **NEAR Protocol** (Fast Layer - Sharded PoS)

### Why Backend is Critical

Unlike traditional atomic swaps that rely purely on smart contracts, our cross-chain swaps need a backend because:

1. **Hash Incompatibility**: Different chains use different hash functions
   - Aztec: Pedersen
   - Starknet: Poseidon
   - NEAR: SHA256

2. **Event Coordination**: No direct communication between chains
   - Backend monitors events on all chains
   - Detects secret reveals
   - Completes counterparty swaps

3. **User Experience**: Automatic swap completion
   - User only interacts with one chain
   - Backend handles the rest automatically

---

## CONTRACT ANALYSIS

### Aztec Contract - PrivateAtomicSwap V3

**File**: `contract/aztec-contracts/src/main.nr`
**Status**: Deployed on local sandbox

#### Key Functions

```noir
// 1. Initiate private swap
fn initiate_private_swap(
    swap_id: Field,
    recipient: AztecAddress,
    amount: Field,
    token_address: AztecAddress,
    hash_lock: Field,           // Pedersen hash of secret
    hash_type: u8,              // 0=Pedersen, 1=Poseidon (future)
    time_lock_duration: u64,
    target_chain: Field,        // 0=Aztec, 1=Starknet, 2=NEAR, 3=Zcash
    target_swap_id: Field,      // ID of counterparty swap
)

// 2. Complete swap by revealing secret
fn complete_private_swap(
    swap_id: Field,
    secret: Field,              // Reveals the secret!
    hash_type: u8,
)

// 3. Refund after time lock expires
fn refund_private_swap(swap_id: Field)
```

#### Public State Variables (CRITICAL for Backend Monitoring)

```noir
// Backend polls these every 5 seconds!
public_swap_status: Map<Field, PublicMutable<u8>>
    // 0 = None, 1 = Active, 2 = Completed, 3 = Refunded

public_swap_secrets: Map<Field, PublicMutable<Field>>
    // Stores revealed secret when swap is completed

public_target_chains: Map<Field, PublicMutable<Field>>
    // Target chain identifier

public_target_swap_ids: Map<Field, PublicMutable<Field>>
    // Linked swap ID on target chain

public_token_addresses: Map<Field, PublicMutable<AztecAddress>>
    // Token contract address
```

#### Internal Public Functions (Called from Private Context)

```noir
// Called when initiating swap
fn register_swap_public(
    swap_id: Field,
    target_chain: Field,
    target_swap_id: Field,
    token_address: AztecAddress
)
    // Sets status = 1 (Active)

// Called when completing swap
fn complete_swap_public(
    swap_id: Field,
    secret: Field,              // STORES SECRET IN PUBLIC STATE!
    target_chain: Field,
    target_swap_id: Field,
    token_address: AztecAddress,
    fee_amount: Field
)
    // Sets status = 2 (Completed)
    // Stores the revealed secret

// Called when refunding
fn update_swap_status(swap_id: Field, status: u8)
    // Updates status to 3 (Refunded)
```

**Why Public State?**
- Private notes are encrypted, backend can't read them
- Public state allows backend to monitor without private keys
- Secret is revealed in public state when swap completes
- Backend can then complete swaps on other chains

---

### Starknet Contract - AtomicSwapV2

**File**: `contract/starknet-contract/src/atomic_swap_v2.cairo`
**Status**: Deployed on local devnet

#### Key Functions

```cairo
// 1. Initiate swap
fn initiate_swap(
    swap_id: felt252,
    recipient: ContractAddress,
    hash_lock: felt252,         // Poseidon hash of secret
    time_lock: u64,
    amount: u256,
    token_address: ContractAddress,
    target_chain: felt252,      // "aztec", "near", "zcash"
    target_swap_id: felt252
)

// 2. Complete swap
fn complete_swap(
    swap_id: felt252,
    secret: felt252             // Reveals the secret!
)

// 3. Refund swap
fn refund_swap(swap_id: felt252)
```

#### Events (CRITICAL for Backend Monitoring)

```cairo
// Backend listens to these events!

#[derive(Drop, starknet::Event)]
struct SwapInitiated {
    #[key]
    swap_id: felt252,
    initiator: ContractAddress,
    recipient: ContractAddress,
    amount: u256,
    token_address: ContractAddress,
    hash_lock: felt252,
    time_lock: u64,
    target_chain: felt252,
    target_swap_id: felt252,
}

#[derive(Drop, starknet::Event)]
struct SwapCompleted {
    #[key]
    swap_id: felt252,
    recipient: ContractAddress,
    secret: felt252,            // THE SECRET IS HERE!
    amount_transferred: u256,
    fee_collected: u256,
    target_chain: felt252,
    target_swap_id: felt252,
}

#[derive(Drop, starknet::Event)]
struct SwapRefunded {
    #[key]
    swap_id: felt252,
    initiator: ContractAddress,
    amount: u256,
    target_chain: felt252,
}
```

#### Storage

```cairo
struct SwapDetails {
    initiator: ContractAddress,
    recipient: ContractAddress,
    amount: u256,
    token_address: ContractAddress,
    hash_lock: felt252,
    time_lock: u64,
    status: SwapStatus,         // Empty, Active, Completed, Refunded
    secret: felt252,            // Stores revealed secret
    target_chain: felt252,
    target_swap_id: felt252,
    created_at: u64,
}
```

---

### NEAR Contract (To Be Implemented)

Similar to Starknet but uses:
- **Hash Function**: SHA256
- **Events**: Emitted on swap lifecycle
- **Storage**: Account-based storage model

---

## ARCHITECTURE

### High-Level Flow

```
┌────────────────────────────────────────────────────────────────┐
│                     USER (Frontend/CLI)                         │
└───────────┬────────────────────────────────────────────────────┘
            │
            │ 1. Initiate Swap on Aztec
            │    (locks 100 ETH with Pedersen hash)
            ▼
┌────────────────────────────────────────────────────────────────┐
│                    AZTEC NETWORK                                │
│  PrivateAtomicSwap Contract                                     │
│  • Stores swap in private note                                  │
│  • Updates public_swap_status = 1 (Active)                      │
│  • Stores target_chain = 1 (Starknet)                           │
│  • Stores target_swap_id                                        │
└───────────┬────────────────────────────────────────────────────┘
            │
            │ 2. Event: Public state changed
            ▼
┌────────────────────────────────────────────────────────────────┐
│            NESTJS BACKEND (Oracle & Coordinator)                │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Aztec Monitor Service                                    │  │
│  │  • Polls public_swap_status every 5s                      │  │
│  │  • Detects new swap (status = 1)                          │  │
│  │  • Reads: target_chain, target_swap_id, hash_lock         │  │
│  └──────────┬───────────────────────────────────────────────┘  │
│             │                                                    │
│             │ 3. Swap detected!                                 │
│             ▼                                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Hash Oracle Service                                      │  │
│  │  • Converts Pedersen hash → Poseidon hash                │  │
│  │  • Stores mapping in database                             │  │
│  └──────────┬───────────────────────────────────────────────┘  │
│             │                                                    │
│             │ 4. Hash converted                                 │
│             ▼                                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Swap Coordinator Service                                 │  │
│  │  • Creates counterparty swap on Starknet                  │  │
│  │  • Locks 1000 STRK with Poseidon hash                     │  │
│  └──────────┬───────────────────────────────────────────────┘  │
│             │                                                    │
└─────────────┼────────────────────────────────────────────────────┘
              │
              │ 5. Call initiate_swap()
              ▼
┌────────────────────────────────────────────────────────────────┐
│                   STARKNET NETWORK                              │
│  AtomicSwapV2 Contract                                          │
│  • Creates swap with Poseidon hash                              │
│  • Emits SwapInitiated event                                    │
│  • Status = Active                                              │
└───────────┬────────────────────────────────────────────────────┘
            │
            │ 6. User completes swap
            │    (reveals secret to get 1000 STRK)
            ▼
┌────────────────────────────────────────────────────────────────┐
│                   STARKNET NETWORK                              │
│  • User calls complete_swap(swap_id, secret)                    │
│  • Emits SwapCompleted event                                    │
│  • Event contains the SECRET!                                   │
└───────────┬────────────────────────────────────────────────────┘
            │
            │ 7. Event: SwapCompleted (with secret)
            ▼
┌────────────────────────────────────────────────────────────────┐
│            NESTJS BACKEND (Oracle & Coordinator)                │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Starknet Listener Service                                │  │
│  │  • Listens to SwapCompleted event                         │  │
│  │  • Extracts secret from event                             │  │
│  │  • Reads target_chain, target_swap_id                     │  │
│  └──────────┬───────────────────────────────────────────────┘  │
│             │                                                    │
│             │ 8. Secret revealed!                               │
│             ▼                                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Swap Coordinator Service                                 │  │
│  │  • Completes Aztec swap using revealed secret             │  │
│  └──────────┬───────────────────────────────────────────────┘  │
│             │                                                    │
└─────────────┼────────────────────────────────────────────────────┘
              │
              │ 9. Call complete_private_swap()
              ▼
┌────────────────────────────────────────────────────────────────┐
│                    AZTEC NETWORK                                │
│  • Backend calls complete_private_swap(swap_id, secret)         │
│  • Transfers 100 ETH to user                                    │
│  • Updates public_swap_status = 2 (Completed)                   │
│  • Stores secret in public_swap_secrets                         │
└────────────────────────────────────────────────────────────────┘

✅ ATOMIC SWAP COMPLETE!
   User gave 100 ETH on Aztec
   User received 1000 STRK on Starknet
```

---

## CRITICAL COMPONENTS

### 1. Hash Oracle Service

**Purpose**: Convert secrets and hashes between different hash functions

**Why Needed**:
- Aztec uses Pedersen
- Starknet uses Poseidon
- NEAR uses SHA256
- Same secret produces different hashes!

**Implementation**:
```typescript
// backend/src/modules/hash-oracle/hash-oracle.service.ts

import { Injectable } from '@nestjs/common';
import { hash } from 'starknet';  // For Poseidon
import { createHash } from 'crypto';  // For SHA256
import { computePedersenHash } from '@aztec/aztec.js';  // For Pedersen

@Injectable()
export class HashOracleService {
  /**
   * Generate secret and compute all hashes
   */
  generateSecretAndHashes(length: number = 32) {
    const secret = randomBytes(length).toString('hex');
    return {
      secret,
      sha256: this.computeSHA256(secret),
      poseidon: this.computePoseidon(secret),
      pedersen: this.computePedersen(secret),
    };
  }

  /**
   * SHA256 hash for NEAR
   */
  computeSHA256(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }

  /**
   * Poseidon hash for Starknet
   */
  computePoseidon(secret: string): string {
    const secretBuffer = Buffer.from(secret);
    const secretBigInt = BigInt('0x' + secretBuffer.toString('hex'));
    return hash.computeHashOnElements([secretBigInt]);
  }

  /**
   * Pedersen hash for Aztec
   */
  computePedersen(secret: string): string {
    const secretField = Fr.fromBuffer(Buffer.from(secret));
    return computePedersenHash([secretField]).toString();
  }

  /**
   * Verify secret matches hash
   */
  verifySecret(secret: string, hashLock: string, algorithm: 'sha256' | 'poseidon' | 'pedersen'): boolean {
    const hashes = this.generateSecretAndHashes();
    const computedHash = hashes[algorithm];
    return computedHash === hashLock;
  }
}
```

---

### 2. Aztec Listener Service

**Purpose**: Monitor Aztec contract public state for swap events

**What to Monitor**:
```typescript
// Poll these public state variables every 5 seconds
const contract = await PrivateAtomicSwap.at(address);

// 1. Check swap status
const status = await contract.methods.get_swap_status(swap_id).simulate();
// 0 = None, 1 = Active, 2 = Completed, 3 = Refunded

// 2. If status changed to Active (1), read details:
const targetChain = await contract.methods.get_target_chain(swap_id).simulate();
const targetSwapId = await contract.methods.get_target_swap_id(swap_id).simulate();
const tokenAddress = await contract.methods.get_token_address(swap_id).simulate();

// 3. If status changed to Completed (2), read secret:
const secret = await contract.methods.get_swap_secret(swap_id).simulate();
```

**Implementation Pattern**:
```typescript
@Injectable()
export class AztecListenerService {
  private lastProcessedSwaps: Map<string, number> = new Map();

  async startMonitoring() {
    setInterval(() => this.pollSwaps(), 5000);
  }

  private async pollSwaps() {
    const totalSwaps = await this.contract.methods.get_total_swaps().simulate();

    for (let i = this.lastProcessedSwaps.size; i < totalSwaps; i++) {
      const swapId = /* derive swap ID */;
      const status = await this.contract.methods.get_swap_status(swapId).simulate();

      if (status === 1n) {  // Active
        this.emit('swap-initiated', { swapId, /* details */ });
      } else if (status === 2n) {  // Completed
        const secret = await this.contract.methods.get_swap_secret(swapId).simulate();
        this.emit('swap-completed', { swapId, secret });
      }
    }
  }
}
```

---

### 3. Starknet Listener Service

**Purpose**: Listen to Starknet contract events

**Events to Monitor**:
```typescript
// Listen to these events
const events = await provider.getEvents({
  from_block: lastBlock,
  to_block: 'latest',
  address: contractAddress,
  keys: [['SwapInitiated', 'SwapCompleted', 'SwapRefunded']],
});

// Parse SwapCompleted event to get secret
for (const event of events.events) {
  if (event.keys[0] === 'SwapCompleted') {
    const swap_id = event.keys[1];
    const secret = event.data[2];  // SECRET IS HERE!
    const target_chain = event.data[5];
    const target_swap_id = event.data[6];

    // Use this secret to complete swap on Aztec!
  }
}
```

---

### 4. Swap Coordinator Service

**Purpose**: Orchestrate cross-chain swaps automatically

**Responsibilities**:
1. When swap initiated on Chain A → Create counterparty swap on Chain B
2. When swap completed on Chain B → Complete swap on Chain A
3. Handle hash conversion between chains
4. Store swap mappings in database

**Flow**:
```typescript
@Injectable()
export class SwapCoordinatorService {
  constructor(
    private aztecListener: AztecListenerService,
    private starknetListener: StarknetListenerService,
    private hashOracle: HashOracleService,
  ) {
    // Register event handlers
    this.aztecListener.on('swap-initiated', this.handleAztecSwapInitiated.bind(this));
    this.starknetListener.on('swap-completed', this.handleStarknetSwapCompleted.bind(this));
  }

  /**
   * Handler: Swap initiated on Aztec
   * Action: Create counterparty swap on Starknet
   */
  private async handleAztecSwapInitiated(event: AztecSwapEvent) {
    // 1. Get hash from Aztec (Pedersen)
    const pedersenHash = event.hashLock;

    // 2. Convert to Poseidon for Starknet
    const poseidonHash = this.hashOracle.convertPedersenToPoseidon(pedersenHash);

    // 3. Create swap on Starknet
    await this.starknetService.initiateSwap({
      swapId: event.targetSwapId,
      recipient: event.recipient,
      hashLock: poseidonHash,
      timeLock: event.timeLock,
      amount: event.amount,
      tokenAddress: STARKNET_TOKEN_ADDRESS,
      targetChain: 'aztec',
      targetSwapId: event.swapId,
    });

    // 4. Store mapping in database
    await this.db.saveSwapMapping({
      aztecSwapId: event.swapId,
      starknetSwapId: event.targetSwapId,
      secret: null,  // Not revealed yet
      status: 'active',
    });
  }

  /**
   * Handler: Swap completed on Starknet
   * Action: Complete swap on Aztec using revealed secret
   */
  private async handleStarknetSwapCompleted(event: StarknetSwapEvent) {
    // 1. Get revealed secret
    const secret = event.secret;

    // 2. Get linked Aztec swap
    const mapping = await this.db.getSwapMapping(event.swapId);
    const aztecSwapId = mapping.aztecSwapId;

    // 3. Complete Aztec swap
    await this.aztecService.completeSwap(aztecSwapId, secret);

    // 4. Update database
    await this.db.updateSwapMapping(mapping.id, {
      secret,
      status: 'completed',
    });
  }
}
```

---

### 5. X402 Payment Middleware

**Purpose**: Require payment for API access

**Integration**: Uses `x402-starknet` library

**Flow**:
```typescript
@Injectable()
export class X402Middleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const xPayment = req.headers['x-payment'];

    if (!xPayment) {
      // Return 402 Payment Required
      return res.status(402).json({
        x402Version: 1,
        error: 'Payment required',
        accepts: [{
          scheme: 'exact',
          network: 'starknet-sepolia',
          maxAmountRequired: '1000000',  // 0.001 ETH
          asset: ETH_TOKEN_ADDRESS,
          payTo: BACKEND_WALLET_ADDRESS,
          resource: req.path,
          maxTimeoutSeconds: 300,
        }],
      });
    }

    // Verify payment
    const payload = decodePaymentHeader(xPayment);
    const verification = await verifyPayment(provider, payload, requirements);

    if (!verification.isValid) {
      return res.status(400).json({ error: verification.invalidReason });
    }

    // Settle payment
    await settlePayment(provider, payload, requirements);

    // Payment verified, continue
    next();
  }
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Core Infrastructure ✅ DONE
- [x] NestJS project initialized
- [x] Dependencies installed
- [x] .env.example created
- [x] README updated with architecture

### Phase 2: Hash Oracle & Config
- [ ] Create config module (@nestjs/config)
- [ ] Create Hash Oracle Service
- [ ] Create hash conversion utilities
- [ ] Unit tests for hash functions

### Phase 3: Blockchain Services
- [ ] Create Aztec Service (PXE connection)
- [ ] Create Starknet Service (RPC provider)
- [ ] Create NEAR Service (NEAR API connection)
- [ ] Test connections to all chains

### Phase 4: Event Monitoring
- [ ] Create Aztec Listener Service
- [ ] Create Starknet Listener Service
- [ ] Create NEAR Listener Service
- [ ] Create Event Monitor Service (coordinator)
- [ ] Bull queues for background jobs

### Phase 5: Swap Coordination
- [ ] Create Swap Coordinator Service
- [ ] Implement automatic swap creation
- [ ] Implement automatic swap completion
- [ ] Handle refunds and time locks

### Phase 6: Payment Integration
- [ ] Create X402 Payment Service
- [ ] Create X402 Middleware
- [ ] Integrate with protected endpoints

### Phase 7: Database & API
- [ ] Create TypeORM entities (Swap, Payment)
- [ ] Create database migrations
- [ ] Create API controllers
- [ ] Create DTOs and validation

### Phase 8: Testing & Production
- [ ] Integration tests
- [ ] E2E tests with sandbox
- [ ] Production deployment guide
- [ ] Monitoring & alerts

---

## API ENDPOINTS

### Swap Management
```
POST   /api/swap/initiate       - Initiate cross-chain swap (requires x402 payment)
POST   /api/swap/complete       - Complete swap with secret
POST   /api/swap/refund         - Refund expired swap
GET    /api/swap/:id            - Get swap status
GET    /api/swap/list           - List all swaps (paginated)
GET    /api/swap/stats          - Get swap statistics
```

### Payment (x402)
```
GET    /api/payment/requirements  - Get payment requirements for resource
POST   /api/payment/verify        - Verify payment payload
POST   /api/payment/settle        - Settle payment on-chain
```

### Bridge Status
```
GET    /api/bridge/health       - Health check (all chains)
GET    /api/bridge/stats        - Total swaps, volume, fees
GET    /api/bridge/config       - Get bridge configuration
```

### Admin (Protected)
```
POST   /api/admin/withdraw-fees   - Withdraw collected fees
POST   /api/admin/set-fee         - Update fee percentage
GET    /api/admin/swaps           - Get all swaps (admin view)
POST   /api/admin/manual-complete - Manually complete stuck swap
```

---

## DATABASE SCHEMA

### Swap Entity
```typescript
@Entity()
export class Swap {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sourceChain: 'aztec' | 'starknet' | 'near';

  @Column()
  targetChain: 'aztec' | 'starknet' | 'near';

  @Column()
  sourceSwapId: string;

  @Column()
  targetSwapId: string;

  @Column()
  initiator: string;

  @Column()
  recipient: string;

  @Column()
  amount: string;

  @Column()
  tokenAddress: string;

  @Column()
  hashLockSHA256: string;

  @Column()
  hashLockPoseidon: string;

  @Column()
  hashLockPedersen: string;

  @Column({ nullable: true })
  secret: string;  // Null until revealed

  @Column()
  status: 'active' | 'completed' | 'refunded';

  @Column()
  timeLock: number;

  @Column()
  createdAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  refundedAt: Date;
}
```

### Payment Entity
```typescript
@Entity()
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  paymentHash: string;

  @Column()
  payer: string;

  @Column()
  amount: string;

  @Column()
  tokenAddress: string;

  @Column()
  resource: string;

  @Column()
  txHash: string;

  @Column()
  status: 'pending' | 'verified' | 'settled' | 'failed';

  @Column()
  createdAt: Date;

  @Column({ nullable: true })
  settledAt: Date;
}
```

---

## DEPLOYMENT

### Prerequisites
```bash
# 1. Aztec Sandbox running
cd contract/aztec-contracts
aztec start --sandbox

# 2. Starknet Devnet (optional for local testing)
starknet-devnet --port 5050

# 3. PostgreSQL
docker run -d --name ciphra-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ciphra_pay \
  -p 5432:5432 \
  postgres:16-alpine

# 4. Redis
docker run -d --name ciphra-redis \
  -p 6379:6379 \
  redis:7-alpine
```

### Installation
```bash
cd backend
pnpm install
cp .env.example .env
# Edit .env with your values
```

### Run Development
```bash
pnpm run start:dev
```

### Run Production
```bash
pnpm run build
pnpm run start:prod
```

---

## SECURITY NOTES

1. **Private Keys**: Never commit. Use environment variables.
2. **Secret Generation**: Use cryptographically secure random bytes.
3. **Hash Verification**: Always verify secrets before completing swaps.
4. **Time Lock**: Enforce minimum/maximum time locks.
5. **Rate Limiting**: Protect API endpoints.
6. **Payment Verification**: Always verify x402 payments before access.
7. **Nonce Tracking**: Prevent replay attacks.

---

## MONITORING

### Health Checks
- Aztec PXE connection
- Starknet RPC connection
- NEAR RPC connection
- PostgreSQL connection
- Redis connection

### Metrics
- Total swaps initiated
- Total swaps completed
- Total swaps refunded
- Average swap completion time
- Fees collected per token
- Payment success rate

### Alerts
- Failed blockchain connections
- Stuck swaps (neither completed nor refunded)
- Low oracle wallet balance
- Payment verification failures

---

## NEXT STEPS

1. Create config module
2. Implement Hash Oracle Service
3. Create blockchain services (Aztec, Starknet, NEAR)
4. Implement event listeners
5. Build swap coordinator
6. Add x402 payment integration
7. Create API controllers
8. Test end-to-end on testnets

---

**Ready to build! 🚀**

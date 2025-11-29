# Ciphra.Pay Backend - Cross-Chain Private Payment Infrastructure

**Production-grade NestJS backend for orchestrating private atomic swaps between Aztec and Starknet blockchains.**

## Overview

Ciphra.Pay is a privacy-preserving cross-chain payment protocol that enables atomic swaps between:
- **Aztec Network** (Privacy Layer - Private transactions using Zero-Knowledge Proofs)
- **Starknet** (Public Layer - ZK-Rollup on Ethereum)

This backend acts as the **orchestration layer** that:
1. Monitors private swap events on Aztec
2. Facilitates payment verification and settlement on Starknet via x402 protocol
3. Coordinates cross-chain atomic swap execution
4. Provides REST APIs for client applications

---

## Architecture

### Smart Contracts Deployed

#### 1. Aztec Noir Contract - PrivateAtomicSwap V3
**Deployed on:** Aztec Local Sandbox
**Contract:** `contract/aztec-contracts/src/main.nr`
**Status:** Fully deployed and operational

**Capabilities:**
- **Private Swaps**: 3 core functions (`initiate_private_swap`, `complete_private_swap`, `refund_private_swap`)
- **Cross-chain Metadata**: Supports Zcash, Starknet, NEAR, Aztec target chains
- **Secret Storage**: Public state variables for backend monitoring (swap secrets, status, metadata)
- **Fee Mechanism**: Configurable 0.3% default fee (up to 10% max)
- **Time Lock Protection**: 1h-48h configurable time locks
- **Pedersen Hash Verification**: Native Aztec hash function for secret verification
- **ERC20 Token Support**: Generic token support via `token_address` parameter
- **Admin Functions**: Owner-controlled fee management and withdrawal

**Storage (14 variables):**
```noir
private_swaps: Map<Field, PrivateSet<SwapNote>>
public_swap_status: Map<Field, PublicMutable<u8>>
public_swap_secrets: Map<Field, PublicMutable<Field>>
public_target_chains: Map<Field, PublicMutable<Field>>
public_target_swap_ids: Map<Field, PublicMutable<Field>>
public_token_addresses: Map<Field, PublicMutable<AztecAddress>>
collected_fees: Map<AztecAddress, PublicMutable<Field>>
owner: PublicMutable<AztecAddress>
fee_percentage: PublicMutable<Field>
fee_recipient: PublicMutable<AztecAddress>
min_time_lock_duration: PublicMutable<u64>
max_time_lock_duration: PublicMutable<u64>
total_swaps: PublicMutable<Field>
completed_swaps: PublicMutable<Field>
```

**Why Public State?**
The contract stores swap metadata in **public state variables** (`public_swap_secrets`, `public_swap_status`, etc.) specifically to enable backend monitoring. While private notes handle the actual token transfers securely, public state allows this backend to:
- Query swap status without private keys
- Monitor secret reveals for cross-chain coordination
- Track target chain information for swap completion

#### 2. Starknet Contracts
**Deployed on:** Starknet Local Devnet
**Contracts:** `contract/starknet-contract/src/`

**Contracts:**
- `AtomicSwap.cairo` - Public-side atomic swap logic
- `BridgeConnector.cairo` - Bridge between Aztec and Starknet
- `Escrow.cairo` - Secure escrow for locked funds
- `P2PTransfer.cairo` - Peer-to-peer transfer functionality

---

## What This Backend Will Do

### Core Responsibilities

#### 1. Aztec Swap Monitor (Real-time Event Listener)
**Purpose:** Monitor Aztec PrivateAtomicSwap contract for swap events

**How it works:**
- Connects to Aztec Sandbox PXE at `http://localhost:8080`
- Polls public state variables:
  - `public_swap_status` - Track swap status changes (0=None, 1=Initiated, 2=Completed, 3=Refunded)
  - `public_swap_secrets` - Detect secret reveals
  - `public_target_chains` - Identify target chain (Starknet = 1)
  - `public_target_swap_ids` - Match with Starknet swap IDs
  - `public_token_addresses` - Track token contracts
- Emits events to trigger cross-chain actions

**Implementation:**
```typescript
@Injectable()
export class AztecMonitorService {
  async monitorSwaps() {
    // Poll contract public state every 5 seconds
    // Detect: Initiated, Completed, Refunded, Secret Revealed
    // Emit events for cross-chain coordination
  }
}
```

#### 2. Starknet x402 Payment Handler
**Purpose:** Implement x402 payment protocol for Starknet payments

**Integration:** Uses `x402-starknet` library (in `../x402-starknet/`)

**Flow:**
1. Client requests resource → Backend returns `402 Payment Required`
2. Backend provides `PaymentRequirements`:
   ```json
   {
     "scheme": "exact",
     "network": "starknet-sepolia",
     "maxAmountRequired": "1000000",
     "asset": "0x049d36...", // ETH/USDC contract
     "payTo": "0x1234...",    // Backend's address
     "resource": "/api/swap/initiate",
     "maxTimeoutSeconds": 300
   }
   ```
3. Client creates payment payload (signs with Starknet wallet)
4. Backend verifies payment using `verifyPayment()`
5. Backend settles payment using `settlePayment()` via AVNU paymaster (gasless!)
6. Backend provides access to resource

**Why x402?**
- **Gasless payments**: Paymaster sponsors transaction fees
- **HTTP-native**: Payment in HTTP headers (`X-Payment`)
- **Secure**: Signature verification via SNIP-6, balance checks, expiration
- **Atomic**: Payment either succeeds completely or fails

#### 3. Cross-Chain Swap Coordinator
**Purpose:** Orchestrate atomic swaps across Aztec and Starknet

**Swap Flow:**

**Scenario A: Aztec → Starknet Swap**
1. User initiates private swap on Aztec with secret hash
2. Backend monitors Aztec, detects `Initiated` status
3. Backend verifies Starknet payment via x402
4. Backend creates corresponding swap on Starknet AtomicSwap contract
5. User reveals secret on Starknet to complete
6. Backend detects secret reveal, completes Aztec swap
7. Atomic swap complete!

**Scenario B: Starknet → Aztec Swap**
1. User pays via x402 and initiates Starknet swap
2. Backend creates private swap on Aztec with same secret hash
3. User reveals secret on Aztec to claim tokens (private!)
4. Backend monitors Aztec secret reveal (public state)
5. Backend completes Starknet swap with revealed secret
6. Atomic swap complete!

**Time Lock Protection:**
- If counterparty doesn't reveal secret within time lock (1-48h)
- Original initiator can refund their tokens
- No funds lost, no trust required!

#### 4. API Endpoints (REST)

```typescript
// Swap Management
POST   /api/swap/initiate      - Initiate cross-chain swap (requires x402 payment)
POST   /api/swap/complete      - Complete swap with secret
POST   /api/swap/refund        - Refund expired swap
GET    /api/swap/:id           - Get swap status
GET    /api/swap/list          - List all swaps

// Payment (x402)
GET    /api/payment/requirements  - Get payment requirements for resource
POST   /api/payment/verify        - Verify payment payload
POST   /api/payment/settle        - Settle payment on-chain

// Bridge Status
GET    /api/bridge/status      - Bridge health check
GET    /api/bridge/stats       - Total swaps, volume, fees

// Admin (Owner only)
POST   /api/admin/withdraw-fees   - Withdraw collected fees
POST   /api/admin/set-fee         - Update fee percentage
```

---

## Technology Stack

### Framework & Language
- **NestJS** - Enterprise-grade Node.js framework
- **TypeScript** - Type safety and modern JavaScript
- **PNPM** - Fast, efficient package manager

### Blockchain Integration

#### Aztec
```bash
@aztec/aztec.js        # Aztec SDK
@aztec/noir-contracts  # Contract artifacts
@aztec/pxe             # Private Execution Environment
```
- **PXE Connection:** `http://localhost:8080` (sandbox)
- **Contract Address:** Stored in config after deployment
- **Monitoring:** Poll public state variables every 5s

#### Starknet
```bash
starknet               # Starknet.js v8.0.0
x402-starknet          # x402 payment protocol library
```
- **RPC Provider:** `http://localhost:5050` (devnet) or Sepolia testnet
- **Paymaster:** AVNU paymaster for gasless transactions
- **Contract Addresses:** AtomicSwap, BridgeConnector, Escrow, P2PTransfer

### Database
- **PostgreSQL** - Production-grade relational database
  - Swap records (id, status, secret_hash, initiator, amount, timestamps)
  - Payment records (tx_hash, payer, amount, status)
  - Cross-chain mappings (aztec_swap_id ↔ starknet_swap_id)

### Additional Libraries
```bash
@nestjs/config         # Environment configuration
@nestjs/typeorm        # Database ORM
@nestjs/bull           # Job queues for monitoring
bull                   # Redis-based queue
ioredis                # Redis client
zod                    # Runtime validation
```

---

## Environment Variables

```bash
# Aztec Configuration
AZTEC_PXE_URL=http://localhost:8080
AZTEC_CONTRACT_ADDRESS=0x...    # PrivateAtomicSwap V3 contract
AZTEC_WALLET_PRIVATE_KEY=0x...  # Backend wallet for monitoring

# Starknet Configuration
STARKNET_RPC_URL=http://localhost:5050
STARKNET_NETWORK=starknet-devnet
STARKNET_ATOMIC_SWAP_ADDRESS=0x...
STARKNET_BRIDGE_ADDRESS=0x...
STARKNET_WALLET_PRIVATE_KEY=0x...

# x402 Paymaster
PAYMASTER_ENDPOINT=http://localhost:12777
PAYMASTER_API_KEY=optional_for_mainnet

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=ciphra_pay
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# API
PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=your_jwt_secret_here
ADMIN_API_KEY=your_admin_key_here
```

---

## Project Structure

```
backend/
├── src/
│   ├── main.ts                 # Application entry point
│   ├── app.module.ts           # Root module
│   │
│   ├── aztec/                  # Aztec integration
│   │   ├── aztec.module.ts
│   │   ├── aztec.service.ts          # PXE connection, contract calls
│   │   ├── aztec-monitor.service.ts  # Event monitoring
│   │   └── dto/                      # Aztec DTOs
│   │
│   ├── starknet/               # Starknet integration
│   │   ├── starknet.module.ts
│   │   ├── starknet.service.ts       # RPC provider, contract calls
│   │   └── dto/
│   │
│   ├── payment/                # x402 payment protocol
│   │   ├── payment.module.ts
│   │   ├── payment.service.ts        # x402 verify/settle
│   │   ├── payment.controller.ts     # Payment endpoints
│   │   └── guards/                   # Payment verification guard
│   │
│   ├── swap/                   # Swap coordination
│   │   ├── swap.module.ts
│   │   ├── swap.service.ts           # Cross-chain swap logic
│   │   ├── swap.controller.ts        # Swap endpoints
│   │   ├── entities/                 # Swap database entities
│   │   └── dto/
│   │
│   ├── bridge/                 # Bridge status & stats
│   │   ├── bridge.module.ts
│   │   ├── bridge.service.ts
│   │   └── bridge.controller.ts
│   │
│   ├── admin/                  # Admin functions
│   │   ├── admin.module.ts
│   │   ├── admin.service.ts
│   │   ├── admin.controller.ts
│   │   └── guards/                   # Admin auth guard
│   │
│   ├── database/               # Database configuration
│   │   ├── database.module.ts
│   │   └── migrations/
│   │
│   └── common/                 # Shared utilities
│       ├── config/
│       ├── guards/
│       ├── interceptors/
│       └── utils/
│
├── test/                       # E2E tests
├── .env.example
├── nest-cli.json
├── package.json
├── tsconfig.json
└── README.md
```

---

## Development Workflow

### Prerequisites

1. **Aztec Sandbox Running:**
   ```bash
   # Terminal 1 - Start Aztec sandbox
   cd ../contract/aztec-contracts
   aztec start --sandbox
   # Wait for "Aztec Sandbox is ready"
   ```

2. **Starknet Devnet Running (Optional - for Starknet local testing):**
   ```bash
   # Terminal 2 - Start Starknet devnet
   starknet-devnet --port 5050
   ```

3. **PostgreSQL Running:**
   ```bash
   # Terminal 3 - Start PostgreSQL (Docker)
   docker run -d \
     --name ciphra-postgres \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=ciphra_pay \
     -p 5432:5432 \
     postgres:16-alpine
   ```

4. **Redis Running:**
   ```bash
   # Terminal 4 - Start Redis (Docker)
   docker run -d \
     --name ciphra-redis \
     -p 6379:6379 \
     redis:7-alpine
   ```

### Installation

```bash
cd backend
pnpm install
```

### Running the Backend

```bash
# Development mode (hot reload)
pnpm run start:dev

# Production mode
pnpm run start:prod

# Debug mode
pnpm run start:debug
```

### Testing

```bash
# Unit tests
pnpm run test

# E2E tests (requires sandbox running)
pnpm run test:e2e

# Test coverage
pnpm run test:cov
```

---

## API Usage Examples

### 1. Initiate Cross-Chain Swap (Aztec → Starknet)

**Request:**
```bash
POST http://localhost:3000/api/swap/initiate
Content-Type: application/json

{
  "sourceChain": "aztec",
  "targetChain": "starknet",
  "amount": "1000000",
  "tokenAddress": "0xaztec_token_address",
  "secretHash": "0x1234...",
  "timeLock": 3600,
  "recipient": "0xstarknet_recipient"
}
```

**Response:**
```json
{
  "success": true,
  "swapId": "swap_abc123",
  "aztecSwapId": "0x789...",
  "status": "initiated",
  "expiresAt": "2025-11-29T12:00:00Z",
  "message": "Swap initiated on Aztec. Waiting for Starknet confirmation."
}
```

### 2. Complete Swap with Secret

**Request:**
```bash
POST http://localhost:3000/api/swap/complete
Content-Type: application/json

{
  "swapId": "swap_abc123",
  "secret": "0xsecret_preimage"
}
```

**Response:**
```json
{
  "success": true,
  "swapId": "swap_abc123",
  "status": "completed",
  "aztecTxHash": "0x...",
  "starknetTxHash": "0x...",
  "message": "Swap completed successfully on both chains."
}
```

### 3. Get Payment Requirements (x402)

**Request:**
```bash
GET http://localhost:3000/api/payment/requirements?resource=/api/swap/initiate
```

**Response:**
```json
{
  "x402Version": 1,
  "error": "Payment required to initiate swap",
  "accepts": [
    {
      "scheme": "exact",
      "network": "starknet-sepolia",
      "maxAmountRequired": "1000000",
      "asset": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
      "payTo": "0xbackend_wallet_address",
      "resource": "/api/swap/initiate",
      "maxTimeoutSeconds": 300,
      "extra": {
        "tokenName": "Ether",
        "tokenSymbol": "ETH",
        "tokenDecimals": 18
      }
    }
  ]
}
```

---

## Security Considerations

### 1. Private Key Management
- **NEVER commit private keys to git**
- Use environment variables for all private keys
- Rotate keys regularly
- Use hardware wallets for production

### 2. Payment Verification
- Always verify x402 payments before providing access
- Check signature validity via SNIP-6
- Verify balance sufficiency
- Validate expiration timestamps
- Prevent nonce reuse (replay attacks)

### 3. Time Lock Protection
- Enforce minimum time lock duration (1 hour)
- Enforce maximum time lock duration (48 hours)
- Refund automatically after time lock expiry

### 4. Admin Protection
- Require API key authentication for admin endpoints
- Rate limit admin endpoints
- Log all admin actions
- Use multi-sig for production fee withdrawals

### 5. Monitoring & Alerts
- Monitor Aztec swap events 24/7
- Alert on failed cross-chain swaps
- Track stuck swaps (neither completed nor refunded)
- Monitor paymaster balance for Starknet

---

## Production Deployment

### Infrastructure Requirements
- **Compute:** 2 vCPU, 4GB RAM minimum
- **Database:** PostgreSQL 16+ with replication
- **Cache:** Redis 7+ with persistence
- **Storage:** 50GB SSD minimum
- **Network:** 1Gbps uplink

### Deployment Checklist
- [ ] Set all environment variables
- [ ] Run database migrations
- [ ] Deploy contracts to production networks
- [ ] Configure SSL/TLS certificates
- [ ] Set up monitoring (Prometheus, Grafana)
- [ ] Configure log aggregation (ELK stack)
- [ ] Set up alerts (PagerDuty, Slack)
- [ ] Run security audit
- [ ] Perform load testing
- [ ] Set up backup strategy

### Monitoring Endpoints
```bash
GET /health           # Health check
GET /metrics          # Prometheus metrics
GET /api/bridge/stats # Bridge statistics
```

---

## Roadmap

### Phase 1: Core Infrastructure (Current)
- [x] Aztec PrivateAtomicSwap V3 contract deployed
- [x] Starknet contracts deployed
- [ ] NestJS backend setup
- [ ] Aztec monitor service
- [ ] Starknet x402 integration
- [ ] Database schema & migrations

### Phase 2: Swap Coordination
- [ ] Cross-chain swap orchestration
- [ ] Secret reveal monitoring
- [ ] Refund logic
- [ ] API endpoints

### Phase 3: Production Readiness
- [ ] Security audit
- [ ] Load testing
- [ ] Monitoring & alerts
- [ ] Documentation

### Phase 4: Advanced Features
- [ ] Multi-token support
- [ ] Batch swaps
- [ ] Liquidity pools
- [ ] Fee optimization

---

## References

### Aztec Documentation
- [Aztec Docs](https://docs.aztec.network)
- [Noir Language](https://noir-lang.org)
- [PXE API](https://docs.aztec.network/apis/pxe)

### Starknet Documentation
- [Starknet Docs](https://docs.starknet.io)
- [Starknet.js](https://www.starknetjs.com)
- [SNIP-6: Account Interface](https://github.com/starknet-io/SNIPs/blob/main/SNIPS/snip-6.md)
- [SNIP-12: Typed Structured Data](https://github.com/starknet-io/SNIPs/blob/main/SNIPS/snip-12.md)

### x402 Protocol
- [x402 Specification](https://github.com/x402)
- [x402-starknet Library](../x402-starknet/README.md)
- [AVNU Paymaster](https://doc.avnu.fi/avnu-paymaster-service/introduction)

### NestJS
- [NestJS Documentation](https://docs.nestjs.com)
- [TypeORM](https://typeorm.io)
- [Bull Queue](https://docs.bullmq.io)

---

## License

MIT License - See LICENSE file for details

---

## Support

For issues and questions:
- GitHub Issues: [ciphra.pay/issues](https://github.com/yourorg/ciphra.pay/issues)
- Discord: [Join our Discord](#)
- Email: support@ciphra.pay

---

**Built with privacy, powered by Zero-Knowledge.**

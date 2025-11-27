# X402 PRIVACY WALLET - COMPLETE PROJECT SPECIFICATION
## Master Document for Code Generation and Implementation

---

## TABLE OF CONTENTS

1. [Project Overview](#project-overview)
2. [X402 Payment Protocol Integration](#x402-payment-protocol-integration)
3. [Core Features](#core-features)
4. [Technical Architecture](#technical-architecture)
5. [Smart Contracts Specification](#smart-contracts-specification)
6. [Backend Services](#backend-services)
7. [Frontend Application](#frontend-application)
8. [Integration Flows](#integration-flows)
9. [API Specifications](#api-specifications)
10. [Deployment Guide](#deployment-guide)

---

## 1. PROJECT OVERVIEW

### What is X402 Wallet?

X402 is a **privacy-preserving cross-chain wallet** that enables users to:
- Execute **atomic swaps** between NEAR Protocol, Starknet, and Aztec Network
- Make **privacy-preserving payments** using the X402 HTTP payment protocol
- Store **encrypted documents** on Walrus with Seal encryption
- Verify **cross-chain proofs** without revealing sensitive data

### Target Hackathon
- **Zypherphunk Hackathon** by Zcash
- **Sponsors**: Zcash, Starknet, Aztec Network

### Unique Value Propositions

1. **First true cross-chain privacy wallet** - Integrates 3 different privacy ecosystems (NEAR, Starknet ZK-rollup, Aztec privacy layer)
2. **Solves hash incompatibility** - Bridges SHA256 (NEAR) and Poseidon (Starknet) using oracle
3. **Micropayments without accounts** - X402 protocol enables pay-per-use without subscriptions
4. **Complete privacy** - Aztec integration provides encrypted state for sensitive transactions
5. **Trustless atomic swaps** - No intermediaries, no custody, fully decentralized

---

## 2. X402 PAYMENT PROTOCOL INTEGRATION

### What is X402 Protocol?

X402 is Coinbase's **HTTP-based payment protocol** that uses the HTTP 402 "Payment Required" status code to gate access to resources behind on-chain payments.

**Key Concept:**
```
Traditional Web:
User → Request → Server → 200 OK (free access)

X402 Web:
User → Request → Server → 402 Payment Required
User → Request + Payment Proof → Server → 200 OK (paid access)
```

### How X402 Fits in YOUR Wallet

#### Use Case 1: **Premium Wallet Features**

Your wallet offers **premium analytics** that cost micro-payments:

```typescript
// User wants to access premium analytics
GET /api/wallet/analytics

// Server responds with 402
HTTP 402 Payment Required
{
  "x402Version": 1,
  "accepts": [{
    "scheme": "exact",
    "network": "starknet-mainnet",
    "maxAmountRequired": "100000",  // 0.1 STRK
    "resource": "/api/wallet/analytics",
    "payTo": "0xYourWalletFeeRecipient",
    "asset": "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d" // STRK
  }]
}

// User pays 0.1 STRK via wallet
POST /api/wallet/analytics
Headers:
  X-PAYMENT: <base64-encoded-payment-proof>

// Server verifies payment on-chain and returns analytics
HTTP 200 OK
{
  "analytics": { ... }
}
```

#### Use Case 2: **Cross-Chain Swap Fees**

Users pay for executing cross-chain atomic swaps:

```typescript
// User initiates NEAR → Starknet swap
POST /api/swap/initiate
{
  "from": "near",
  "to": "starknet",
  "amount": "100 NEAR"
}

// Backend charges 0.3% fee via X402
HTTP 402 Payment Required
{
  "maxAmountRequired": "300000",  // 0.3 NEAR in yoctoNEAR
  "description": "Cross-chain swap fee (0.3%)",
  "payTo": "your-backend.near"
}

// User pays, backend processes swap
```

#### Use Case 3: **Document Verification Service**

Users pay to verify encrypted documents stored on Walrus:

```typescript
// User wants to verify document ownership proof
POST /api/document/verify
{
  "documentId": "doc_123",
  "verificationLevel": "full"
}

// Charge verification fee
HTTP 402 Payment Required
{
  "maxAmountRequired": "50000",  // 0.05 STRK
  "description": "Document verification service",
  "payTo": "0xVerificationService"
}
```

### X402 Architecture in Your Wallet

```
┌─────────────────────────────────────────────────────────────┐
│                    WALLET FRONTEND                           │
│  • User requests premium feature                             │
│  • Receives 402 Payment Required                             │
│  • Signs payment with connected wallet                       │
│  • Retries request with X-PAYMENT header                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               PYTHON BACKEND (FastAPI)                       │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  X402 Middleware (402_handler.py)                    │  │
│  │  • Intercepts premium API calls                      │  │
│  │  • Returns 402 with payment requirements             │  │
│  │  • Verifies X-PAYMENT header                         │  │
│  │  • Checks on-chain payment status                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                     │
│                         ▼                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Payment Verifier                                    │  │
│  │  • Connects to Starknet/NEAR RPC                     │  │
│  │  • Verifies transaction on-chain                     │  │
│  │  • Checks payment amount and recipient               │  │
│  │  • Stores payment receipt                            │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  BLOCKCHAIN NETWORKS                         │
│  • Starknet: ERC20 transfer verification                     │
│  • NEAR: Token transfer verification                         │
│  • Payment logs stored on-chain                              │
└─────────────────────────────────────────────────────────────┘
```

### X402 Smart Contract Integration

**Starknet Payment Contract (Cairo):**

```cairo
#[starknet::contract]
mod X402PaymentVerifier {
    use starknet::ContractAddress;
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    
    #[storage]
    struct Storage {
        payments: Map<felt252, PaymentRecord>,
        backend_address: ContractAddress,
    }
    
    #[derive(Drop, Serde, starknet::Store)]
    struct PaymentRecord {
        payer: ContractAddress,
        amount: u256,
        resource: felt252,
        timestamp: u64,
        verified: bool,
    }
    
    // Backend calls this to verify payment
    #[external(v0)]
    fn verify_payment(
        ref self: ContractState,
        payment_id: felt252,
        payer: ContractAddress,
        amount: u256,
        resource: felt252
    ) -> bool {
        let caller = get_caller_address();
        assert(caller == self.backend_address.read(), 'Unauthorized');
        
        // Check if payment exists on-chain
        // Return true if valid
        true
    }
    
    // User calls this to make payment
    #[external(v0)]
    fn make_payment(
        ref self: ContractState,
        payment_id: felt252,
        recipient: ContractAddress,
        amount: u256,
        resource: felt252,
        token: ContractAddress
    ) {
        let payer = get_caller_address();
        
        // Transfer tokens
        let token_contract = IERC20Dispatcher { contract_address: token };
        token_contract.transfer_from(payer, recipient, amount);
        
        // Record payment
        let record = PaymentRecord {
            payer,
            amount,
            resource,
            timestamp: get_block_timestamp(),
            verified: true,
        };
        
        self.payments.write(payment_id, record);
        
        // Emit event for backend
        self.emit(PaymentMade { payment_id, payer, amount, resource });
    }
}
```

### Why X402 is Critical for Your Project

1. **Monetization**: Your wallet can charge for premium features without subscriptions
2. **Hackathon Appeal**: Shows real-world utility (micropayments are a hot topic)
3. **Differentiation**: Most wallets are free - you offer value-added paid services
4. **Sponsor Alignment**: Demonstrates understanding of payment protocols

### X402 Implementation Checklist

- [ ] Deploy X402 payment contract on Starknet
- [ ] Implement FastAPI middleware for 402 responses
- [ ] Create payment verification service
- [ ] Build frontend payment flow (sign + retry with X-PAYMENT)
- [ ] Add payment UI in wallet (show "This feature costs 0.1 STRK")
- [ ] Store payment receipts in database
- [ ] Add analytics dashboard showing payment activity

---

## 3. CORE FEATURES

### Feature 1: Cross-Chain Atomic Swaps

**What:** Trustless token swaps between NEAR, Starknet, and Aztec without intermediaries.

**How it works:**
1. User wants to swap 100 NEAR → 1000 STRK
2. Backend generates secret and computes hashes for both chains
3. User locks 100 NEAR in HTLC contract (hash: SHA256)
4. Backend locks 1000 STRK in HTLC contract (hash: Poseidon)
5. User reveals secret on Starknet, receives 1000 STRK
6. Backend uses revealed secret to complete NEAR side
7. Swap completed atomically ✅

**Privacy:** On Aztec, swap amounts and parties are encrypted.

### Feature 2: X402 Micropayments

**What:** Pay-per-use access to premium wallet features without accounts.

**Examples:**
- Advanced analytics: 0.1 STRK
- Priority swap execution: 0.05 STRK
- Document verification: 0.02 STRK

**How it works:**
1. User requests premium API
2. Backend returns HTTP 402 with payment requirements
3. User signs payment with wallet
4. Backend verifies on-chain
5. Access granted ✅

### Feature 3: Encrypted Document Storage

**What:** Store sensitive documents encrypted on Walrus, verified via Nautilus (Sui).

**How it works:**
1. User uploads document (e.g., KYC, contracts)
2. Frontend encrypts with Seal (client-side)
3. Encrypted blob uploaded to Walrus storage
4. Metadata stored in Nautilus smart contracts
5. Only whitelisted addresses can decrypt
6. Pay 0.02 STRK to verify authenticity (X402)

### Feature 4: Privacy-Preserving Identity

**What:** Unified privacy identity across chains using zkLogin.

**How it works:**
1. User authenticates with Google/GitHub
2. zkLogin generates ZK proof of identity
3. No email/username stored on-chain
4. Same identity used across NEAR, Starknet, Aztec
5. Privacy preserved via zero-knowledge proofs

### Feature 5: Multi-Chain Portfolio Dashboard

**What:** Unified view of assets across all supported chains.

**Shows:**
- NEAR balance
- Starknet tokens (ERC20)
- Aztec private notes
- Transaction history (public and private)
- Swap activity
- Payment history (X402)

---

## 4. TECHNICAL ARCHITECTURE

### High-Level System Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                              │
│                    (React + TypeScript + Vite)                     │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   Wallet     │  │    Swap      │  │   Privacy    │            │
│  │  Dashboard   │  │  Interface   │  │   Settings   │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  Document    │  │   X402       │  │   zkLogin    │            │
│  │  Manager     │  │  Payments    │  │   Auth       │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
└────────────┬──────────────────┬──────────────────┬────────────────┘
             │                  │                  │
    ┌────────▼────────┐  ┌─────▼──────┐  ┌───────▼────────┐
    │  NEAR SDK       │  │ Starknet   │  │  Aztec SDK     │
    │  (near-api-js)  │  │ SDK        │  │  (aztec.js)    │
    │                 │  │(starknet.js)│  │                │
    └────────┬────────┘  └─────┬──────┘  └───────┬────────┘
             │                  │                  │
             │                  │                  │
    ┌────────▼──────────────────▼──────────────────▼────────┐
    │              PYTHON BACKEND (FastAPI)                  │
    │                                                         │
    │  ┌──────────────────────────────────────────────────┐ │
    │  │  API Gateway (main.py)                           │ │
    │  │  • REST endpoints                                │ │
    │  │  • WebSocket for real-time updates               │ │
    │  │  • JWT authentication                            │ │
    │  └──────────────────────────────────────────────────┘ │
    │                                                         │
    │  ┌──────────────────────────────────────────────────┐ │
    │  │  X402 Payment Middleware                         │ │
    │  │  • 402 response handler                          │ │
    │  │  • Payment verification                          │ │
    │  │  • Receipt generation                            │ │
    │  └──────────────────────────────────────────────────┘ │
    │                                                         │
    │  ┌──────────────────────────────────────────────────┐ │
    │  │  Hash Compatibility Oracle                       │ │
    │  │  • SHA256 computation (NEAR)                     │ │
    │  │  • Poseidon computation (Starknet)               │ │
    │  │  • Pedersen computation (Aztec)                  │ │
    │  │  • Secret management                             │ │
    │  └──────────────────────────────────────────────────┘ │
    │                                                         │
    │  ┌──────────────────────────────────────────────────┐ │
    │  │  Cross-Chain Event Monitor                       │ │
    │  │  • NEAR event listener                           │ │
    │  │  • Starknet event listener                       │ │
    │  │  • Aztec event listener                          │ │
    │  │  • Event correlation engine                      │ │
    │  └──────────────────────────────────────────────────┘ │
    │                                                         │
    │  ┌──────────────────────────────────────────────────┐ │
    │  │  Atomic Swap Coordinator                         │ │
    │  │  • Swap initiation                               │ │
    │  │  • Counterparty swap creation                    │ │
    │  │  • Auto-completion logic                         │ │
    │  │  • Refund monitoring                             │ │
    │  └──────────────────────────────────────────────────┘ │
    │                                                         │
    │  ┌──────────────────────────────────────────────────┐ │
    │  │  Document Service (Walrus Integration)           │ │
    │  │  • Seal encryption/decryption                    │ │
    │  │  • Walrus upload/download                        │ │
    │  │  • Nautilus contract interaction                 │ │
    │  │  • Access control                                │ │
    │  └──────────────────────────────────────────────────┘ │
    │                                                         │
    │  ┌──────────────────────────────────────────────────┐ │
    │  │  Database (PostgreSQL)                           │ │
    │  │  • User profiles                                 │ │
    │  │  • Swap history                                  │ │
    │  │  • Payment receipts                              │ │
    │  │  • Document metadata                             │ │
    │  └──────────────────────────────────────────────────┘ │
    └─────────────────────────────────────────────────────────┘
             │                  │                  │
    ┌────────▼────────┐  ┌─────▼──────┐  ┌───────▼────────┐
    │ NEAR Protocol   │  │  Starknet  │  │ Aztec Network  │
    │                 │  │  (Sepolia) │  │   (Testnet)    │
    │  Contracts:     │  │            │  │                │
    │  • AtomicSwap   │  │ Contracts: │  │  Contracts:    │
    │  • Escrow       │  │ • AtomicSwap│  │  • PrivateSwap │
    │                 │  │ • X402Pay  │  │  • PrivateBridge│
    └─────────────────┘  └────────────┘  └────────────────┘
```

### Technology Stack

#### Frontend
```json
{
  "framework": "React 18+",
  "language": "TypeScript",
  "build": "Vite",
  "styling": "TailwindCSS",
  "state": "Zustand",
  "wallet-integration": {
    "near": "near-api-js",
    "starknet": "get-starknet + starknet.js",
    "aztec": "aztec.js"
  },
  "web3-libraries": {
    "near": "@near-wallet-selector/core",
    "starknet": "@argent/get-starknet",
    "aztec": "@aztec/aztec.js"
  }
}
```

#### Backend
```json
{
  "framework": "NestJS (TypeScript)",
  "runtime": "Node.js 18+",
  "blockchain-sdks": {
    "near": "near-api-js",
    "starknet": "starknet.js",
    "aztec": "@aztec/aztec.js"
  },
  "database": "PostgreSQL 15+ with TypeORM",
  "cache": "Redis",
  "queue": "Bull (Redis-based queue)",
  "encryption": "crypto-js",
  "hashing": {
    "sha256": "crypto.createHash",
    "poseidon": "starknet.js poseidon hash",
    "pedersen": "@aztec/aztec.js pedersen"
  },
  "architecture": "Microservices with event-driven design"
}
```

#### Smart Contracts
```json
{
  "near": {
    "language": "Rust",
    "framework": "near-sdk-rs",
    "test": "cargo test"
  },
  "starknet": {
    "language": "Cairo 2.x",
    "framework": "Scarb",
    "libraries": "OpenZeppelin Cairo Contracts",
    "test": "snforge"
  },
  "aztec": {
    "language": "Noir",
    "framework": "Aztec.nr",
    "test": "aztec test"
  }
}
```

---

## 5. SMART CONTRACTS SPECIFICATION

### NEAR Contracts (Rust)

#### Contract 1: AtomicSwap

**Purpose:** Enable cross-chain atomic swaps with hash compatibility.

**Key Features:**
- Support for SHA256 and Poseidon hash algorithms
- Cross-chain swap linking via `counterparty_swap_id`
- Oracle-assisted completion for Poseidon verification
- Fee mechanism (0.3% default)
- Time-lock protection (1-24 hours)

**Storage:**
```rust
pub struct AtomicSwap {
    pub swap_id: String,
    pub initiator: AccountId,
    pub participant: AccountId,
    pub amount: Balance,
    pub hash_lock: String,
    pub time_lock: u64,
    pub status: SwapStatus,  // Initiated, Locked, Completed, Refunded
    pub secret: Option<String>,
    pub target_chain: String,  // "starknet", "aztec"
    pub target_address: String,
    pub hash_algorithm: HashAlgorithm,  // SHA256 | Poseidon
    pub counterparty_swap_id: Option<String>,
    pub created_at: u64,
}
```

**Key Functions:**
```rust
#[payable]
pub fn initiate_cross_chain_swap(
    &mut self,
    swap_id: String,
    participant: AccountId,
    hash_lock: String,
    time_lock_duration: u64,
    target_chain: String,
    target_address: String,
    hash_algorithm: HashAlgorithm,
    counterparty_swap_id: Option<String>,
) -> AtomicSwap;

pub fn complete_swap(
    &mut self,
    swap_id: String,
    secret: String
) -> Promise;

pub fn complete_swap_with_oracle_verification(
    &mut self,
    swap_id: String,
    secret: String,
    oracle_signature: String,
) -> Promise;

pub fn refund_swap(
    &mut self,
    swap_id: String
) -> Promise;

pub fn get_swap(&self, swap_id: String) -> Option<AtomicSwap>;
```

**Events:**
```rust
// Emitted when swap is initiated
SwapInitiated {
    swap_id: String,
    initiator: AccountId,
    participant: AccountId,
    amount: Balance,
    hash_lock: String,
    time_lock: u64,
    target_chain: String,
    hash_algorithm: HashAlgorithm,
}

// Emitted when swap is completed
SwapCompleted {
    swap_id: String,
    secret: String,
    completed_by: AccountId,
}

// Emitted when swap is refunded
SwapRefunded {
    swap_id: String,
    refunded_to: AccountId,
    amount: Balance,
}
```

#### Contract 2: Escrow (Cross-Chain)

**Purpose:** Hold funds in escrow with cross-chain proof verification.

**Key Features:**
- Time-locked escrow
- Cross-chain proof submission and verification
- Trusted verifier system
- Dispute resolution with arbiter
- Metadata storage for additional context

**Storage:**
```rust
pub struct Escrow {
    pub escrow_id: String,
    pub depositor: AccountId,
    pub beneficiary: AccountId,
    pub amount: Balance,
    pub release_time: u64,
    pub status: EscrowStatus,  // Active, Completed, Disputed, Refunded
    pub cross_chain_proof: Option<CrossChainProof>,
    pub arbiter: Option<AccountId>,
    pub created_at: u64,
    pub metadata: String,  // JSON
}

pub struct CrossChainProof {
    pub chain_id: String,
    pub tx_hash: String,
    pub block_number: u64,
    pub proof_data: String,
    pub verified: bool,
    pub verified_at: Option<u64>,
}
```

**Key Functions:**
```rust
#[payable]
pub fn create_escrow(
    &mut self,
    escrow_id: String,
    beneficiary: AccountId,
    release_time: u64,
    arbiter: Option<AccountId>,
    metadata: String,
) -> Escrow;

pub fn submit_cross_chain_proof(
    &mut self,
    escrow_id: String,
    chain_id: String,
    tx_hash: String,
    block_number: u64,
    proof_data: String,
);

pub fn verify_proof(&mut self, escrow_id: String);

pub fn release_funds(&mut self, escrow_id: String) -> Promise;

pub fn refund_escrow(&mut self, escrow_id: String) -> Promise;

pub fn raise_dispute(&mut self, escrow_id: String);
```

### Starknet Contracts (Cairo)

#### Contract 1: AtomicSwap with ERC20

**Purpose:** HTLC atomic swap with full ERC20 token integration.

**Key Features:**
- Poseidon hash verification
- ERC20 token locking/unlocking
- Fee mechanism with fee recipient
- Cross-chain metadata (target_chain, target_swap_id)
- Event emission for backend monitoring

**Storage:**
```cairo
#[storage]
struct Storage {
    swaps: Map<felt252, SwapDetails>,
    owner: ContractAddress,
    fee_percentage: u256,  // Basis points (100 = 1%)
    fee_recipient: ContractAddress,
}

#[derive(Drop, Serde, starknet::Store)]
struct SwapDetails {
    initiator: ContractAddress,
    recipient: ContractAddress,
    amount: u256,
    token_address: ContractAddress,
    hash_lock: felt252,
    time_lock: u64,
    status: SwapStatus,  // Empty, Active, Completed, Refunded
    target_chain: felt252,
    target_swap_id: felt252,
    secret: felt252,
}
```

**Key Functions:**
```cairo
fn initiate_swap(
    ref self: ContractState,
    swap_id: felt252,
    recipient: ContractAddress,
    hash_lock: felt252,
    time_lock: u64,
    amount: u256,
    token_address: ContractAddress,
    target_chain: felt252,
    target_swap_id: felt252,
);

fn complete_swap(
    ref self: ContractState,
    swap_id: felt252,
    secret: felt252
);

fn refund_swap(
    ref self: ContractState,
    swap_id: felt252
);

fn get_swap_details(
    self: @ContractState,
    swap_id: felt252
) -> SwapDetails;
```

**Events:**
```cairo
#[derive(Drop, starknet::Event)]
struct SwapInitiated {
    #[key]
    swap_id: felt252,
    initiator: ContractAddress,
    recipient: ContractAddress,
    amount: u256,
    token_address: ContractAddress,
    time_lock: u64,
    target_chain: felt252,
}

#[derive(Drop, starknet::Event)]
struct SwapCompleted {
    #[key]
    swap_id: felt252,
    recipient: ContractAddress,
    secret: felt252,
}

#[derive(Drop, starknet::Event)]
struct SwapRefunded {
    #[key]
    swap_id: felt252,
    initiator: ContractAddress,
}
```

#### Contract 2: X402 Payment Verifier

**Purpose:** Verify and track X402 micropayments on Starknet.

**Key Features:**
- Payment recording on-chain
- Backend verification of payments
- ERC20 token support
- Payment receipt generation

**Storage:**
```cairo
#[storage]
struct Storage {
    payments: Map<felt252, PaymentRecord>,
    nonces: Map<ContractAddress, u256>,
    backend_address: ContractAddress,
    owner: ContractAddress,
}

#[derive(Drop, Serde, starknet::Store)]
struct PaymentRecord {
    payment_id: felt252,
    payer: ContractAddress,
    recipient: ContractAddress,
    amount: u256,
    token: ContractAddress,
    resource: felt252,
    timestamp: u64,
    verified: bool,
}
```

**Key Functions:**
```cairo
fn make_payment(
    ref self: ContractState,
    payment_id: felt252,
    recipient: ContractAddress,
    amount: u256,
    token: ContractAddress,
    resource: felt252,
);

fn verify_payment(
    ref self: ContractState,
    payment_id: felt252
) -> bool;

fn get_payment_record(
    self: @ContractState,
    payment_id: felt252
) -> PaymentRecord;
```

#### Contract 3: Bridge Connector

**Purpose:** Cross-chain bridge coordination with proof verification.

**Storage:**
```cairo
#[storage]
struct Storage {
    transfers: Map<felt252, TransferDetails>,
    registered_bridges: Map<felt252, felt252>,
    bridge_registered: Map<felt252, bool>,
    owner: ContractAddress,
}

#[derive(Drop, Serde, starknet::Store)]
struct TransferDetails {
    sender: ContractAddress,
    amount: u256,
    destination_chain: felt252,
    recipient: felt252,
    status: TransferStatus,  // Empty, Locked, Unlocked, Reverted
    timestamp: u64,
}
```

### Aztec Contracts (Noir)

#### Contract 1: Private Atomic Swap

**Purpose:** Fully private atomic swaps with encrypted state.

**Key Features:**
- Private notes for swap storage
- Pedersen hash verification
- Encrypted amounts and parties
- Hybrid public/private state for cross-chain coordination

**Storage:**
```noir
struct SwapNote {
    swap_id: Field,
    initiator: AztecAddress,
    recipient: AztecAddress,
    amount: Field,  // Encrypted
    hash_lock: Field,
    time_lock: u64,
    status: u8,
    target_chain: Field,
    secret: Field,
    header: NoteHeader,
}

struct Storage {
    private_swaps: PrivateSet<SwapNote>,
    public_swap_commitments: Map<Field, PublicMutable<Field>>,
}
```

**Key Functions:**
```noir
#[aztec(private)]
fn initiate_private_swap(
    swap_id: Field,
    recipient: AztecAddress,
    hash_lock: Field,
    time_lock: u64,
    amount: Field,
    target_chain: Field,
);

#[aztec(private)]
fn complete_private_swap(
    swap_id: Field,
    secret: Field,
);

#[aztec(private)]
fn refund_private_swap(
    swap_id: Field
);

#[aztec(public)]
fn register_swap_commitment(
    swap_id: Field,
    commitment: Field,
);
```

---

## 6. BACKEND SERVICES

### Service 1: Hash Compatibility Oracle

**File:** `backend/services/hash_oracle.py`

**Purpose:** Compute hashes for all supported chains from a single secret.

**Implementation:**
```python
from starknet_py.hash.poseidon import poseidon_hash_many
import hashlib
from typing import Dict

class HashOracle:
    """
    Computes hashes for cross-chain atomic swaps
    """
    
    def compute_all_hashes(self, secret: str) -> Dict[str, str]:
        """
        Compute hashes for all chains
        
        Args:
            secret: Original secret string
            
        Returns:
            Dict with 'sha256', 'poseidon', 'pedersen' keys
        """
        return {
            'sha256': self.compute_sha256(secret),
            'poseidon': str(self.compute_poseidon(secret)),
            'pedersen': str(self.compute_pedersen(secret))
        }
    
    def compute_sha256(self, secret: str) -> str:
        """For NEAR - 64 hex characters"""
        return hashlib.sha256(secret.encode()).hexdigest()
    
    def compute_poseidon(self, secret: str) -> int:
        """For Starknet - felt252"""
        # Convert string to felt252
        secret_bytes = secret.encode()
        secret_felt = int.from_bytes(secret_bytes, 'big') % (2**251 + 17 * 2**192 + 1)
        
        # Compute Poseidon hash
        return poseidon_hash_many([secret_felt])
    
    def compute_pedersen(self, secret: str) -> int:
        """For Aztec - Field element"""
        # Pedersen hash (simplified - actual implementation needs Aztec SDK)
        # For now, use Poseidon as placeholder
        return self.compute_poseidon(secret)
    
    def verify_secret(
        self,
        secret: str,
        hash_lock: str,
        algorithm: str
    ) -> bool:
        """
        Verify that secret matches hash lock
        
        Args:
            secret: Secret to verify
            hash_lock: Expected hash
            algorithm: 'sha256' | 'poseidon' | 'pedersen'
        
        Returns:
            True if secret is valid
        """
        if algorithm == 'sha256':
            return self.compute_sha256(secret) == hash_lock
        elif algorithm == 'poseidon':
            return str(self.compute_poseidon(secret)) == hash_lock
        elif algorithm == 'pedersen':
            return str(self.compute_pedersen(secret)) == hash_lock
        return False

# Usage
oracle = HashOracle()
secret = "mysecret123"
hashes = oracle.compute_all_hashes(secret)

# hashes = {
#     'sha256': 'abc123...',  # For NEAR
#     'poseidon': '12345...',  # For Starknet
#     'pedersen': '67890...'   # For Aztec
# }
```

### Service 2: Cross-Chain Event Monitor

**File:** `backend/services/event_monitor.py`

**Purpose:** Listen to events from all chains and trigger actions.

**Implementation:**
```python
import asyncio
from typing import Callable, Dict, List
from starknet_py.net.full_node_client import FullNodeClient
from starknet_py.contract import Contract
import aiohttp

class CrossChainEventMonitor:
    """
    Monitors events across NEAR, Starknet, and Aztec
    """
    
    def __init__(self):
        # Initialize chain clients
        self.near_rpc = "https://rpc.testnet.near.org"
        self.starknet_client = FullNodeClient(
            node_url="https://rpc.nethermind.io/sepolia-juno/"
        )
        self.aztec_rpc = "https://aztec-testnet.rpc.url"
        
        # Event handlers
        self.handlers: Dict[str, List[Callable]] = {
            'near': [],
            'starknet': [],
            'aztec': []
        }
        
        # Last processed block
        self.last_blocks = {
            'near': 0,
            'starknet': 0,
            'aztec': 0
        }
    
    def register_handler(self, chain: str, handler: Callable):
        """Register event handler for a chain"""
        self.handlers[chain].append(handler)
    
    async def monitor_near_events(self):
        """Monitor NEAR blockchain for swap events"""
        while True:
            try:
                async with aiohttp.ClientSession() as session:
                    # Get latest block
                    async with session.post(
                        self.near_rpc,
                        json={
                            "jsonrpc": "2.0",
                            "id": "dontcare",
                            "method": "block",
                            "params": {"finality": "final"}
                        }
                    ) as response:
                        block_data = await response.json()
                        current_block = block_data['result']['header']['height']
                    
                    # Process new blocks
                    if current_block > self.last_blocks['near']:
                        for block_height in range(
                            self.last_blocks['near'] + 1,
                            current_block + 1
                        ):
                            await self.process_near_block(block_height)
                        
                        self.last_blocks['near'] = current_block
                
                await asyncio.sleep(2)  # Poll every 2 seconds
                
            except Exception as e:
                print(f"NEAR event monitor error: {e}")
                await asyncio.sleep(5)
    
    async def process_near_block(self, block_height: int):
        """Process NEAR block for swap events"""
        # Fetch block data
        # Parse transaction logs
        # Extract swap events
        # Call registered handlers
        pass
    
    async def monitor_starknet_events(self):
        """Monitor Starknet for swap events"""
        while True:
            try:
                # Get latest block
                block = await self.starknet_client.get_block('latest')
                current_block = block.block_number
                
                # Process new blocks
                if current_block > self.last_blocks['starknet']:
                    for block_num in range(
                        self.last_blocks['starknet'] + 1,
                        current_block + 1
                    ):
                        await self.process_starknet_block(block_num)
                    
                    self.last_blocks['starknet'] = current_block
                
                await asyncio.sleep(5)  # Poll every 5 seconds
                
            except Exception as e:
                print(f"Starknet event monitor error: {e}")
                await asyncio.sleep(10)
    
    async def process_starknet_block(self, block_num: int):
        """Process Starknet block for events"""
        # Get events from AtomicSwap contract
        # Parse SwapInitiated, SwapCompleted events
        # Call handlers
        pass
    
    async def start(self):
        """Start monitoring all chains"""
        await asyncio.gather(
            self.monitor_near_events(),
            self.monitor_starknet_events(),
            # self.monitor_aztec_events(),  # Add when Aztec SDK ready
        )

# Usage
monitor = CrossChainEventMonitor()

async def handle_near_swap_initiated(event):
    print(f"NEAR swap initiated: {event}")
    # Trigger counterparty swap on Starknet

monitor.register_handler('near', handle_near_swap_initiated)

# Start monitoring
asyncio.run(monitor.start())
```

### Service 3: Atomic Swap Coordinator

**File:** `backend/services/swap_coordinator.py`

**Purpose:** Coordinate cross-chain atomic swaps.

**Implementation:**
```python
from typing import Optional
import secrets
from .hash_oracle import HashOracle
from .event_monitor import CrossChainEventMonitor

class SwapCoordinator:
    """
    Coordinates atomic swaps between chains
    """
    
    def __init__(self):
        self.hash_oracle = HashOracle()
        self.event_monitor = CrossChainEventMonitor()
        
        # Register event handlers
        self.event_monitor.register_handler(
            'near',
            self.on_near_swap_initiated
        )
        self.event_monitor.register_handler(
            'starknet',
            self.on_starknet_swap_completed
        )
    
    async def initiate_cross_chain_swap(
        self,
        user_address: dict,
        source_chain: str,
        dest_chain: str,
        amount: int,
        token: Optional[str] = None
    ) -> dict:
        """
        Initiate cross-chain atomic swap
        
        Args:
            user_address: {'near': '...', 'starknet': '...', 'aztec': '...'}
            source_chain: 'near' | 'starknet' | 'aztec'
            dest_chain: 'near' | 'starknet' | 'aztec'
            amount: Amount to swap
            token: Token address (for ERC20 on Starknet)
        
        Returns:
            {
                'swap_id': '...',
                'secret': '...',
                'hashes': {...}
            }
        """
        # Generate secret
        secret = secrets.token_hex(32)
        
        # Compute hashes for all chains
        hashes = self.hash_oracle.compute_all_hashes(secret)
        
        # Generate swap IDs
        source_swap_id = f"{source_chain}_{secrets.token_hex(16)}"
        dest_swap_id = f"{dest_chain}_{secrets.token_hex(16)}"
        
        # Prepare response
        response = {
            'source_swap_id': source_swap_id,
            'dest_swap_id': dest_swap_id,
            'secret': secret,  # User will use this
            'hashes': hashes,
            'source_hash': hashes[self.get_hash_algo(source_chain)],
            'dest_hash': hashes[self.get_hash_algo(dest_chain)],
        }
        
        # Store swap in database
        await self.store_swap_metadata(response)
        
        return response
    
    async def on_near_swap_initiated(self, event: dict):
        """
        Handler for NEAR SwapInitiated event
        
        Automatically creates counterparty swap on destination chain
        """
        swap_id = event['swap_id']
        target_chain = event['target_chain']
        target_swap_id = event.get('counterparty_swap_id')
        
        # Get swap metadata from database
        metadata = await self.get_swap_metadata(swap_id)
        
        if target_chain == 'starknet':
            # Initiate swap on Starknet
            await self.initiate_starknet_swap(
                swap_id=target_swap_id,
                hash_lock=metadata['dest_hash'],
                amount=metadata['dest_amount'],
                token=metadata['dest_token'],
                recipient=metadata['user_address']['starknet']
            )
    
    async def on_starknet_swap_completed(self, event: dict):
        """
        Handler for Starknet SwapCompleted event
        
        Automatically completes corresponding NEAR swap
        """
        swap_id = event['swap_id']
        secret = event['secret']  # Secret is revealed!
        
        # Get linked NEAR swap
        metadata = await self.get_swap_metadata(swap_id)
        near_swap_id = metadata['source_swap_id']
        
        # Complete NEAR swap using revealed secret
        await self.complete_near_swap(
            swap_id=near_swap_id,
            secret=secret
        )
    
    def get_hash_algo(self, chain: str) -> str:
        """Get hash algorithm for chain"""
        algo_map = {
            'near': 'sha256',
            'starknet': 'poseidon',
            'aztec': 'pedersen'
        }
        return algo_map[chain]
```

### Service 4: X402 Payment Middleware

**File:** `backend/middleware/x402_handler.py`

**Purpose:** Handle HTTP 402 responses and payment verification.

**Implementation:**
```python
from fastapi import Request, Response
from typing import Optional, Callable
import json
import base64
from functools import wraps

class X402Middleware:
    """
    FastAPI middleware for X402 payment protocol
    """
    
    def __init__(
        self,
        payment_contract_address: str,
        recipient_address: str,
        starknet_client
    ):
        self.payment_contract = payment_contract_address
        self.recipient = recipient_address
        self.starknet_client = starknet_client
        
        # Route configurations
        self.routes_config = {}
    
    def require_payment(
        self,
        route: str,
        amount: int,
        token: str,
        description: str = ""
    ):
        """
        Decorator to protect routes with payment requirement
        
        Usage:
            @app.get("/api/premium")
            @x402.require_payment(
                route="/api/premium",
                amount=100000,  # 0.1 STRK
                token="0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
                description="Premium analytics"
            )
            async def get_premium_data():
                return {"data": "..."}
        """
        self.routes_config[route] = {
            "amount": amount,
            "token": token,
            "description": description
        }
        
        def decorator(func: Callable):
            @wraps(func)
            async def wrapper(request: Request, *args, **kwargs):
                x_payment = request.headers.get("X-PAYMENT")
                
                if not x_payment:
                    # Return 402 Payment Required
                    return self._create_402_response(route)
                
                # Verify payment
                is_valid = await self._verify_payment(x_payment, route)
                
                if not is_valid:
                    return Response(
                        content=json.dumps({"error": "Invalid payment"}),
                        status_code=402,
                        media_type="application/json"
                    )
                
                # Payment verified, execute handler
                result = await func(request, *args, **kwargs)
                
                # Add payment receipt to response
                if isinstance(result, Response):
                    result.headers["X-PAYMENT-RESPONSE"] = "verified"
                
                return result
            return wrapper
        return decorator
    
    def _create_402_response(self, route: str) -> Response:
        """Create 402 Payment Required response"""
        config = self.routes_config[route]
        
        payment_requirements = {
            "x402Version": 1,
            "accepts": [{
                "scheme": "exact",
                "network": "starknet-sepolia",
                "maxAmountRequired": str(config["amount"]),
                "resource": route,
                "description": config["description"],
                "payTo": self.recipient,
                "maxTimeoutSeconds": 60,
                "asset": config["token"],
            }]
        }
        
        return Response(
            content=json.dumps(payment_requirements),
            status_code=402,
            media_type="application/json",
            headers={"Content-Type": "application/json"}
        )
    
    async def _verify_payment(
        self,
        x_payment: str,
        route: str
    ) -> bool:
        """Verify payment on-chain"""
        try:
            # Decode X-PAYMENT header
            payload = json.loads(base64.b64decode(x_payment))
            payment_id = payload.get("payment_id")
            tx_hash = payload.get("tx_hash")
            
            # Verify on-chain
            # 1. Check transaction exists
            # 2. Check payment amount matches
            # 3. Check recipient matches
            # 4. Check payment not already used
            
            # For now, simplified check
            return await self._check_tx_on_chain(tx_hash, route)
            
        except Exception as e:
            print(f"Payment verification error: {e}")
            return False
    
    async def _check_tx_on_chain(
        self,
        tx_hash: str,
        route: str
    ) -> bool:
        """Check if transaction is valid on Starknet"""
        try:
            # Get transaction receipt
            receipt = await self.starknet_client.get_transaction_receipt(tx_hash)
            
            # Verify transaction succeeded
            if receipt.execution_status != "SUCCEEDED":
                return False
            
            # Parse events to find PaymentMade event
            # Verify amount, recipient, resource match
            
            return True
            
        except Exception as e:
            print(f"On-chain verification error: {e}")
            return False

# Usage in FastAPI
from fastapi import FastAPI

app = FastAPI()

x402 = X402Middleware(
    payment_contract_address="0x...",
    recipient_address="0x...",
    starknet_client=starknet_client
)

@app.get("/api/premium/analytics")
@x402.require_payment(
    route="/api/premium/analytics",
    amount=100000,  # 0.1 STRK
    token="0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    description="Advanced wallet analytics"
)
async def get_premium_analytics(request: Request):
    return {
        "data": {
            "total_swaps": 42,
            "total_volume": "1000000",
            "best_rates": {...}
        }
    }
```

---

## 7. FRONTEND APPLICATION

### Component Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── WalletDashboard.tsx          # Main dashboard
│   │   ├── SwapInterface.tsx            # Swap UI
│   │   ├── PrivacyControls.tsx          # Privacy settings
│   │   ├── DocumentManager.tsx          # Document upload/verify
│   │   ├── X402PaymentModal.tsx         # Payment UI
│   │   └── TransactionHistory.tsx       # TX history
│   ├── hooks/
│   │   ├── useNear.ts                   # NEAR wallet integration
│   │   ├── useStarknet.ts               # Starknet wallet integration
│   │   ├── useAztec.ts                  # Aztec wallet integration
│   │   └── useX402.ts                   # X402 payment handling
│   ├── services/
│   │   ├── api.ts                       # Backend API client
│   │   ├── swap.ts                      # Swap service
│   │   └── document.ts                  # Document service
│   ├── types/
│   │   └── index.ts                     # TypeScript types
│   └── App.tsx                          # Main app
```

### Key Components

#### 1. Swap Interface Component

**File:** `frontend/src/components/SwapInterface.tsx`

```typescript
import React, { useState } from 'react';
import { useNear } from '@/hooks/useNear';
import { useStarknet } from '@/hooks/useStarknet';
import { useAztec } from '@/hooks/useAztec';
import { initiateSwap } from '@/services/swap';

type Chain = 'near' | 'starknet' | 'aztec';

export function SwapInterface() {
  const [sourceChain, setSourceChain] = useState<Chain>('near');
  const [destChain, setDestChain] = useState<Chain>('starknet');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { wallet: nearWallet, initiateSwap: initiateNearSwap } = useNear();
  const { account: starknetAccount, initiateSwap: initiateStarknetSwap } = useStarknet();
  const { account: aztecAccount } = useAztec();
  
  const handleSwap = async () => {
    setLoading(true);
    
    try {
      // 1. Call backend to generate swap metadata
      const swapData = await initiateSwap({
        sourceChain,
        destChain,
        amount: parseAmount(amount),
        userAddress: {
          near: nearWallet?.accountId,
          starknet: starknetAccount?.address,
          aztec: aztecAccount?.address
        }
      });
      
      // 2. User initiates swap on source chain
      if (sourceChain === 'near') {
        await initiateNearSwap({
          swap_id: swapData.source_swap_id,
          hash_lock: swapData.source_hash,
          amount,
          target_chain: destChain,
          counterparty_swap_id: swapData.dest_swap_id
        });
      } else if (sourceChain === 'starknet') {
        await initiateStarknetSwap({
          swap_id: swapData.source_swap_id,
          hash_lock: swapData.source_hash,
          amount,
          target_chain: destChain
        });
      }
      
      // 3. Backend will monitor and complete
      alert('Swap initiated! Backend will coordinate the rest.');
      
    } catch (error) {
      console.error('Swap error:', error);
      alert('Swap failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="swap-interface p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Cross-Chain Swap</h2>
      
      {/* Source Chain Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">From</label>
        <select
          value={sourceChain}
          onChange={(e) => setSourceChain(e.target.value as Chain)}
          className="w-full p-2 border rounded"
        >
          <option value="near">NEAR Protocol</option>
          <option value="starknet">Starknet</option>
          <option value="aztec">Aztec (Private)</option>
        </select>
      </div>
      
      {/* Amount Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Amount</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="0.00"
        />
      </div>
      
      {/* Destination Chain Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">To</label>
        <select
          value={destChain}
          onChange={(e) => setDestChain(e.target.value as Chain)}
          className="w-full p-2 border rounded"
        >
          <option value="near">NEAR Protocol</option>
          <option value="starknet">Starknet</option>
          <option value="aztec">Aztec (Private)</option>
        </select>
      </div>
      
      {/* Swap Button */}
      <button
        onClick={handleSwap}
        disabled={loading || !amount}
        className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? 'Processing...' : 'Execute Swap'}
      </button>
      
      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 rounded">
        <p className="text-sm text-blue-800">
          ⚡ Trustless atomic swap • No intermediaries • 0.3% fee
        </p>
      </div>
    </div>
  );
}
```

#### 2. X402 Payment Hook

**File:** `frontend/src/hooks/useX402.ts`

```typescript
import { useState } from 'react';
import { useStarknet } from './useStarknet';

export function useX402() {
  const { account, signMessage } = useStarknet();
  const [loading, setLoading] = useState(false);
  
  const fetchWithPayment = async (
    url: string,
    options?: RequestInit
  ): Promise<Response> => {
    setLoading(true);
    
    try {
      // 1. First request - may return 402
      let response = await fetch(url, options);
      
      if (response.status !== 402) {
        return response;
      }
      
      // 2. Parse payment requirements
      const paymentReqs = await response.json();
      const requirement = paymentReqs.accepts[0];
      
      // 3. Show payment modal to user
      const userApproved = await showPaymentModal(requirement);
      
      if (!userApproved) {
        throw new Error('Payment cancelled');
      }
      
      // 4. Make payment on-chain
      const paymentData = await makePayment(requirement);
      
      // 5. Retry with X-PAYMENT header
      response = await fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          'X-PAYMENT': btoa(JSON.stringify(paymentData))
        }
      });
      
      return response;
      
    } finally {
      setLoading(false);
    }
  };
  
  const makePayment = async (requirement: any) => {
    // Generate payment ID
    const paymentId = generatePaymentId();
    
    // Call X402 payment contract
    const tx = await account.execute({
      contractAddress: X402_PAYMENT_CONTRACT,
      entrypoint: 'make_payment',
      calldata: [
        paymentId,
        requirement.payTo,
        requirement.maxAmountRequired,
        requirement.asset,
        requirement.resource
      ]
    });
    
    // Wait for transaction
    await account.waitForTransaction(tx.transaction_hash);
    
    return {
      payment_id: paymentId,
      tx_hash: tx.transaction_hash,
      amount: requirement.maxAmountRequired,
      resource: requirement.resource
    };
  };
  
  return {
    fetchWithPayment,
    loading
  };
}
```

---

## 8. INTEGRATION FLOWS

### Flow 1: NEAR → Starknet Atomic Swap

```
┌──────────┐                                              
│   User   │                                              
└────┬─────┘                                              
     │                                                     
     │ 1. Connect wallets (NEAR + Starknet)              
     │                                                     
     ▼                                                     
┌──────────────────┐                                      
│  Frontend UI     │                                      
└────┬─────────────┘                                      
     │                                                     
     │ 2. Initiate swap: 100 NEAR → 1000 STRK           
     │                                                     
     ▼                                                     
┌──────────────────────────────────────────────────────┐
│  Python Backend                                       │
│                                                        │
│  3. Generate secret = "mysecret123"                   │
│  4. Compute hashes:                                   │
│     • SHA256(secret) = "abc123..."                    │
│     • Poseidon(secret) = "0x456..."                   │
│                                                        │
│  5. Return to user:                                   │
│     {                                                  │
│       source_swap_id: "near_swap_001",                │
│       dest_swap_id: "strk_swap_001",                  │
│       source_hash: "abc123...",  // SHA256            │
│       dest_hash: "0x456...",     // Poseidon          │
│       secret: "mysecret123"                           │
│     }                                                  │
└──────────┬───────────────────────────────────────────┘
           │                                              
           │ 6. User initiates on NEAR                   
           │                                              
           ▼                                              
┌──────────────────┐                                     
│  NEAR Contract   │                                     
│  initiate_swap(  │                                     
│    swap_id: "near_swap_001",                          │
│    hash_lock: "abc123...",  // SHA256                 │
│    amount: 100 NEAR,                                  │
│    target_chain: "starknet",                          │
│    counterparty: "strk_swap_001"                      │
│  )               │                                     
│                  │                                     
│  ✅ 100 NEAR locked                                   │
│  Event: SwapInitiated                                 │
└──────────┬───────┘                                     
           │                                              
           │ 7. Backend detects event                    
           │                                              
           ▼                                              
┌──────────────────────────────────────────────────────┐
│  Python Backend Event Monitor                         │
│                                                        │
│  Detected: SwapInitiated on NEAR                      │
│  swap_id: "near_swap_001"                             │
│  target_chain: "starknet"                             │
│                                                        │
│  8. Auto-initiate counterparty swap on Starknet      │
└──────────┬───────────────────────────────────────────┘
           │                                              
           │ 9. Backend calls Starknet                   
           │                                              
           ▼                                              
┌──────────────────┐                                     
│ Starknet Contract│                                     
│  initiate_swap(  │                                     
│    swap_id: "strk_swap_001",                          │
│    hash_lock: "0x456...",  // Poseidon!               │
│    amount: 1000 STRK,                                 │
│    token: STRK_ADDRESS,                               │
│    target_chain: "near",                              │
│    target_swap_id: "near_swap_001"                    │
│  )               │                                     
│                  │                                     
│  ✅ 1000 STRK locked                                  │
│  Event: SwapInitiated                                 │
└──────────┬───────┘                                     
           │                                              
           │ 10. User completes Starknet side            
           │     (reveals secret)                        
           │                                              
           ▼                                              
┌──────────────────┐                                     
│ Starknet Contract│                                     
│  complete_swap(  │                                     
│    swap_id: "strk_swap_001",                          │
│    secret: "mysecret123"                              │
│  )               │                                     
│                  │                                     
│  Verify: Poseidon("mysecret123") == "0x456..." ✅     │
│  Transfer 1000 STRK to user ✅                        │
│  Event: SwapCompleted(secret="mysecret123")           │
└──────────┬───────┘                                     
           │                                              
           │ 11. Backend detects completion              
           │     (secret revealed!)                      
           │                                              
           ▼                                              
┌──────────────────────────────────────────────────────┐
│  Python Backend Event Monitor                         │
│                                                        │
│  Detected: SwapCompleted on Starknet                  │
│  secret: "mysecret123" (REVEALED!)                    │
│                                                        │
│  12. Auto-complete NEAR swap with revealed secret     │
└──────────┬───────────────────────────────────────────┘
           │                                              
           │ 13. Backend calls NEAR                      
           │                                              
           ▼                                              
┌──────────────────┐                                     
│  NEAR Contract   │                                     
│  complete_swap(  │                                     
│    swap_id: "near_swap_001",                          │
│    secret: "mysecret123"                              │
│  )               │                                     
│                  │                                     
│  Verify: SHA256("mysecret123") == "abc123..." ✅      │
│  Transfer 100 NEAR to counterparty ✅                 │
│  Event: SwapCompleted                                 │
└──────────────────┘                                     
                                                          
✅ ATOMIC SWAP COMPLETE!                                 
User: Gave 100 NEAR, Received 1000 STRK                 
No trust, no intermediary, no custody                    
```

### Flow 2: X402 Premium Feature Payment

```
┌──────────┐                                              
│   User   │                                              
└────┬─────┘                                              
     │                                                     
     │ 1. Click "Premium Analytics" in wallet            
     │                                                     
     ▼                                                     
┌──────────────────┐                                      
│  Frontend UI     │                                      
│                  │                                      
│  fetch('/api/premium/analytics')                       │
└────┬─────────────┘                                      
     │                                                     
     │ 2. API request                                     
     │                                                     
     ▼                                                     
┌──────────────────────────────────────────────────────┐
│  Python Backend (FastAPI)                             │
│                                                        │
│  @x402.require_payment(amount=100000)                 │
│  async def get_premium_analytics():                   │
│      ...                                               │
│                                                        │
│  3. No X-PAYMENT header detected                      │
│  4. Return 402 Payment Required                       │
└──────────┬───────────────────────────────────────────┘
           │                                              
           │ 5. HTTP 402 response                        
           │                                              
           ▼                                              
┌──────────────────────────────────────────────────────┐
│  Frontend receives 402                                │
│                                                        │
│  Response body:                                       │
│  {                                                     │
│    "x402Version": 1,                                  │
│    "accepts": [{                                      │
│      "scheme": "exact",                               │
│      "network": "starknet-sepolia",                   │
│      "maxAmountRequired": "100000",  // 0.1 STRK      │
│      "resource": "/api/premium/analytics",            │
│      "payTo": "0xYourFeeAddress",                     │
│      "asset": "0x...STRK"                             │
│    }]                                                  │
│  }                                                     │
│                                                        │
│  6. Show payment modal to user                        │
└──────────┬───────────────────────────────────────────┘
           │                                              
           │ 7. User approves payment                    
           │                                              
           ▼                                              
┌──────────────────┐                                     
│ X402 Payment     │                                     
│ Contract         │                                     
│ (Starknet)       │                                     
│                  │                                     
│  8. User calls:  │                                     
│  make_payment(   │                                     
│    payment_id: "pay_123",                             │
│    recipient: "0xYourFeeAddress",                     │
│    amount: 100000,                                    │
│    resource: "/api/premium/analytics"                 │
│  )               │                                     
│                  │                                     
│  ✅ 0.1 STRK transferred                              │
│  Event: PaymentMade(payment_id="pay_123")             │
└──────────┬───────┘                                     
           │                                              
           │ 9. Transaction confirmed                    
           │                                              
           ▼                                              
┌──────────────────┐                                     
│  Frontend        │                                     
│                  │                                     
│  10. Retry API with X-PAYMENT header:                 │
│  fetch('/api/premium/analytics', {                    │
│    headers: {                                         │
│      'X-PAYMENT': base64({                            │
│        payment_id: "pay_123",                         │
│        tx_hash: "0xabc...",                           │
│        amount: 100000                                 │
│      })                                               │
│    }                                                   │
│  })                                                    │
└────┬──────────────┘                                    
     │                                                     
     │ 11. API request with payment proof                
     │                                                     
     ▼                                                     
┌──────────────────────────────────────────────────────┐
│  Python Backend                                       │
│                                                        │
│  12. Verify payment on-chain:                         │
│      • Decode X-PAYMENT header                        │
│      • Check tx_hash on Starknet                      │
│      • Verify amount, recipient, resource match       │
│      • Check payment not already used                 │
│                                                        │
│  13. Payment verified ✅                              │
│  14. Execute premium analytics logic                  │
│  15. Return data                                      │
└──────────┬───────────────────────────────────────────┘
           │                                              
           │ 16. HTTP 200 OK                             
           │                                              
           ▼                                              
┌──────────────────┐                                     
│  Frontend UI     │                                     
│                  │                                     
│  17. Display premium analytics                        │
│  ✅ User paid 0.1 STRK                                │
│  ✅ Access granted to premium feature                 │
└──────────────────┘                                     
```

---

## 9. API SPECIFICATIONS

### Backend REST API Endpoints

#### 1. Swap Endpoints

**POST /api/swap/initiate**

Initialize cross-chain atomic swap.

Request:
```json
{
  "source_chain": "near",
  "dest_chain": "starknet",
  "amount": "100000000000000000000000000",  // 100 NEAR in yoctoNEAR
  "user_address": {
    "near": "alice.testnet",
    "starknet": "0x123...",
    "aztec": "0xabc..."
  },
  "token": null  // For NEAR native token
}
```

Response:
```json
{
  "source_swap_id": "near_abc123",
  "dest_swap_id": "strk_def456",
  "secret": "mysecret123",
  "hashes": {
    "sha256": "abc123...",
    "poseidon": "0x456...",
    "pedersen": "0x789..."
  },
  "source_hash": "abc123...",
  "dest_hash": "0x456...",
  "expiry": 1234567890
}
```

**GET /api/swap/{swap_id}**

Get swap status.

Response:
```json
{
  "swap_id": "near_abc123",
  "status": "completed",
  "source_chain": "near",
  "dest_chain": "starknet",
  "amount": "100000000000000000000000000",
  "initiated_at": 1234567800,
  "completed_at": 1234567890,
  "secret_revealed": "mysecret123",
  "tx_hashes": {
    "near_initiate": "0x...",
    "starknet_initiate": "0x...",
    "starknet_complete": "0x...",
    "near_complete": "0x..."
  }
}
```

#### 2. Payment Endpoints (X402)

**GET /api/premium/analytics**

Premium wallet analytics (requires payment).

Headers:
```
X-PAYMENT: <base64-encoded-payment-proof>
```

Response (without payment):
```
HTTP 402 Payment Required

{
  "x402Version": 1,
  "accepts": [{
    "scheme": "exact",
    "network": "starknet-sepolia",
    "maxAmountRequired": "100000",
    "resource": "/api/premium/analytics",
    "description": "Advanced wallet analytics",
    "payTo": "0x...",
    "asset": "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"
  }]
}
```

Response (with valid payment):
```
HTTP 200 OK

{
  "analytics": {
    "total_swaps": 42,
    "total_volume_usd": 125000,
    "best_swap_rate": {...},
    "transaction_history": [...]
  }
}
```

#### 3. Document Endpoints

**POST /api/document/upload**

Upload encrypted document to Walrus.

Request (multipart/form-data):
```
file: <encrypted-file>
whitelisted_addresses: ["0x123...", "0x456..."]
metadata: {"title": "KYC Document", "type": "identity"}
```

Response:
```json
{
  "document_id": "doc_abc123",
  "blob_id": "walrus_xyz789",
  "encryption_keys": {
    "0x123...": "encrypted_key_1",
    "0x456...": "encrypted_key_2"
  },
  "nautilus_tx": "0x..."
}
```

**GET /api/document/{document_id}/verify**

Verify document authenticity (requires payment).

Response:
```json
{
  "document_id": "doc_abc123",
  "verified": true,
  "owner": "0x123...",
  "uploaded_at": 1234567890,
  "integrity_check": "passed",
  "blockchain_proof": "0x..."
}
```

---

## 10. DEPLOYMENT GUIDE

### Prerequisites

- Node.js 18+
- Python 3.11+
- Rust (for NEAR contracts)
- Cairo/Scarb (for Starknet contracts)
- Noir/Aztec CLI (for Aztec contracts)
- PostgreSQL 15+
- Redis

### Step 1: Deploy Smart Contracts (All Testnets)

#### NEAR Contracts (NEAR Testnet)
```bash
cd contracts/near
cargo build --target wasm32-unknown-unknown --release
near deploy --accountId your-account.testnet \
  --wasmFile target/wasm32-unknown-unknown/release/atomic_swap.wasm \
  --networkId testnet
```

#### Starknet Contracts (Sepolia Testnet)
```bash
cd contracts/starknet
scarb build
starkli declare target/dev/atomic_swap.sierra.json \
  --rpc https://rpc.nethermind.io/sepolia-juno/
starkli deploy <class-hash> \
  --rpc https://rpc.nethermind.io/sepolia-juno/
```

#### Aztec Contracts (Aztec Testnet)
```bash
cd contracts/aztec
aztec-cli compile private_atomic_swap.nr
aztec-cli deploy PrivateAtomicSwap \
  --rpc https://aztec-testnet.rpc.url
```

### Step 2: Set Up Backend (NestJS)

```bash
cd backend

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your contract addresses, RPC endpoints, etc.

# Initialize database (TypeORM migrations)
npm run migration:run

# Start Redis
redis-server

# Start backend (development)
npm run start:dev

# Start backend (production)
npm run build
npm run start:prod
```

**Backend Environment Variables (.env):**
```bash
# Network Configuration
NEAR_NETWORK=testnet
NEAR_RPC_URL=https://rpc.testnet.near.org
STARKNET_NETWORK=sepolia
STARKNET_RPC_URL=https://rpc.nethermind.io/sepolia-juno/
AZTEC_RPC_URL=https://aztec-testnet.rpc.url

# Contract Addresses
NEAR_ATOMIC_SWAP_CONTRACT=dev-1234567890-atomic-swap.testnet
STARKNET_ATOMIC_SWAP_CONTRACT=0x...
STARKNET_X402_PAYMENT_CONTRACT=0x...
AZTEC_PRIVATE_SWAP_CONTRACT=0x...

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/x402_wallet
REDIS_URL=redis://localhost:6379

# API Keys (for backend wallet operations)
NEAR_ORACLE_ACCOUNT_ID=oracle.testnet
NEAR_ORACLE_PRIVATE_KEY=ed25519:...
STARKNET_ORACLE_PRIVATE_KEY=0x...

# Security
JWT_SECRET=your-secret-key
```

### Step 3: Set Up Frontend

```bash
cd frontend

# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with API URLs, contract addresses

# Start development server
npm run dev
```

### Step 4: Verify Integration

1. Open wallet in browser: `http://localhost:5173`
2. Connect NEAR wallet (testnet)
3. Connect Starknet wallet (Sepolia)
4. Try initiating a swap
5. Verify backend logs show event detection
6. Confirm swap completes on both chains

---

## CONCLUSION

This master specification provides everything needed to build the X402 Privacy Wallet:

✅ **Project vision and features**
✅ **Complete technical architecture**
✅ **Smart contract specifications for all 3 chains**
✅ **Backend service implementations**
✅ **Frontend component structure**
✅ **Integration flows with diagrams**
✅ **API specifications**
✅ **Deployment instructions**

**Key Differentiators:**
1. First wallet integrating NEAR + Starknet + Aztec
2. Solves hash incompatibility (SHA256 ↔ Poseidon)
3. X402 micropayments for premium features
4. True privacy via Aztec encrypted state
5. Trustless atomic swaps with no custody

**Use this document to:**
- Train Claude Code for code generation
- Brief development team
- Create pitch deck
- Document architecture decisions

---

**Ready to build! 🚀**
# SMART CONTRACTS COMPARISON - NEAR vs STARKNET vs AZTEC
## Complete Guide: Why Each Chain, What Functionality, Contract Details

---

## TABLE OF CONTENTS

1. [Overview - Why These Three Chains?](#overview)
2. [NEAR Protocol Contracts](#near-protocol-contracts)
3. [Starknet Contracts](#starknet-contracts)
4. [Aztec Network Contracts](#aztec-network-contracts)
5. [Cross-Chain Comparison Matrix](#comparison-matrix)
6. [Integration Strategy](#integration-strategy)

---

## OVERVIEW - WHY THESE THREE CHAINS?

### The Problem We're Solving

**Current crypto wallets are either:**
- Fast but NOT private (e.g., Metamask, Phantom)
- Private but NOT scalable (e.g., Zcash wallets)
- Single-chain only (no cross-chain swaps)

**Our Solution: X402 Wallet = Speed + Privacy + Cross-Chain**

### Why Each Chain Was Chosen

```
┌─────────────────────────────────────────────────────────────────┐
│  NEAR Protocol (Testnet)                                         │
│  Role: FAST & CHEAP BASE LAYER                                   │
│                                                                   │
│  ✅ 1-2 second finality                                          │
│  ✅ Low fees (~$0.001 per transaction)                          │
│  ✅ Simple user experience (human-readable accounts)            │
│  ✅ Great for frequent, small transactions                      │
│                                                                   │
│  Use Cases:                                                      │
│  • Frequent swaps (high volume, low value)                      │
│  • User onboarding (cheap gas)                                  │
│  • Escrow for cross-chain coordination                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Starknet (Sepolia Testnet)                                     │
│  Role: ZK-ROLLUP SCALING LAYER                                   │
│                                                                   │
│  ✅ Native Account Abstraction (every account is a contract)    │
│  ✅ Zero-knowledge proofs (cryptographic privacy)               │
│  ✅ Cairo smart contracts (provable computation)                │
│  ✅ Ethereum security (L2 rollup)                               │
│  ✅ X402 payment protocol integration                           │
│                                                                   │
│  Use Cases:                                                      │
│  • Privacy-preserving token transfers                           │
│  • Account abstraction features (session keys, paymaster)       │
│  • X402 micropayments (HTTP 402 protocol)                       │
│  • Bridge to Ethereum ecosystem                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Aztec Network (Testnet)                                         │
│  Role: FULL PRIVACY LAYER                                        │
│                                                                   │
│  ✅ Encrypted state (amounts/parties hidden)                    │
│  ✅ Programmable privacy (Noir language)                        │
│  ✅ Private notes (UTXO-style privacy)                          │
│  ✅ Hybrid public/private execution                             │
│  ✅ Client-side PXE (Private Execution Environment)             │
│                                                                   │
│  Use Cases:                                                      │
│  • Completely private swaps (no amounts visible)                │
│  • Anonymous cross-chain transfers                              │
│  • Privacy-preserving DeFi                                      │
│  • Sensitive transactions (high-value, privacy-critical)        │
└─────────────────────────────────────────────────────────────────┘
```

### Strategic Positioning

| Aspect | NEAR | Starknet | Aztec |
|--------|------|----------|-------|
| **Speed** | ⭐⭐⭐⭐⭐ (1-2s) | ⭐⭐⭐⭐ (10-30s) | ⭐⭐⭐ (varies) |
| **Privacy** | ⭐ (transparent) | ⭐⭐⭐ (ZK proofs) | ⭐⭐⭐⭐⭐ (encrypted) |
| **Cost** | ⭐⭐⭐⭐⭐ (~$0.001) | ⭐⭐⭐⭐ (~$0.01) | ⭐⭐⭐ (higher) |
| **UX** | ⭐⭐⭐⭐⭐ (simple) | ⭐⭐⭐⭐ (AA) | ⭐⭐⭐ (complex) |
| **Ecosystem** | ⭐⭐⭐⭐ (growing) | ⭐⭐⭐⭐ (ETH bridge) | ⭐⭐ (emerging) |

**Our Strategy:**
- Use **NEAR** for everyday transactions (fast & cheap)
- Use **Starknet** for ZK-powered features and Ethereum connectivity
- Use **Aztec** when users need maximum privacy (sensitive trades)

---

## NEAR PROTOCOL CONTRACTS

### Why NEAR?

**1. Fast Finality (1-2 seconds)**
- User initiates swap → confirmed in seconds
- No waiting 10+ minutes like Ethereum

**2. Low Cost**
- Typical transaction: ~0.001 NEAR (~$0.001 USD)
- Perfect for high-frequency, low-value swaps

**3. Human-Readable Accounts**
- `alice.near` instead of `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`
- Better UX for non-crypto users

**4. Simple Development**
- Rust smart contracts (familiar to many devs)
- Well-documented SDK (near-sdk-rs)
- Testnet faucet readily available

### NEAR Contract 1: AtomicSwap

**File:** `near_atomic_swap_improved.rs`

**Purpose:** Enable trustless cross-chain token swaps using HTLCs (Hash Time-Locked Contracts).

#### Key Features

**Feature 1: Multi-Hash Algorithm Support**
```rust
pub enum HashAlgorithm {
    SHA256,      // For NEAR ↔ NEAR or NEAR ↔ EVM chains
    Poseidon,    // For NEAR ↔ Starknet (verified by oracle)
}
```

**Why?** NEAR uses SHA256 natively, but Starknet uses Poseidon hash. We need to support both for cross-chain swaps.

**Feature 2: Cross-Chain Linking**
```rust
pub struct AtomicSwap {
    pub swap_id: String,
    pub counterparty_swap_id: Option<String>,  // Links to Starknet/Aztec swap
    pub target_chain: String,                   // "starknet", "aztec"
    pub target_address: String,                 // Recipient on target chain
    // ...
}
```

**Why?** Backend needs to know which swap on Starknet corresponds to this NEAR swap.

**Feature 3: Oracle-Assisted Verification**
```rust
pub fn complete_swap_with_oracle_verification(
    &mut self,
    swap_id: String,
    secret: String,
    oracle_signature: String,
) -> Promise
```

**Why?** NEAR can't natively verify Poseidon hashes. Oracle (backend) verifies off-chain that `Poseidon(secret) == hash_lock` and signs the result.

**Feature 4: Time-Lock Protection**
```rust
pub min_time_lock: u64,  // 1 hour minimum
pub max_time_lock: u64,  // 24 hours maximum
```

**Why?** Prevents exploits where time-locks are too short (no time to complete) or too long (funds locked forever).

**Feature 5: Fee Mechanism**
```rust
pub fee_percentage: u16,  // 0.3% default (30 basis points)
```

**Why?** Sustain the protocol by charging small fees on swaps.

#### Complete Function List

| Function | Purpose | Who Calls |
|----------|---------|-----------|
| `initiate_cross_chain_swap()` | Lock NEAR tokens, start swap | User (initiator) |
| `complete_swap()` | Reveal secret, claim tokens | User (participant) |
| `complete_swap_with_oracle_verification()` | Complete with Poseidon hash | Backend oracle |
| `refund_swap()` | Get refund after time-lock expires | User (initiator) |
| `get_swap()` | Query swap details | Anyone |
| `get_swaps_by_initiator()` | List user's initiated swaps | Anyone |
| `get_swaps_by_participant()` | List user's participating swaps | Anyone |

#### Storage Breakdown

```rust
pub struct AtomicSwap {
    // Identity
    pub swap_id: String,                    // Unique identifier
    pub initiator: AccountId,               // Who locked funds
    pub participant: AccountId,             // Who will receive funds
    
    // Lock details
    pub amount: Balance,                    // Amount locked (in yoctoNEAR)
    pub hash_lock: String,                  // Hash of secret
    pub time_lock: u64,                     // Expiry timestamp (nanoseconds)
    pub hash_algorithm: HashAlgorithm,      // SHA256 | Poseidon
    
    // Status
    pub status: SwapStatus,                 // Initiated | Completed | Refunded
    pub secret: Option<String>,             // Revealed secret (after completion)
    
    // Cross-chain coordination
    pub target_chain: String,               // "starknet", "aztec"
    pub target_address: String,             // Recipient on target chain
    pub counterparty_swap_id: Option<String>, // Linked swap ID
    
    // Metadata
    pub created_at: u64,                    // Creation timestamp
}
```

#### Events Emitted

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
    secret: String,              // SECRET IS NOW PUBLIC!
    completed_by: AccountId,
}

// Emitted when swap is refunded
SwapRefunded {
    swap_id: String,
    refunded_to: AccountId,
    amount: Balance,
}
```

#### Security Considerations

**1. Replay Protection**
- Each `swap_id` must be unique
- Contract checks: `assert!(self.swaps.get(&swap_id).is_none())`

**2. Time-Lock Enforcement**
```rust
// Can only complete if time hasn't expired
assert!(env::block_timestamp() < swap.time_lock, 'Swap expired');

// Can only refund if time has expired
assert!(env::block_timestamp() >= swap.time_lock, 'Time lock active');
```

**3. Oracle Trust**
- Oracle account must be trusted (set during deployment)
- Oracle can't steal funds (can only verify proofs)
- Recommended: Use multisig for oracle account

### NEAR Contract 2: Escrow

**File:** `near_escrow.rs` (from your friend)

**Purpose:** Hold funds in escrow with cross-chain proof verification.

#### Key Features

**Feature 1: Time-Locked Escrow**
```rust
pub release_time: u64,  // Funds released only after this time
```

**Why?** For scenarios like: "Pay freelancer after 30 days if no disputes"

**Feature 2: Cross-Chain Proof Submission**
```rust
pub struct CrossChainProof {
    pub chain_id: String,
    pub tx_hash: String,
    pub block_number: u64,
    pub proof_data: String,
    pub verified: bool,
}
```

**Why?** Example: "Release escrow only if proof-of-delivery is submitted from Starknet"

**Feature 3: Trusted Verifier System**
```rust
pub trusted_verifiers: Vec<AccountId>,
```

**Why?** Only authorized parties can verify cross-chain proofs (prevents spam/fraud)

**Feature 4: Dispute Resolution**
```rust
pub arbiter: Option<AccountId>,  // Optional third-party arbiter
pub status: EscrowStatus,         // Active | Completed | Disputed | Refunded
```

**Why?** If buyer and seller disagree, arbiter can intervene

#### When to Use Escrow vs AtomicSwap?

| Scenario | Use |
|----------|-----|
| **Instant atomic swap** | AtomicSwap |
| **Time-delayed payment** | Escrow |
| **Conditional release (needs proof)** | Escrow |
| **Dispute resolution needed** | Escrow |
| **Simple trustless swap** | AtomicSwap |

---

## STARKNET CONTRACTS

### Why Starknet?

**1. Native Account Abstraction**
- Every account is a smart contract
- Enables: session keys, paymasters, multicall
- Better UX: gasless transactions, batch operations

**2. ZK-SNARK Proofs**
- Cryptographic privacy without full encryption
- Provable computation (Cairo programs)
- Inherits Ethereum security

**3. Poseidon Hash Function**
- SNARK-friendly hash (more efficient in ZK circuits)
- Used throughout Starknet ecosystem
- Required for cross-chain compatibility with Starknet

**4. X402 Payment Protocol**
- Coinbase's HTTP-based payment standard
- Perfect for wallet micropayments
- Starknet's low fees make micropayments viable

**5. Ethereum Bridge**
- Connect to largest DeFi ecosystem
- Access to ERC20 tokens
- Future path to mainnet liquidity

### Starknet Contract 1: AtomicSwap (ERC20)

**File:** `starknet_atomic_swap_improved.cairo`

**Purpose:** HTLC atomic swaps with full ERC20 token integration.

#### Key Features

**Feature 1: ERC20 Token Integration**
```cairo
use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};

fn initiate_swap(..., token_address: ContractAddress) {
    // Transfer tokens from user to contract
    let token = IERC20Dispatcher { contract_address: token_address };
    token.transfer_from(caller, contract_address, amount);
}
```

**Why?** 
- **NEAR locks native NEAR tokens**
- **Starknet locks any ERC20 token** (STRK, ETH, USDC, etc.)

This enables **NEAR ↔ Starknet token swaps** (e.g., 100 NEAR → 1000 STRK)

**Feature 2: Poseidon Hash Verification**
```cairo
use core::poseidon::poseidon_hash_span;

fn complete_swap(secret: felt252) {
    let mut secret_array = array![secret];
    let computed_hash = poseidon_hash_span(secret_array.span());
    assert(computed_hash == swap.hash_lock, 'Invalid secret');
}
```

**Why?** Starknet natively supports Poseidon (SNARK-friendly). This is THE CORE of cross-chain compatibility.

**Feature 3: Fee Collection**
```cairo
#[storage]
struct Storage {
    fee_percentage: u256,      // 30 basis points (0.3%)
    fee_recipient: ContractAddress,
}

fn complete_swap() {
    let fee = (swap.amount * self.fee_percentage) / 10000;
    let payout = swap.amount - fee;
    
    token.transfer(swap.recipient, payout);
    token.transfer(self.fee_recipient, fee);
}
```

**Why?** Monetize the protocol. Fees go to treasury/DAO.

**Feature 4: Cross-Chain Metadata**
```cairo
struct SwapDetails {
    // ...
    target_chain: felt252,      // "near", "aztec"
    target_swap_id: felt252,    // Linked swap on other chain
}
```

**Why?** Backend can correlate swaps across chains using this metadata.

**Feature 5: Secret Storage**
```cairo
struct SwapDetails {
    // ...
    secret: felt252,  // Revealed secret (after completion)
}
```

**Why?** Once secret is revealed on Starknet, backend can use it to complete NEAR side automatically.

#### Complete Function List

| Function | Purpose | Who Calls |
|----------|---------|-----------|
| `initiate_swap()` | Lock ERC20 tokens, start swap | User (initiator) |
| `complete_swap()` | Reveal secret, claim tokens | User (participant) or Backend |
| `refund_swap()` | Get refund after time-lock expires | User (initiator) |
| `get_swap_details()` | Query swap state | Anyone |

#### Storage Breakdown

```cairo
#[derive(Drop, Serde, starknet::Store)]
struct SwapDetails {
    // Identity
    initiator: ContractAddress,
    recipient: ContractAddress,
    
    // Lock details
    amount: u256,
    token_address: ContractAddress,   // ERC20 token
    hash_lock: felt252,                // Poseidon hash
    time_lock: u64,                    // Unix timestamp
    
    // Status
    status: SwapStatus,                // Empty | Active | Completed | Refunded
    secret: felt252,                   // Revealed secret
    
    // Cross-chain
    target_chain: felt252,
    target_swap_id: felt252,
}
```

#### Events Emitted

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
    target_swap_id: felt252,
}

#[derive(Drop, starknet::Event)]
struct SwapCompleted {
    #[key]
    swap_id: felt252,
    recipient: ContractAddress,
    secret: felt252,  // SECRET REVEALED!
}

#[derive(Drop, starknet::Event)]
struct SwapRefunded {
    #[key]
    swap_id: felt252,
    initiator: ContractAddress,
}
```

#### Security Considerations

**1. Reentrancy Protection**
- Cairo 2.x has built-in reentrancy guards
- ERC20 transfers happen before state updates

**2. Token Approval**
```cairo
// User must approve contract BEFORE calling initiate_swap
token.approve(contract_address, amount);

// Contract uses transfer_from (not transfer)
token.transfer_from(user, contract, amount);
```

**3. Fee Validation**
```cairo
assert(fee_percentage <= 1000, 'Fee too high');  // Max 10%
```

### Starknet Contract 2: X402 Payment Verifier

**File:** `starknet_x402_payment.cairo`

**Purpose:** Verify micropayments for premium wallet features.

#### Key Features

**Feature 1: On-Chain Payment Recording**
```cairo
struct PaymentRecord {
    payment_id: felt252,
    payer: ContractAddress,
    recipient: ContractAddress,
    amount: u256,
    token: ContractAddress,
    resource: felt252,  // "/api/premium/analytics"
    timestamp: u64,
    verified: bool,
}
```

**Why?** Backend can query contract to verify user paid for premium feature.

**Feature 2: Backend Verification**
```cairo
fn verify_payment(payment_id: felt252) -> bool {
    let caller = get_caller_address();
    assert(caller == self.backend_address, 'Unauthorized');
    
    let payment = self.payments.read(payment_id);
    return payment.verified;
}
```

**Why?** Only backend can call verification (prevents abuse).

**Feature 3: Nonce Protection**
```cairo
#[storage]
struct Storage {
    nonces: Map<ContractAddress, u256>,
}

fn make_payment() {
    let nonce = self.nonces.read(payer);
    self.nonces.write(payer, nonce + 1);
}
```

**Why?** Prevents replay attacks (same payment used twice).

#### X402 Flow on Starknet

```
User requests premium feature
     ↓
Backend returns HTTP 402 with payment requirements
     ↓
User calls make_payment() on Starknet contract
     ↓
ERC20 tokens transferred (e.g., 0.1 STRK)
     ↓
PaymentMade event emitted
     ↓
User retries API with X-PAYMENT header (tx_hash)
     ↓
Backend calls verify_payment() on contract
     ↓
Access granted ✅
```

### Starknet Contract 3: Bridge Connector

**File:** `starknet_bridge_connector.cairo` (from your friend)

**Purpose:** Coordinate cross-chain transfers with proof verification.

#### Key Features

**Feature 1: Bridge Registration**
```cairo
fn register_bridge(chain_id: felt252, bridge_address: felt252) {
    // Only owner can register
    self.registered_bridges.write(chain_id, bridge_address);
}
```

**Why?** Whitelist approved bridges (security).

**Feature 2: Lock for Transfer**
```cairo
fn lock_for_bridge(
    transfer_id: felt252,
    amount: u256,
    destination_chain: felt252,
    recipient: felt252
)
```

**Why?** Lock tokens on Starknet, mint on destination chain.

**Feature 3: Unlock with Proof**
```cairo
fn unlock_from_bridge(transfer_id: felt252, proof: felt252)
```

**Why?** Verify source chain proof before releasing tokens.

#### Improvement Needed

**Current Implementation:**
```cairo
assert(proof != 0, 'Invalid proof');  // ❌ Too simple!
```

**Should Be:**
```cairo
// Verify Merkle proof from source chain
// Or verify ZK proof of transaction inclusion
// This requires integration with bridge relayers
```

---

## AZTEC NETWORK CONTRACTS

### Why Aztec?

**1. Full Privacy (Encrypted State)**
- On NEAR: Everyone sees amounts and addresses
- On Starknet: Amounts visible, but ZK proofs provide some privacy
- On Aztec: **EVERYTHING is encrypted** (amounts, parties, timing)

**2. Programmable Privacy (Noir)**
- Write privacy-preserving smart contracts
- Rust-like syntax (familiar to devs)
- Compiles to ZK circuits

**3. Private Notes (UTXO Model)**
- Like Bitcoin UTXOs, but encrypted
- Better privacy than account model
- Only note owner can decrypt

**4. Hybrid Public/Private State**
- Some data can be public (for coordination)
- Some data stays private (sensitive info)
- Best of both worlds

**5. Client-Side Execution (PXE)**
- Private logic runs on user's device
- Network only sees ZK proofs
- Maximum privacy

### Aztec Contract: Private Atomic Swap

**File:** `aztec_private_atomic_swap.nr`

**Purpose:** Completely private cross-chain atomic swaps.

#### Key Features

**Feature 1: Private Notes**
```noir
struct SwapNote {
    swap_id: Field,
    initiator: AztecAddress,      // Encrypted
    recipient: AztecAddress,       // Encrypted
    amount: Field,                 // Encrypted
    hash_lock: Field,
    time_lock: u64,
    status: u8,
    target_chain: Field,
    secret: Field,
    header: NoteHeader,
}
```

**Why?** All swap details stored as encrypted notes. Only initiator and recipient can see amounts/parties.

**Feature 2: Pedersen Hash**
```noir
#[aztec(private)]
fn complete_private_swap(swap_id: Field, secret: Field) {
    let computed_hash = pedersen_hash([secret], 0);
    assert(computed_hash == swap_note.hash_lock, "Invalid secret");
}
```

**Why?** Aztec uses Pedersen hash (different from SHA256 and Poseidon). Backend must compute all three!

**Feature 3: Private Token Transfers**
```noir
#[aztec(private)]
internal fn _transfer_private_tokens(
    from: AztecAddress,
    to: AztecAddress,
    amount: Field,
)
```

**Why?** Transfer tokens without revealing amounts publicly.

**Feature 4: Hybrid Public/Private**
```noir
#[aztec(public)]
fn register_swap_commitment(
    swap_id: Field,
    commitment: Field,  // Hash of private details
)
```

**Why?** For cross-chain coordination, some commitment must be public (so backend can detect events), but actual details stay private.

**Feature 5: View Only Your Swaps**
```noir
#[aztec(private)]
fn get_my_swaps() -> [SwapNote; 10] {
    let sender = context.msg_sender();
    // Returns only swaps where user is initiator or recipient
}
```

**Why?** Privacy: Users can't see other people's swaps.

#### Complete Function List

| Function | Visibility | Purpose | Who Calls |
|----------|-----------|---------|-----------|
| `initiate_private_swap()` | Private | Lock tokens privately | User |
| `complete_private_swap()` | Private | Reveal secret, claim tokens | User |
| `refund_private_swap()` | Private | Refund after expiry | User |
| `register_swap_commitment()` | Public | Store public commitment | Backend |
| `get_swap_commitment()` | Public | Read commitment | Backend |
| `get_my_swaps()` | Private | List user's swaps | User |

#### Storage Breakdown

```noir
// PRIVATE storage (encrypted on-chain)
struct Storage {
    private_swaps: PrivateSet<SwapNote>,
    
    // PUBLIC storage (for cross-chain coordination)
    public_swap_commitments: Map<Field, PublicMutable<Field>>,
}
```

#### How Privacy Works

**What's Public:**
- Commitment hash (e.g., `0xabc123...`)
- Transaction occurred
- Block number

**What's Private (Encrypted):**
- Swap amount
- Initiator address
- Recipient address
- Token type
- Time-lock details

**Example:**
```
Public blockchain:
  Block 1000: Transaction 0x123 → Commitment: 0xabc...

Private (only parties can see):
  Alice → Bob
  Amount: 100 tokens
  Time-lock: 24 hours
```

#### Security Considerations

**1. Note Nullifiers**
- Prevents double-spending of private notes
- Aztec handles this automatically

**2. Viewing Keys**
- Only note owner can decrypt
- Managed by Aztec PXE

**3. Public Commitments**
```noir
// Commitment = Hash(swap_id, initiator, recipient, amount, ...)
// Backend can see commitment changed, but not details
```

---

## COMPARISON MATRIX

### Function Availability

| Function | NEAR | Starknet | Aztec |
|----------|------|----------|-------|
| **initiate_swap()** | ✅ | ✅ | ✅ |
| **complete_swap()** | ✅ | ✅ | ✅ |
| **refund_swap()** | ✅ | ✅ | ✅ |
| **Oracle verification** | ✅ (Poseidon) | ❌ (native Poseidon) | ❌ (native Pedersen) |
| **ERC20 support** | ❌ (native only) | ✅ | ✅ (private tokens) |
| **Fee mechanism** | ✅ | ✅ | ⚠️ (planned) |
| **Privacy** | ❌ (transparent) | ⚠️ (ZK proofs) | ✅ (encrypted) |
| **Cross-chain metadata** | ✅ | ✅ | ✅ |

### Hash Function Comparison

| Chain | Hash Function | Output Format | Native Support |
|-------|---------------|---------------|----------------|
| **NEAR** | SHA256 | 64 hex chars | ✅ Native |
| **Starknet** | Poseidon | felt252 | ✅ Native |
| **Aztec** | Pedersen | Field element | ✅ Native |

**Implication:** Backend MUST compute all three hashes from same secret!

### Privacy Levels

```
┌──────────────────────────────────────────────────────────────┐
│  NEAR Protocol                                                │
│  Privacy Level: ⭐ (Transparent)                             │
│                                                               │
│  Anyone can see:                                              │
│  ✓ Sender address                                            │
│  ✓ Recipient address                                         │
│  ✓ Amount                                                     │
│  ✓ Time-lock                                                  │
│  ✓ Secret (after completion)                                 │
│                                                               │
│  Use when: Speed and low cost > privacy                      │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  Starknet                                                     │
│  Privacy Level: ⭐⭐⭐ (ZK Proofs)                           │
│                                                               │
│  Public:                                                      │
│  ✓ Transaction occurred                                      │
│  ✓ Amount (unless using privacy extensions)                 │
│  ✓ Addresses (unless using stealth addresses)               │
│                                                               │
│  Private:                                                     │
│  ✓ Internal state transitions (provable via STARK)          │
│                                                               │
│  Use when: Balance between privacy, cost, and features       │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  Aztec Network                                                │
│  Privacy Level: ⭐⭐⭐⭐⭐ (Encrypted State)                 │
│                                                               │
│  Public:                                                      │
│  ✓ Commitment hash (no details)                             │
│  ✓ Proof verification (ZK proof valid)                       │
│                                                               │
│  Private (encrypted):                                         │
│  ✓ Sender & recipient addresses                             │
│  ✓ Amount                                                     │
│  ✓ Token type                                                 │
│  ✓ Time-lock                                                  │
│  ✓ All swap metadata                                         │
│                                                               │
│  Use when: Maximum privacy required (high-value, sensitive)  │
└──────────────────────────────────────────────────────────────┘
```

### Performance Comparison

| Metric | NEAR | Starknet | Aztec |
|--------|------|----------|-------|
| **Finality** | 1-2 seconds | 10-30 seconds | Varies |
| **Gas Cost** | ~$0.001 | ~$0.01 | Higher |
| **TPS** | ~1000 | ~100 (L2) | Lower |
| **Privacy Cost** | N/A | Moderate | High (ZK circuits) |

### Feature Matrix

| Feature | NEAR | Starknet | Aztec |
|---------|------|----------|-------|
| **Atomic Swaps** | ✅ | ✅ | ✅ |
| **Cross-Chain** | ✅ | ✅ | ✅ |
| **Native Tokens** | ✅ (NEAR) | ✅ (ETH) | ✅ |
| **ERC20 Tokens** | ❌ | ✅ | ✅ (private) |
| **Account Abstraction** | ❌ | ✅ Native | ✅ Native |
| **Session Keys** | ❌ | ✅ | ✅ |
| **Paymaster** | ❌ | ✅ | ✅ |
| **X402 Payments** | ✅ (backend) | ✅ (native) | ⚠️ (planned) |
| **Escrow** | ✅ | ✅ | ⚠️ (planned) |
| **Privacy Swaps** | ❌ | ⚠️ (ZK) | ✅ (full) |

---

## INTEGRATION STRATEGY

### Three-Tier Privacy Model

```
┌─────────────────────────────────────────────────────────────┐
│                    USER CHOICE                               │
│  "How private do you want this transaction?"                 │
└───────┬────────────────────────┬────────────────────────────┘
        │                        │                     │
   ┌────▼────┐            ┌──────▼──────┐     ┌──────▼──────┐
   │  FAST   │            │  BALANCED   │     │   PRIVATE   │
   │  Mode   │            │    Mode     │     │    Mode     │
   ├─────────┤            ├─────────────┤     ├─────────────┤
   │ NEAR    │            │ Starknet    │     │   Aztec     │
   │         │            │             │     │             │
   │ Speed:  │            │ Speed:      │     │ Speed:      │
   │ ⭐⭐⭐⭐⭐│            │ ⭐⭐⭐⭐    │     │ ⭐⭐⭐      │
   │         │            │             │     │             │
   │ Privacy:│            │ Privacy:    │     │ Privacy:    │
   │ ⭐      │            │ ⭐⭐⭐      │     │ ⭐⭐⭐⭐⭐  │
   │         │            │             │     │             │
   │ Cost:   │            │ Cost:       │     │ Cost:       │
   │ ~$0.001 │            │ ~$0.01      │     │ Higher      │
   └─────────┘            └─────────────┘     └─────────────┘
```

### Use Case Recommendations

#### Scenario 1: Frequent Small Swaps
**Example:** User swaps 10 NEAR → 100 STRK multiple times per day

**Recommendation:** Start on NEAR
- Fast (1-2s finality)
- Cheap ($0.001 per swap)
- Then bridge to Starknet when needed

#### Scenario 2: DeFi Trading
**Example:** User provides liquidity, yields farming

**Recommendation:** Starknet
- Account Abstraction (batch operations)
- ZK proofs (privacy)
- ERC20 ecosystem

#### Scenario 3: High-Value Private Transfer
**Example:** User swaps $50,000 worth of tokens privately

**Recommendation:** Aztec
- Full privacy (amounts hidden)
- Encrypted state
- Maximum security

#### Scenario 4: X402 Micropayments
**Example:** User pays for premium wallet features

**Recommendation:** Starknet
- Native X402 support
- Low fees (viable for micro-payments)
- Fast verification

### Cross-Chain Swap Patterns

#### Pattern 1: NEAR → Starknet (Fast to Balanced)
```
User on NEAR wants Starknet tokens

1. User locks NEAR on NEAR contract (SHA256 hash)
2. Backend detects event
3. Backend computes Poseidon hash
4. Backend locks STRK on Starknet (Poseidon hash)
5. User reveals secret on Starknet
6. Backend completes NEAR side automatically

Result: User gave NEAR, got STRK ✅
```

#### Pattern 2: Starknet → Aztec (Balanced to Private)
```
User wants maximum privacy

1. User locks STRK on Starknet (Poseidon hash)
2. Backend computes Pedersen hash
3. Backend locks tokens on Aztec (Pedersen hash)
4. User reveals secret on Aztec (PRIVATE)
5. Backend completes Starknet side

Result: Public STRK → Private Aztec tokens ✅
```

#### Pattern 3: Aztec → NEAR (Private to Fast)
```
User wants to exit to fast/cheap chain

1. User locks on Aztec privately (Pedersen hash)
2. Backend creates public commitment
3. Backend locks NEAR (SHA256 hash)
4. User reveals secret on NEAR (PUBLIC now)
5. Backend completes Aztec side

Result: Private Aztec → Public NEAR ✅
```

### Backend Integration Requirements

#### Hash Oracle (Critical!)
```typescript
// backend/src/services/hash-oracle.service.ts

import { hash } from 'starknet';
import { createHash } from 'crypto';

export class HashOracleService {
  computeAllHashes(secret: string) {
    return {
      sha256: this.computeSHA256(secret),      // For NEAR
      poseidon: this.computePoseidon(secret),  // For Starknet
      pedersen: this.computePedersen(secret),  // For Aztec
    };
  }
  
  computeSHA256(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }
  
  computePoseidon(secret: string): string {
    // Convert to felt252, then hash
    const secretBigInt = BigInt('0x' + Buffer.from(secret).toString('hex'));
    return hash.computeHashOnElements([secretBigInt]);
  }
  
  computePedersen(secret: string): string {
    // Use @aztec/aztec.js for Pedersen hash
    // Implementation depends on Aztec SDK
  }
}
```

---

## CONCLUSION

### Why This Three-Chain Architecture Works

**1. Complementary Strengths**
- NEAR: Speed + Low Cost
- Starknet: ZK Proofs + Account Abstraction
- Aztec: Full Privacy

**2. User Choice**
- Users pick the right chain for each transaction
- Automatic routing based on preferences

**3. Cross-Chain Synergy**
- Hash oracle bridges incompatible functions
- Backend coordinates seamlessly
- User experience stays simple

### Contract Summary

| Contract | Chain | Purpose | Key Innovation |
|----------|-------|---------|----------------|
| **AtomicSwap** | NEAR | Fast swaps | Multi-hash support |
| **Escrow** | NEAR | Time-locked payments | Cross-chain proofs |
| **AtomicSwap** | Starknet | ERC20 swaps | Poseidon verification |
| **X402 Payment** | Starknet | Micropayments | On-chain verification |
| **Bridge Connector** | Starknet | Cross-chain transfers | Proof validation |
| **Private Swap** | Aztec | Privacy swaps | Encrypted state |

### What Makes This Unique

**1. First Wallet to Integrate All Three**
- NEAR + Starknet + Aztec
- No other wallet does this!

**2. Solves Hash Incompatibility**
- Backend oracle bridges SHA256 ↔ Poseidon ↔ Pedersen
- Enables true cross-chain atomicity

**3. Three Privacy Levels**
- Users choose speed vs privacy
- Progressive privacy model

**4. Production-Grade Architecture**
- NestJS backend (TypeScript)
- All testnets (safe development)
- Real monetization (X402 payments)

---

**YOU NOW UNDERSTAND ALL THREE CONTRACT SYSTEMS!** 🚀

Use this document to:
- Brief your development team
- Train Claude Code for generation
- Explain architecture to judges
- Create technical pitch deck
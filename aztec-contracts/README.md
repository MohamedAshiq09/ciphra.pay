# Private Atomic Swap Contract - Aztec Network

**Fully private cross-chain atomic swaps with encrypted state**

Part of the Ciphra.Pay project for Zypherphunk Hackathon.

## Features

✅ **Complete Privacy**
- Swap amounts are encrypted
- Initiator and recipient addresses hidden
- Only parties involved can decrypt swap details

✅ **Pedersen Hash Verification**
- Uses Aztec's native Pedersen hash for hash locks
- Compatible with cross-chain coordination

✅ **Time-Lock Protection**
- Minimum 1 hour, maximum 24 hours
- Automatic refund after expiry

✅ **Cross-Chain Coordination**
- Public commitments for backend monitoring
- Target chain metadata (NEAR, Starknet)
- Linked swap IDs for atomic execution

✅ **Comprehensive Security**
- Input validation
- Access control (only initiator/recipient)
- Status tracking

## Architecture

```
┌─────────────────────────────────────────────┐
│          PRIVATE LAYER (Encrypted)          │
│                                             │
│  SwapNote {                                 │
│    swap_id: Field,                          │
│    initiator: AztecAddress,    [ENCRYPTED] │
│    recipient: AztecAddress,    [ENCRYPTED] │
│    amount: Field,              [ENCRYPTED] │
│    hash_lock: Field,                        │
│    time_lock: u64,                          │
│    status: u8,                              │
│    target_chain: Field,                     │
│    target_swap_id: Field,                   │
│  }                                          │
└─────────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────────┐
│          PUBLIC LAYER (For Backend)         │
│                                             │
│  public_swap_commitments:                   │
│    swap_id → commitment_hash                │
│                                             │
│  public_swap_status:                        │
│    swap_id → status (0/1/2/3)              │
└─────────────────────────────────────────────┘
```

## Installation

```bash
# Install dependencies
yarn install

# Install Aztec CLI (if not already installed)
bash -i <(curl -s https://install.aztec.network)

# Set correct version
export VERSION=3.0.0-devnet.5
aztec-up
```

## Development

### Compile Contract

```bash
yarn compile
```

This compiles the Noir contract to a Sierra JSON artifact.

### Generate TypeScript Bindings

```bash
yarn codegen
```

Generates TypeScript interfaces from the compiled contract.

### Run Tests

**Start Aztec Sandbox:**
```bash
aztec start --sandbox
```

**Run all tests:**
```bash
yarn test
```

**Run only TypeScript E2E tests:**
```bash
yarn test:js
```

**Run only Noir unit tests:**
```bash
yarn test:nr
```

### Deploy Contract

**To sandbox:**
```bash
yarn deploy
```

**To devnet:**
```bash
AZTEC_ENV=devnet yarn deploy
```

## Test Coverage

✅ **Contract Deployment** - Deploy and initialization
✅ **Successful Swap Flow** - Complete atomic swap
✅ **Time-Lock Refund** - Refund after expiry
✅ **Hash Verification** - Pedersen hash validation
✅ **Cross-Chain Coordination** - Metadata storage
✅ **Privacy Guarantees** - Encrypted amounts/parties
✅ **Validation Tests** - Input validation
✅ **Access Control** - Permission checks
✅ **Multiple Swaps** - Concurrent swap handling

## Usage Example

```typescript
import { PrivateAtomicSwapContract } from "./artifacts/PrivateAtomicSwap.js";
import { Fr, computeSecretHash } from "@aztec/aztec.js";

// Deploy contract
const contract = await PrivateAtomicSwapContract.deploy(
    wallet,
    owner,
    30 // 0.3% fee
).send().deployed();

// Generate secret and hash
const secret = Fr.random();
const hashLock = computeSecretHash(secret); // Pedersen hash

// Initiate swap
await contract.methods.initiate_private_swap(
    Fr.random(),           // swap_id
    bobAddress,            // recipient
    1000n,                 // amount (encrypted)
    hashLock,              // Pedersen hash
    7200n,                 // 2 hours
    Fr.fromString("near"), // target chain
    Fr.random()            // target swap ID
).send().wait();

// Complete swap (by recipient)
await contract.methods.complete_private_swap(
    swapId,
    secret // Reveals secret
).send().wait();
```

## Cross-Chain Integration

### Backend Monitoring

The backend can monitor public commitments without seeing private details:

```typescript
// Get swap status (0=Empty, 1=Active, 2=Completed, 3=Refunded)
const status = await contract.methods.get_swap_status(swapId).simulate();

// Get commitment hash (for verification)
const commitment = await contract.methods.get_swap_commitment(swapId).simulate();
```

### Hash Compatibility

```
NEAR (SHA256) ←→ Backend Oracle ←→ Aztec (Pedersen)
                                  ↕
                            Starknet (Poseidon)
```

The backend computes all three hashes from a single secret.

## Security Considerations

🔒 **Private Notes** - All swap details encrypted
🔒 **Access Control** - Only initiator can refund, only recipient can complete
🔒 **Time-Lock Bounds** - 1-24 hour range enforced
🔒 **Status Validation** - Can't complete refunded swaps, etc.
🔒 **Nullifier Protection** - Prevents double-spending notes

## Project Structure

```
aztec-contracts/
├── src/
│   ├── main.nr                 # Main contract
│   ├── test/
│   │   ├── first.nr           # Noir unit tests
│   │   └── e2e/
│   │       └── atomic-swap.test.ts  # TypeScript E2E tests
│   └── artifacts/             # Generated (after codegen)
├── scripts/
│   └── deploy_contract.ts     # Deployment script
├── Nargo.toml                 # Noir configuration
├── package.json               # Node dependencies
├── tsconfig.json              # TypeScript config
└── jest.integration.config.json  # Jest config
```

## Contributing

This contract is part of Ciphra.Pay hackathon project. See main project README for contribution guidelines.

## License

MIT License - See main project LICENSE file

---

**Built with ❤️ for Zypherphunk Hackathon**

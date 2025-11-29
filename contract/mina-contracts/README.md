# Mina Atomic Swap Contract

Cross-chain atomic swap zkApp for Mina Protocol supporting:
- Mina ↔ Zcash
- Mina ↔ NEAR Protocol  
- Mina ↔ Starknet
- Mina ↔ Aztec

## Features

- **Hash Time-Locked Contracts (HTLC)**: Secure atomic swaps with time-based refunds
- **Cross-Chain Support**: Atomic swaps with multiple blockchain networks
- **Zero-Knowledge Proofs**: Privacy-preserving swap execution using Mina's recursive ZK proofs
- **Fee Mechanism**: Configurable fee system (0.3% default)
- **Oracle Verification**: Cross-chain transaction verification

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Build Contract
```bash
npm run build
```

### 3. Run Tests
```bash
npm test
```

### 4. Deploy to Testnet
```bash
# Set environment variables
export DEPLOYER_PRIVATE_KEY=your_private_key_here
export MINA_NETWORK=berkeley

# Deploy
npm run deploy
```

### 5. Interact with Contract
```bash
# Initiate a swap
npm run interact initiate \
  --recipient B62qXXXXXXXXXXXXXXXXXXXXXX \
  --amount 1000 \
  --secret 12345 \
  --timeLock 7200 \
  --targetChain zcash \
  --targetSwapId 123

# Complete a swap
npm run interact complete \
  --swapId 1 \
  --secret 12345

# Query swap status
npm run interact query --swapId 1

# Refund expired swap
npm run interact refund --swapId 1
```

## Chain IDs

- Zcash: 1
- NEAR: 2
- Starknet: 3
- Aztec: 4

## Environment Variables

- `DEPLOYER_PRIVATE_KEY`: Private key for deployment
- `ZKAPP_ADDRESS`: Deployed contract address
- `MINA_NETWORK`: Network (berkeley/mainnet)

## Contract Architecture

### Core Components

1. **SwapDetails**: Off-chain swap data structure
2. **CrossChainProof**: Cross-chain verification proofs
3. **AtomicSwapContract**: Main zkApp contract

### Key Methods

- `initiateSwap()`: Start a new atomic swap
- `completeSwap()`: Complete swap by revealing secret
- `refundSwap()`: Refund expired swap
- `submitCrossChainProof()`: Oracle verification

## Security Features

- Time-locked contracts prevent indefinite locks
- Hash-locked secrets ensure atomic execution
- Merkle tree commitments for efficient state management
- Oracle-verified cross-chain proofs

## Testing

The test suite covers:
- Contract deployment
- Swap initiation for all supported chains
- Swap completion with secret revelation
- Refund functionality for expired swaps
- Admin functions and fee management
- Cross-chain verification

Run tests with:
```bash
npm test
```

## License

MIT License - see LICENSE file for details.
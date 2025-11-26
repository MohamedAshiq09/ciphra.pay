#!/bin/bash

# Deployment script for NEAR contracts

set -e

NETWORK=${1:-testnet}

if [ "$NETWORK" != "testnet" ] && [ "$NETWORK" != "mainnet" ]; then
    echo "Usage: ./deploy.sh [testnet|mainnet]"
    exit 1
fi

echo "🚀 Deploying contracts to $NETWORK..."

# Build contracts first
./build.sh

# Create deployment directory
mkdir -p deployment/$NETWORK

# Deploy swap contract
echo "Deploying swap contract..."
SWAP_ACCOUNT="swap-contract-$(date +%s).${NETWORK}"
near create-account $SWAP_ACCOUNT --masterAccount your-account.${NETWORK} --initialBalance 10
near deploy --accountId $SWAP_ACCOUNT --wasmFile out/swap_contract.wasm

# Save swap contract address
echo $SWAP_ACCOUNT > deployment/$NETWORK/swap_contract_address.txt

# Deploy escrow contract
echo "Deploying escrow contract..."
ESCROW_ACCOUNT="escrow-contract-$(date +%s).${NETWORK}"
near create-account $ESCROW_ACCOUNT --masterAccount your-account.${NETWORK} --initialBalance 10
near deploy --accountId $ESCROW_ACCOUNT --wasmFile out/escrow_contract.wasm

# Save escrow contract address
echo $ESCROW_ACCOUNT > deployment/$NETWORK/escrow_contract_address.txt

echo "✅ Deployment complete!"
echo "Swap contract: $SWAP_ACCOUNT"
echo "Escrow contract: $ESCROW_ACCOUNT"
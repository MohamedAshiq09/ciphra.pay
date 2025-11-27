#!/bin/bash

set -e

export NEAR_ENV=testnet
ACCOUNT_ID="ashiq09.testnet"

echo "🚀 Deploying contracts to testnet..."

# Contracts already built, using existing WASM files

echo ""
echo "================================================"
echo "📦 Deploying Ciphra.pay Contracts"
echo "================================================"
echo "Account: $ACCOUNT_ID"
echo ""

# Wait for network sync
echo "⏳ Waiting for network sync..."
sleep 3

# Deploy swap contract (FIXED SYNTAX)
echo "📦 Deploying Swap Contract..."
near deploy \
  swap.$ACCOUNT_ID \
  out/swap_contract.wasm \
  --initFunction new \
  --initArgs '{"owner": "'$ACCOUNT_ID'"}'

echo ""
echo "✅ Swap Contract Deployed!"
echo "   Address: swap.$ACCOUNT_ID"
echo ""

# Wait between deployments
sleep 2

# Deploy escrow contract (FIXED SYNTAX)
echo "📦 Deploying Escrow Contract..."
near deploy \
  escrow.$ACCOUNT_ID \
  out/escrow_contract.wasm \
  --initFunction new \
  --initArgs '{"owner": "'$ACCOUNT_ID'"}'

echo ""
echo "✅ Escrow Contract Deployed!"
echo "   Address: escrow.$ACCOUNT_ID"
echo ""

# Save deployment addresses
mkdir -p deployment/testnet
echo "swap.$ACCOUNT_ID" > deployment/testnet/swap_contract_address.txt
echo "escrow.$ACCOUNT_ID" > deployment/testnet/escrow_contract_address.txt

echo "================================================"
echo "🎉 Deployment Complete!"
echo "================================================"
echo "Swap Contract:   swap.$ACCOUNT_ID"
echo "Escrow Contract: escrow.$ACCOUNT_ID"
echo "================================================"

# Verify deployments
echo ""
echo "🔍 Verifying deployments..."
near state swap.$ACCOUNT_ID
near state escrow.$ACCOUNT_ID
#!/bin/bash

set -e

export NEAR_ENV=testnet
ACCOUNT_ID="ashiq09.testnet"

echo "🚀 Deploying Improved Ciphra.pay Contracts to testnet..."

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

# ============================================
# STEP 1: Create Oracle Account (NEW)
# ============================================
echo "📝 Creating Oracle account for Poseidon verification..."
near create-account oracle.$ACCOUNT_ID \
  --masterAccount $ACCOUNT_ID \
  --initialBalance 5 || echo "⚠️  Oracle account already exists"

echo ""
sleep 2

# ============================================
# STEP 2: Deploy Improved Swap Contract
# ============================================
echo "📦 Deploying Improved Swap Contract..."
near deploy \
  swap.$ACCOUNT_ID \
  out/swap_contract.wasm \
  --force

echo ""
echo "✅ Swap Contract Deployed!"
echo "   Address: swap.$ACCOUNT_ID"
echo "   Oracle:  oracle.$ACCOUNT_ID"
echo ""

sleep 2

# ============================================
# STEP 3: Deploy Escrow Contract (unchanged)
# ============================================
echo "📦 Deploying Escrow Contract..."
near deploy \
  escrow.$ACCOUNT_ID \
  out/escrow_contract.wasm \
  --force

echo ""
echo "✅ Escrow Contract Deployed!"
echo "   Address: escrow.$ACCOUNT_ID"
echo ""

sleep 2

# ============================================
# STEP 4: Deploy P2P Transfer Contract (NEW)
# ============================================
echo "📦 Deploying P2P Transfer Contract..."

# Create P2P account if it doesn't exist
near create-account p2p.$ACCOUNT_ID \
  --masterAccount $ACCOUNT_ID \
  --initialBalance 10 || echo "⚠️  P2P account already exists"

sleep 2

near deploy \
  p2p.$ACCOUNT_ID \
  out/p2p_transfer_contract.wasm \
  --initFunction new \
  --initArgs '{"owner": "'$ACCOUNT_ID'"}'

echo ""
echo "✅ P2P Transfer Contract Deployed!"
echo "   Address: p2p.$ACCOUNT_ID"
echo ""

# ============================================
# Save deployment addresses
# ============================================
mkdir -p deployment/testnet
echo "swap.$ACCOUNT_ID" > deployment/testnet/swap_contract_address.txt
echo "escrow.$ACCOUNT_ID" > deployment/testnet/escrow_contract_address.txt
echo "p2p.$ACCOUNT_ID" > deployment/testnet/p2p_contract_address.txt
echo "oracle.$ACCOUNT_ID" > deployment/testnet/oracle_account_address.txt

echo "================================================"
echo "🎉 Deployment Complete!"
echo "================================================"
echo "Swap Contract:    swap.$ACCOUNT_ID"
echo "Escrow Contract:  escrow.$ACCOUNT_ID"
echo "P2P Contract:     p2p.$ACCOUNT_ID"
echo "Oracle Account:   oracle.$ACCOUNT_ID"
echo "================================================"

# ============================================
# Verify deployments
# ============================================
echo ""
echo "🔍 Verifying deployments..."
near state swap.$ACCOUNT_ID
near state escrow.$ACCOUNT_ID
near state p2p.$ACCOUNT_ID
near state oracle.$ACCOUNT_ID

echo ""
echo "✅ All contracts verified successfully!"
echo ""
echo "📋 Contract Details:"
echo "   - Swap supports SHA256 + Poseidon hashes"
echo "   - Oracle verifies Poseidon cross-chain proofs"
echo "   - P2P supports direct + shielded transfers"
echo "   - Fees: 0.3% (swap), 0.1% (P2P)"
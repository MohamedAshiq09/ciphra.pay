#!/bin/bash

set -e

echo "🔨 Building NEAR Contracts..."
echo ""

# Build swap contract
echo "📦 Building swap-contract..."
cd swap-contract
cargo near build
cd ..

# Build escrow contract
echo "📦 Building escrow-contract..."
cd escrow-contract
cargo near build
cd ..

# Build P2P transfer contract          # ⬅️ ADD THESE LINES
echo "📦 Building p2p-transfer-contract..."
cd p2p-transfer
cargo near build
cd ..

# Create output directory
mkdir -p out

# Copy WASM files
echo ""
echo "📋 Copying WASM files..."
cp target/near/swap_contract/swap_contract.wasm out/
cp target/near/escrow_contract/escrow_contract.wasm out/
cp target/near/p2p_transfer_contract/p2p_transfer_contract.wasm out/    # ⬅️ ADD THIS

echo ""
echo "✅ Build complete!"
echo "   - swap_contract.wasm → ./out/"
echo "   - escrow_contract.wasm → ./out/"
echo "   - p2p_transfer_contract.wasm → ./out/"    # ⬅️ ADD THIS
echo ""
ls -lh out/
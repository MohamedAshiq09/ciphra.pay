#!/bin/bash

set -e

echo "🔨 Building NEAR Contracts with cargo-near..."
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

# Create output directory
mkdir -p out

# Copy WASM files (cargo-near puts them in target/near/)
echo ""
echo "📋 Copying WASM files..."
cp swap-contract/target/near/swap_contract.wasm out/
cp escrow-contract/target/near/escrow_contract.wasm out/

echo ""
echo "✅ Build complete!"
echo "   - swap_contract.wasm → ./out/"
echo "   - escrow_contract.wasm → ./out/"
echo ""
ls -lh out/
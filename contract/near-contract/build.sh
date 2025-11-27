#!/bin/bash

set -e

echo "🔨 Building NEAR Contracts..."
echo ""

# Build swap contract with cargo-near
echo "📦 Building swap-contract..."
cd swap-contract
cargo near build
cd ..

# Build escrow contract with cargo-near
echo "📦 Building escrow-contract..."
cd escrow-contract
cargo near build
cd ..

# Create output directory
mkdir -p out

# Copy WASM files from near build output
echo ""
echo "📋 Copying WASM files..."
cp target/near/swap_contract/swap_contract.wasm out/
cp target/near/escrow_contract/escrow_contract.wasm out/

echo ""
echo "✅ Build complete!"
echo "   - swap_contract.wasm → ./out/"
echo "   - escrow_contract.wasm → ./out/"
echo ""
ls -lh out/
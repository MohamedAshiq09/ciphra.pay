#!/bin/bash

set -e

echo "🔨 Building NEAR Contracts..."
echo ""

# Build swap contract
echo "📦 Building swap-contract..."
cd swap-contract
cargo build --target wasm32-unknown-unknown --release
cd ..

# Build escrow contract
echo "📦 Building escrow-contract..."
cd escrow-contract
cargo build --target wasm32-unknown-unknown --release
cd ..

# Create output directory
mkdir -p out

# Copy WASM files to output directory
echo ""
echo "📋 Copying WASM files..."
cp swap-contract/target/wasm32-unknown-unknown/release/swap_contract.wasm out/
cp escrow-contract/target/wasm32-unknown-unknown/release/escrow_contract.wasm out/

echo ""
echo "✅ Build complete!"
echo "   - swap_contract.wasm → ./out/"
echo "   - escrow_contract.wasm → ./out/"
echo ""
ls -lh out/
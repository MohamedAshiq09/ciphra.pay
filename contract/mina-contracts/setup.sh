#!/bin/bash

# ==============================================================================
# MINA CONTRACT SETUP - COMPLETE INSTRUCTIONS
# ==============================================================================

echo "📦 MINA CONTRACT SETUP GUIDE"
echo "===================================="
echo ""
echo "You've already done:"
echo "  ✅ mkdir contract/mina-contracts"
echo "  ✅ cd contract/mina-contracts"
echo "  ✅ npm init -y"
echo ""
echo "===================================="
echo "NEXT STEPS:"
echo "===================================="
echo ""
echo "STEP 1: Replace package.json"
echo "----------------------------"
echo "Delete the auto-generated package.json and replace with:"
echo "  cp /path/to/mina-setup/package.json ."
echo ""
echo "STEP 2: Add Config Files"
echo "----------------------------"
echo "  cp /path/to/mina-setup/tsconfig.json ."
echo "  cp /path/to/mina-setup/jest.config.js ."
echo "  cp /path/to/mina-setup/.gitignore ."
echo ""
echo "STEP 3: Create src/ Directory"
echo "----------------------------"
echo "  mkdir src"
echo ""
echo "STEP 4: Add Contract Files"
echo "----------------------------"
echo "  cp /path/to/mina-setup/src/AtomicSwap.ts src/"
echo "  cp /path/to/mina-setup/src/AtomicSwap.test.ts src/"
echo "  cp /path/to/mina-setup/src/deploy.ts src/"
echo "  cp /path/to/mina-setup/src/interact.ts src/"
echo ""
echo "STEP 5: Install Dependencies"
echo "----------------------------"
echo "  npm install"
echo ""
echo "STEP 6: Build"
echo "----------------------------"
echo "  npm run build"
echo ""
echo "STEP 7: Test"
echo "----------------------------"
echo "  npm test"
echo ""
echo "STEP 8: Deploy"
echo "----------------------------"
echo "  npm run deploy"
echo ""
echo "===================================="
echo "FILE STRUCTURE SHOULD LOOK LIKE:"
echo "===================================="
cat << 'STRUCTURE'
contract/mina-contracts/
├── package.json
├── tsconfig.json
├── jest.config.js
├── .gitignore
├── src/
│   ├── AtomicSwap.ts
│   ├── AtomicSwap.test.ts
│   ├── deploy.ts
│   └── interact.ts
└── (build/ - generated after npm run build)
STRUCTURE
echo ""
echo "===================================="
echo "QUICK COMMANDS:"
echo "===================================="
echo ""
echo "# Build contract"
echo "npm run build"
echo ""
echo "# Run tests"
echo "npm test"
echo ""
echo "# Deploy to testnet"
echo "npm run deploy"
echo ""
echo "# Interact with contract"
echo "npm run interact initiate --recipient B62q... --amount 1000 --secret test123"
echo "npm run interact complete --swapId 1 --secret test123"
echo "npm run interact query --swapId 1"
echo ""
echo "===================================="
echo "✅ ALL FILES READY IN: mina-setup/"
echo "===================================="
#!/bin/bash
# ============================================================================
# STARKNET DEPLOYMENT SCRIPT
# Deploys Ciphra.Pay AtomicSwapV2 to Starknet Sepolia Testnet
# ============================================================================

set -e

echo "===================================================================="
echo "Ciphra.Pay - Starknet Atomic Swap Deployment"
echo "===================================================================="

# Colors
GREEN='\033[0.32m'
BLUE='\033[0.34m'
RED='\033[0.31m'
NC='\033[0m' # No Color

# Configuration
NETWORK="sepolia"
RPC_URL="https://starknet-sepolia.public.blastapi.io/rpc/v0_7"

# Check if starkli is installed
if ! command -v starkli &> /dev/null; then
    echo -e "${RED}Error: starkli not found!${NC}"
    echo "Install from: https://github.com/xJonathanLEI/starkli"
    exit 1
fi

# Check if scarb is installed
if ! command -v scarb &> /dev/null; then
    echo -e "${RED}Error: scarb not found!${NC}"
    echo "Install from: https://docs.swmansion.com/scarb/"
    exit 1
fi

echo -e "${BLUE}Step 1: Building contracts...${NC}"
scarb build

if [ ! -d "target/dev" ]; then
    echo -e "${RED}Error: Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build successful${NC}"

echo -e "${BLUE}Step 2: Declaring AtomicSwapV2 contract...${NC}"

# Declare the contract
DECLARE_OUTPUT=$(starkli declare \
    target/dev/ciphra_pay_AtomicSwapV2.contract_class.json \
    --rpc $RPC_URL \
    --network $NETWORK \
    --compiler-version 2.7.0)

# Extract class hash
CLASS_HASH=$(echo "$DECLARE_OUTPUT" | grep -oP 'Class hash declared: \K0x[0-9a-fA-F]+')

if [ -z "$CLASS_HASH" ]; then
    echo -e "${RED}Error: Failed to get class hash!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Contract declared${NC}"
echo -e "Class Hash: ${BLUE}$CLASS_HASH${NC}"

echo -e "${BLUE}Step 3: Deploying contract...${NC}"

# Deployment parameters
# You need to set these:
OWNER_ADDRESS="${OWNER_ADDRESS:-0x0}" # Set your owner address
FEE_RECIPIENT="${FEE_RECIPIENT:-0x0}" # Set fee recipient
INITIAL_FEE="${INITIAL_FEE:-30}" # 0.3%

if [ "$OWNER_ADDRESS" == "0x0" ]; then
    echo -e "${RED}Error: Please set OWNER_ADDRESS environment variable${NC}"
    echo "Example: export OWNER_ADDRESS=0x..."
    exit 1
fi

# Deploy
DEPLOY_OUTPUT=$(starkli deploy \
    $CLASS_HASH \
    $OWNER_ADDRESS \
    $FEE_RECIPIENT \
    $INITIAL_FEE \
    --rpc $RPC_URL \
    --network $NETWORK)

# Extract contract address
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP 'Contract deployed: \K0x[0-9a-fA-F]+')

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo -e "${RED}Error: Failed to deploy contract!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Contract deployed successfully!${NC}"

# Save deployment info
echo "===================================================================="
echo -e "${GREEN}DEPLOYMENT SUCCESSFUL${NC}"
echo "===================================================================="
echo "Network: Starknet Sepolia Testnet"
echo -e "Class Hash: ${BLUE}$CLASS_HASH${NC}"
echo -e "Contract Address: ${BLUE}$CONTRACT_ADDRESS${NC}"
echo "Owner: $OWNER_ADDRESS"
echo "Fee Recipient: $FEE_RECIPIENT"
echo "Fee Percentage: $INITIAL_FEE (basis points)"
echo "===================================================================="

# Save to file
cat > deployments.json <<EOF
{
  "network": "sepolia",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "contracts": {
    "AtomicSwapV2": {
      "classHash": "$CLASS_HASH",
      "address": "$CONTRACT_ADDRESS",
      "owner": "$OWNER_ADDRESS",
      "feeRecipient": "$FEE_RECIPIENT",
      "feePercentage": $INITIAL_FEE
    }
  }
}
EOF

echo -e "${GREEN}✓ Deployment info saved to deployments.json${NC}"

echo ""
echo "Next steps:"
echo "1. Verify contract on Starkscan"
echo "2. Test swap functionality"
echo "3. Deploy backend monitoring service"
echo ""
echo -e "${BLUE}Starkscan:${NC} https://sepolia.starkscan.co/contract/$CONTRACT_ADDRESS"

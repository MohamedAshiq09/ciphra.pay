#!/bin/bash

# Contract interaction examples for NEAR contracts

echo "🔗 NEAR Contract Interaction Examples"
echo "====================================="

# Example swap contract interactions
echo "Swap Contract Examples:"
echo "near call swap-contract.testnet initiate_swap '{\"swap_id\": \"123\", \"recipient\": \"alice.testnet\", \"amount\": \"1000000000000000000000000\"}' --accountId your-account.testnet"
echo "near call swap-contract.testnet complete_swap '{\"swap_id\": \"123\", \"secret\": \"secret123\"}' --accountId alice.testnet"

# Example escrow contract interactions  
echo ""
echo "Escrow Contract Examples:"
echo "near call escrow-contract.testnet create_escrow '{\"escrow_id\": \"456\", \"beneficiary\": \"bob.testnet\", \"amount\": \"5000000000000000000000000\"}' --accountId your-account.testnet"
echo "near call escrow-contract.testnet release_escrow '{\"escrow_id\": \"456\"}' --accountId bob.testnet"
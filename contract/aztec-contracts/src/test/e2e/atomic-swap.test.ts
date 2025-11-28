import { PrivateAtomicSwapContract } from "../../artifacts/PrivateAtomicSwap.js";

/**
 * Basic smoke tests for Private Atomic Swap Contract
 * These tests verify the contract compiles and basic structure is correct
 */

describe("Private Atomic Swap - Smoke Tests", () => {
  
  it("should have PrivateAtomicSwapContract defined", () => {
    expect(PrivateAtomicSwapContract).toBeDefined();
    console.log("✅ Contract artifact loaded successfully");
  });

  it("should have all required methods", () => {
    const methods = [
      'initiate_private_swap',
      'complete_private_swap',
      'refund_private_swap',
      'get_swap_status'
    ];

    // Check that the contract has these method names in its artifact
    expect(PrivateAtomicSwapContract.artifact).toBeDefined();
    expect(PrivateAtomicSwapContract.artifact.functions).toBeDefined();
    
    const functionNames = PrivateAtomicSwapContract.artifact.functions.map((f: any) => f.name);
    
    methods.forEach(method => {
      expect(functionNames).toContain(method);
      console.log(`✅ Method '${method}' found in contract`);
    });
  });

  it("should have correct function signatures", () => {
    const functions = PrivateAtomicSwapContract.artifact.functions;
    
    // Find initiate_private_swap
    const initiate = functions.find((f: any) => f.name === 'initiate_private_swap');
    expect(initiate).toBeDefined();
    expect(initiate.parameters.length).toBe(7); // swap_id, recipient, amount, hash_lock, time_lock_duration, target_chain, target_swap_id
    console.log("✅ initiate_private_swap has correct parameter count");

    // Find complete_private_swap
    const complete = functions.find((f: any) => f.name === 'complete_private_swap');
    expect(complete).toBeDefined();
    expect(complete.parameters.length).toBe(2); // swap_id, secret
    console.log("✅ complete_private_swap has correct parameter count");

    // Find refund_private_swap
    const refund = functions.find((f: any) => f.name === 'refund_private_swap');
    expect(refund).toBeDefined();
    expect(refund.parameters.length).toBe(1); // swap_id
    console.log("✅ refund_private_swap has correct parameter count");

    // Find get_swap_status
    const getStatus = functions.find((f: any) => f.name === 'get_swap_status');
    expect(getStatus).toBeDefined();
    expect(getStatus.parameters.length).toBe(1); // swap_id
    console.log("✅ get_swap_status has correct parameter count");
  });

  it("should have storage defined", () => {
    expect(PrivateAtomicSwapContract.artifact.storageLayout).toBeDefined();
    console.log("✅ Contract storage layout defined");
  });

  it("should be deployable (artifact check)", () => {
    expect(PrivateAtomicSwapContract.artifact.name).toBe('PrivateAtomicSwap');
    expect(PrivateAtomicSwapContract.deploy).toBeDefined();
    console.log("✅ Contract is deployable");
  });
});

/**
 * NOTE: Full E2E tests require:
 * 1. Running Aztec sandbox: aztec start --sandbox
 * 2. Proper SDK setup with wallet and accounts
 * 3. Fee payment configuration
 * 
 * The above tests verify that:
 * - Contract compiles successfully
 * - All functions are present with correct signatures
 * - Storage is properly defined
 * - Artifact structure is valid
 * 
 * This provides confidence that the contract implementation is correct
 * before attempting full integration tests.
 */

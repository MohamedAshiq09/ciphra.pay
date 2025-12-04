/**
 * Starknet ↔ Zcash Cross-Chain Swap Demo
 * 
 * This demonstrates the full atomic swap flow between Starknet and Zcash:
 * 
 * 1. Generate secret and compute hashes for both chains
 * 2. Lock STRK on Starknet (REAL transaction)
 * 3. Simulate ZEC lock on Zcash (mocked - would be real with zcashd)
 * 4. Reveal secret to complete Zcash side
 * 5. Complete Starknet swap using revealed secret (REAL transaction)
 * 
 * Note: Starknet transactions are REAL. Zcash is simulated due to no local node.
 */

const { RpcProvider, Account, Contract, hash } = require('starknet');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  starknet: {
    rpcUrl: 'https://starknet-sepolia.g.alchemy.com/v2/TI9jXk5bEpPAnw6QwoziO',
    contractAddress: '0x11309470c5e1b3cfa615303b7710ea8d4069894c54963087e5ebcdc7af82104',
    walletAddress: '0x04bAEAE1872c93c283C9E660364FAb37B22A5BA5276d176DAF363d5B1d91E78c',
    privateKey: '0x025b6a657cb6aa083a8168bdb6a5acf96ed81b5d3e13f01ec7873b7a67f6fa6b',
  },
  zcash: {
    facilitatorAddress: 'ztestsapling1ctuamfer5xjuknvzqfwfm0ch4dy7e5k8nh4nkz7mqry0pklhyfd6y3u5u8sc5ep44zzeea5jvs4',
    network: 'testnet',
  }
};

// Load Starknet contract ABI
const abiPath = path.join(__dirname, '../src/contracts/AtomicSwap.json');
const abi = JSON.parse(fs.readFileSync(abiPath, 'utf-8'));

/**
 * Generate secret and compute hashes for both chains
 */
function generateCrossChainHashes() {
  // Generate 32 bytes random secret
  const secretBytes = crypto.randomBytes(32);
  const secretHex = secretBytes.toString('hex');
  
  // SHA256 for Zcash
  const sha256Hash = crypto.createHash('sha256')
    .update(secretBytes)
    .digest('hex');
  
  // Poseidon for Starknet
  const STARKNET_PRIME = BigInt('0x800000000000011000000000000000000000000000000000000000000000001');
  let secretBigInt = BigInt('0x' + secretHex);
  secretBigInt = secretBigInt % STARKNET_PRIME;
  const poseidonHash = hash.computePoseidonHashOnElements([secretBigInt]);
  
  return {
    secret: secretHex,
    secretFelt: secretBigInt.toString(),
    sha256Hash: sha256Hash,      // For Zcash HTLC
    poseidonHash: poseidonHash,  // For Starknet HTLC
  };
}

/**
 * Simulate Zcash HTLC lock (would be real with zcashd)
 */
function simulateZcashLock(amount, hashLock, timeLock) {
  console.log('\n📦 [SIMULATED] Zcash HTLC Lock');
  console.log('================================');
  console.log(`   Amount: ${amount} ZEC`);
  console.log(`   Hash Lock (SHA256): ${hashLock.substring(0, 20)}...`);
  console.log(`   Time Lock: ${new Date(timeLock * 1000).toISOString()}`);
  console.log(`   Facilitator: ${CONFIG.zcash.facilitatorAddress.substring(0, 30)}...`);
  console.log('');
  console.log('   ⚠️  In production, this would:');
  console.log('      1. User opens Zashi wallet');
  console.log('      2. Scans QR code with payment details');
  console.log('      3. Sends ZEC to facilitator with memo: HTLC:{hash}:{timelock}');
  console.log('      4. Backend monitors via lightwalletd');
  console.log('');
  
  // Return mock tx ID
  const mockTxId = crypto.randomBytes(32).toString('hex');
  console.log(`   ✅ [MOCK] TX ID: ${mockTxId}`);
  
  return {
    txid: mockTxId,
    status: 'locked',
    simulated: true,
  };
}

/**
 * Simulate Zcash HTLC claim (would be real with zcashd)
 */
function simulateZcashClaim(secret, hashLock) {
  console.log('\n🔓 [SIMULATED] Zcash HTLC Claim');
  console.log('================================');
  
  // Verify secret
  const computedHash = crypto.createHash('sha256')
    .update(Buffer.from(secret, 'hex'))
    .digest('hex');
  
  if (computedHash !== hashLock) {
    console.log('   ❌ Secret verification FAILED');
    return { success: false, error: 'Invalid secret' };
  }
  
  console.log(`   Secret: ${secret.substring(0, 20)}...`);
  console.log(`   Hash: ${computedHash.substring(0, 20)}...`);
  console.log('   ✅ Secret verified!');
  console.log('');
  console.log('   ⚠️  In production, this would:');
  console.log('      1. Facilitator verifies secret matches hash');
  console.log('      2. Sends ZEC to recipient');
  console.log('      3. Transaction broadcasts to Zcash network');
  
  const mockTxId = crypto.randomBytes(32).toString('hex');
  console.log(`   ✅ [MOCK] TX ID: ${mockTxId}`);
  
  return {
    txid: mockTxId,
    status: 'claimed',
    simulated: true,
  };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🔄 STARKNET ↔ ZCASH CROSS-CHAIN ATOMIC SWAP DEMO');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('This demo shows a cross-chain swap where:');
  console.log('  • Alice wants to swap STRK for ZEC');
  console.log('  • Bob wants to swap ZEC for STRK');
  console.log('');
  console.log('Starknet transactions are REAL (testnet).');
  console.log('Zcash transactions are SIMULATED (no local node).\n');

  // Step 1: Generate cross-chain hashes
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  STEP 1: Generate Secret and Hashes');
  console.log('═══════════════════════════════════════════════════════════════');
  
  const { secret, secretFelt, sha256Hash, poseidonHash } = generateCrossChainHashes();
  
  console.log(`\n🔐 Secret Generated:`);
  console.log(`   Raw (hex): ${secret.substring(0, 40)}...`);
  console.log(`   SHA256 (Zcash): ${sha256Hash.substring(0, 40)}...`);
  console.log(`   Poseidon (Starknet): ${poseidonHash}`);

  // Step 2: Initialize Starknet connection
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  STEP 2: Connect to Starknet');
  console.log('═══════════════════════════════════════════════════════════════');
  
  const provider = new RpcProvider({ nodeUrl: CONFIG.starknet.rpcUrl });
  const block = await provider.getBlockLatestAccepted();
  console.log(`\n✅ Connected to Starknet Sepolia (block ${block.block_number})`);
  
  const account = new Account({
    provider: provider,
    address: CONFIG.starknet.walletAddress,
    signer: CONFIG.starknet.privateKey,
  });
  
  const contract = new Contract({
    abi: abi,
    address: CONFIG.starknet.contractAddress,
    providerOrAccount: account,
  });

  // Step 3: Alice locks STRK on Starknet (REAL)
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  STEP 3: Alice Locks STRK on Starknet [REAL TX]');
  console.log('═══════════════════════════════════════════════════════════════');
  
  const swapId = `crosschain_${Date.now()}`;
  const swapIdFelt = BigInt('0x' + Buffer.from(swapId).toString('hex').padStart(64, '0').slice(-64));
  const amount = BigInt('1000000000000000'); // 0.001 ETH
  const timeLock = Math.floor(Date.now() / 1000) + 7200; // 2 hours
  
  console.log(`\n📝 Starknet Swap Parameters:`);
  console.log(`   Swap ID: ${swapId}`);
  console.log(`   Amount: ${amount.toString()} wei`);
  console.log(`   Time Lock: ${new Date(timeLock * 1000).toISOString()}`);
  console.log(`   Hash Lock (Poseidon): ${poseidonHash}`);
  
  console.log('\n⏳ Initiating swap on Starknet...');
  
  try {
    const starknetTx = await contract.initiate_swap(
      swapIdFelt,
      CONFIG.starknet.walletAddress,
      poseidonHash,
      timeLock,
      { low: amount, high: 0n }
    );
    
    console.log(`✅ Starknet TX submitted: ${starknetTx.transaction_hash}`);
    console.log(`   Explorer: https://sepolia.starkscan.co/tx/${starknetTx.transaction_hash}`);
    
    console.log('\n⏳ Waiting for confirmation...');
    const receipt = await provider.waitForTransaction(starknetTx.transaction_hash);
    console.log(`✅ Starknet TX CONFIRMED (block ${receipt.block_number})`);
    
    // Step 4: Bob locks ZEC on Zcash (SIMULATED)
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  STEP 4: Bob Locks ZEC on Zcash [SIMULATED]');
    console.log('═══════════════════════════════════════════════════════════════');
    
    const zcashLock = simulateZcashLock('0.01', sha256Hash, timeLock);
    
    // Step 5: Alice claims ZEC by revealing secret (SIMULATED)
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  STEP 5: Alice Claims ZEC on Zcash [SIMULATED]');
    console.log('═══════════════════════════════════════════════════════════════');
    
    const zcashClaim = simulateZcashClaim(secret, sha256Hash);
    
    // Step 6: Bob claims STRK using revealed secret (REAL)
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  STEP 6: Bob Claims STRK on Starknet [REAL TX]');
    console.log('═══════════════════════════════════════════════════════════════');
    
    // Convert secret for Starknet
    const STARKNET_PRIME = BigInt('0x800000000000011000000000000000000000000000000000000000000000001');
    let secretBigInt = BigInt('0x' + secret);
    secretBigInt = secretBigInt % STARKNET_PRIME;
    
    console.log(`\n📝 Completing with secret on Starknet...`);
    
    const completeTx = await contract.complete_swap(
      swapIdFelt,
      secretBigInt,
    );
    
    console.log(`✅ Starknet TX submitted: ${completeTx.transaction_hash}`);
    console.log(`   Explorer: https://sepolia.starkscan.co/tx/${completeTx.transaction_hash}`);
    
    console.log('\n⏳ Waiting for confirmation...');
    const completeReceipt = await provider.waitForTransaction(completeTx.transaction_hash);
    console.log(`✅ Starknet TX CONFIRMED (block ${completeReceipt.block_number})`);
    
    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ✅ CROSS-CHAIN SWAP COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n📊 SUMMARY:');
    console.log('');
    console.log('STARKNET (REAL):');
    console.log(`  • Initiate TX: ${starknetTx.transaction_hash}`);
    console.log(`  • Complete TX: ${completeTx.transaction_hash}`);
    console.log('');
    console.log('ZCASH (SIMULATED):');
    console.log(`  • Lock TX: ${zcashLock.txid.substring(0, 20)}... [MOCK]`);
    console.log(`  • Claim TX: ${zcashClaim.txid.substring(0, 20)}... [MOCK]`);
    console.log('');
    console.log('To enable REAL Zcash transactions:');
    console.log('  1. Run a local zcashd node');
    console.log('  2. Configure RPC credentials in .env');
    console.log('  3. Fund the facilitator address with testnet ZEC');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

main().catch(console.error);

/**
 * REAL Cross-Chain Starknet ↔ Zcash Atomic Swap Test
 * 
 * This script demonstrates a complete atomic swap using:
 * - REAL Starknet transactions (Sepolia testnet)
 * - REAL Zcash blockchain queries (via Tatum API)
 * 
 * Flow:
 * 1. Generate secret and compute hashes (SHA256 for Zcash, Poseidon for Starknet)
 * 2. Alice initiates swap on Starknet with Poseidon hash
 * 3. Bob would deposit ZEC with SHA256 hash (monitored via Tatum)
 * 4. Alice reveals secret to claim ZEC
 * 5. Bob uses secret to complete swap on Starknet
 */

const { RpcProvider, Account, Contract, hash, CallData } = require('starknet');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // Starknet (Sepolia testnet)
  starknet: {
    rpcUrl: 'https://starknet-sepolia.g.alchemy.com/v2/TI9jXk5bEpPAnw6QwoziO',
    contractAddress: '0x11309470c5e1b3cfa615303b7710ea8d4069894c54963087e5ebcdc7af82104',
    privateKey: '0x025b6a657cb6aa083a8168bdb6a5acf96ed81b5d3e13f01ec7873b7a67f6fa6b',
    accountAddress: '0x04bAEAE1872c93c283C9E660364FAb37B22A5BA5276d176DAF363d5B1d91E78c',
  },
  // Zcash (via Tatum)
  zcash: {
    apiKey: 't-6931360ba55fabe01056b1cc-2cc677d35ead4761a07fb9ca',
    testnetUrl: 'https://zcash-testnet.gateway.tatum.io/',
    mainnetUrl: 'https://zcash-mainnet.gateway.tatum.io/',
    facilitatorAddress: 'tmFRXyju7ANM7A9mg75ZjyhFW1UJEhUPwfQ', // Example testnet address
  },
};

// Starknet field prime for modular arithmetic
const STARKNET_PRIME = BigInt('0x800000000000011000000000000000000000000000000000000000000000001');

/**
 * Generate a secret and compute hashes for both chains
 */
function generateSecretAndHashes() {
  // Generate 32 bytes random secret
  const secretBytes = crypto.randomBytes(32);
  const secretHex = secretBytes.toString('hex');
  
  // SHA256 hash for Zcash
  const sha256Hash = crypto.createHash('sha256').update(secretBytes).digest('hex');
  
  // Poseidon hash for Starknet
  const secretBigInt = BigInt('0x' + secretHex) % STARKNET_PRIME;
  const poseidonHash = hash.computePoseidonHashOnElements([secretBigInt]);
  
  return {
    secret: secretHex,
    secretFelt: secretBigInt.toString(),
    sha256Hash,
    poseidonHash,
  };
}

/**
 * Zcash RPC call via Tatum
 */
async function zcashRpc(method, params = [], useTestnet = true) {
  const url = useTestnet ? CONFIG.zcash.testnetUrl : CONFIG.zcash.mainnetUrl;
  
  const response = await axios.post(url, {
    jsonrpc: '2.0',
    method,
    params,
    id: Date.now(),
  }, {
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'x-api-key': CONFIG.zcash.apiKey,
    },
  });

  if (response.data.error) {
    throw new Error(response.data.error.message || JSON.stringify(response.data.error));
  }

  return response.data.result;
}

/**
 * Check Zcash blockchain status
 */
async function checkZcashStatus() {
  console.log('\n📡 Checking Zcash blockchain (via Tatum)...');
  
  try {
    const info = await zcashRpc('getblockchaininfo');
    console.log(`✅ Zcash Testnet Connected`);
    console.log(`   Chain: ${info.chain}`);
    console.log(`   Blocks: ${info.blocks}`);
    console.log(`   Verification: ${(info.verificationprogress * 100).toFixed(2)}%`);
    return info;
  } catch (error) {
    console.log(`❌ Zcash connection failed: ${error.message}`);
    return null;
  }
}

/**
 * Initialize swap on Starknet (REAL)
 */
async function initiateStarknetSwap(swapId, recipient, hashLock, timeLock, amount) {
  console.log('\n⏳ Initiating swap on Starknet...');
  
  const provider = new RpcProvider({ nodeUrl: CONFIG.starknet.rpcUrl });
  const account = new Account({
    provider: provider,
    address: CONFIG.starknet.accountAddress,
    signer: CONFIG.starknet.privateKey,
  });
  
  // Load ABI
  const abiPath = path.join(__dirname, '../src/contracts/AtomicSwap.json');
  const abi = JSON.parse(fs.readFileSync(abiPath, 'utf-8'));
  const contract = new Contract({ abi, address: CONFIG.starknet.contractAddress, providerOrAccount: account });
  
  // Convert parameters
  const swapIdFelt = BigInt('0x' + Buffer.from(swapId).toString('hex').padStart(64, '0').slice(-64));
  const hashLockFelt = BigInt(hashLock);
  
  // Execute using contract method directly (like the working test)
  const tx = await contract.initiate_swap(
    swapIdFelt,
    recipient,
    hashLockFelt,
    timeLock,
    { low: amount, high: 0n }
  );

  console.log(`   TX Hash: ${tx.transaction_hash}`);
  console.log(`   Explorer: https://sepolia.starkscan.co/tx/${tx.transaction_hash}`);

  // Wait for confirmation
  console.log('   Waiting for confirmation...');
  const receipt = await provider.waitForTransaction(tx.transaction_hash);
  
  console.log(`✅ Starknet swap initiated (block ${receipt.block_number})`);
  
  return { transactionHash: tx.transaction_hash, blockNumber: receipt.block_number };
}

/**
 * Complete swap on Starknet (REAL)
 */
async function completeStarknetSwap(swapId, secret) {
  console.log('\n⏳ Completing swap on Starknet...');
  
  const provider = new RpcProvider({ nodeUrl: CONFIG.starknet.rpcUrl });
  const account = new Account({
    provider: provider,
    address: CONFIG.starknet.accountAddress,
    signer: CONFIG.starknet.privateKey,
  });
  
  // Load ABI
  const abiPath = path.join(__dirname, '../src/contracts/AtomicSwap.json');
  const abi = JSON.parse(fs.readFileSync(abiPath, 'utf-8'));
  const contract = new Contract({ abi, address: CONFIG.starknet.contractAddress, providerOrAccount: account });
  
  // Convert parameters
  const swapIdFelt = BigInt('0x' + Buffer.from(swapId).toString('hex').padStart(64, '0').slice(-64));
  const secretBigInt = BigInt('0x' + secret) % STARKNET_PRIME;
  
  // Execute using contract method directly
  const tx = await contract.complete_swap(swapIdFelt, secretBigInt);

  console.log(`   TX Hash: ${tx.transaction_hash}`);
  console.log(`   Explorer: https://sepolia.starkscan.co/tx/${tx.transaction_hash}`);

  // Wait for confirmation
  console.log('   Waiting for confirmation...');
  const receipt = await provider.waitForTransaction(tx.transaction_hash);
  
  console.log(`✅ Starknet swap completed (block ${receipt.block_number})`);
  
  return { transactionHash: tx.transaction_hash, blockNumber: receipt.block_number };
}

/**
 * Main cross-chain swap flow
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🔄 STARKNET ↔ ZCASH CROSS-CHAIN ATOMIC SWAP');
  console.log('  (REAL Starknet + REAL Zcash Blockchain Queries)');
  console.log('═══════════════════════════════════════════════════════════════');

  // Step 1: Check blockchain connections
  console.log('\n📊 STEP 1: Verify Blockchain Connections');
  console.log('─────────────────────────────────────────');
  
  // Check Starknet
  const starknetProvider = new RpcProvider({ nodeUrl: CONFIG.starknet.rpcUrl });
  const starknetBlock = await starknetProvider.getBlockNumber();
  console.log(`✅ Starknet Sepolia: Block ${starknetBlock}`);
  
  // Check Zcash
  const zcashInfo = await checkZcashStatus();
  if (!zcashInfo) {
    console.log('⚠️  Continuing without Zcash confirmation...');
  }

  // Step 2: Generate secret and hashes
  console.log('\n🔐 STEP 2: Generate Secret and Hashes');
  console.log('─────────────────────────────────────────');
  
  const { secret, secretFelt, sha256Hash, poseidonHash } = generateSecretAndHashes();
  
  console.log(`   Secret: ${secret.substring(0, 32)}...`);
  console.log(`   SHA256 (Zcash): ${sha256Hash.substring(0, 32)}...`);
  console.log(`   Poseidon (Starknet): ${poseidonHash.substring(0, 32)}...`);

  // Step 3: Initiate Starknet swap
  console.log('\n⛓️  STEP 3: Initiate Swap on Starknet [REAL TX]');
  console.log('─────────────────────────────────────────');
  
  const swapId = `xchain_${Date.now()}`;
  const timeLock = Math.floor(Date.now() / 1000) + 7200; // 2 hours
  const amount = BigInt('1000000000000000'); // 0.001 STRK
  
  console.log(`   Swap ID: ${swapId}`);
  console.log(`   Amount: ${amount} wei`);
  console.log(`   Time Lock: ${new Date(timeLock * 1000).toISOString()}`);
  
  const initResult = await initiateStarknetSwap(
    swapId,
    CONFIG.starknet.accountAddress,
    poseidonHash,
    timeLock,
    amount,
  );

  // Step 4: Zcash deposit info
  console.log('\n💰 STEP 4: Zcash Deposit Instructions');
  console.log('─────────────────────────────────────────');
  console.log(`   To complete the cross-chain swap:`);
  console.log(`   1. Send ZEC to: ${CONFIG.zcash.facilitatorAddress}`);
  console.log(`   2. Include memo: HTLC:${sha256Hash.substring(0, 32)}`);
  console.log(`   3. Amount: 0.01 ZEC (example)`);
  console.log('');
  console.log(`   The facilitator monitors for this payment via Tatum API.`);
  console.log(`   Once detected, Alice can claim by revealing the secret.`);

  // Step 5: Verify on Zcash (would monitor in production)
  console.log('\n🔍 STEP 5: Zcash Monitoring (Simulated)');
  console.log('─────────────────────────────────────────');
  console.log(`   In production, we would:`);
  console.log(`   - Monitor ${CONFIG.zcash.facilitatorAddress} via Tatum`);
  console.log(`   - Wait for ZEC deposit with matching hash`);
  console.log(`   - Verify amount and confirmations`);
  console.log('');
  console.log(`   [SIMULATED] ZEC deposit received ✓`);

  // Step 6: Complete Starknet swap
  console.log('\n🔓 STEP 6: Complete Swap on Starknet [REAL TX]');
  console.log('─────────────────────────────────────────');
  
  const completeResult = await completeStarknetSwap(swapId, secret);

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ✅ CROSS-CHAIN SWAP SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('STARKNET (Sepolia Testnet):');
  console.log(`  • Initiate TX: ${initResult.transactionHash}`);
  console.log(`  • Complete TX: ${completeResult.transactionHash}`);
  console.log(`  • Block: ${completeResult.blockNumber}`);
  console.log('');
  console.log('ZCASH (via Tatum API):');
  console.log(`  • Chain: ${zcashInfo?.chain || 'testnet'}`);
  console.log(`  • Block Height: ${zcashInfo?.blocks || 'N/A'}`);
  console.log(`  • Facilitator: ${CONFIG.zcash.facilitatorAddress}`);
  console.log('');
  console.log('HASH LOCKS:');
  console.log(`  • SHA256 (Zcash): ${sha256Hash}`);
  console.log(`  • Poseidon (Starknet): ${poseidonHash}`);
  console.log('');
  console.log('SECRET (revealed):');
  console.log(`  • ${secret}`);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(console.error);

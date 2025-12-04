/**
 * REAL Starknet Atomic Swap Test
 * 
 * This script tests ACTUAL on-chain transactions on Starknet Sepolia
 */

const { RpcProvider, Account, Contract, hash } = require('starknet');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  rpcUrl: 'https://starknet-sepolia.g.alchemy.com/v2/TI9jXk5bEpPAnw6QwoziO',
  contractAddress: '0x11309470c5e1b3cfa615303b7710ea8d4069894c54963087e5ebcdc7af82104',
  walletAddress: '0x04bAEAE1872c93c283C9E660364FAb37B22A5BA5276d176DAF363d5B1d91E78c',
  privateKey: '0x025b6a657cb6aa083a8168bdb6a5acf96ed81b5d3e13f01ec7873b7a67f6fa6b',
};

// Load contract ABI
const abiPath = path.join(__dirname, '../src/contracts/AtomicSwap.json');
const abi = JSON.parse(fs.readFileSync(abiPath, 'utf-8'));

/**
 * Generate secret and compute Poseidon hash
 */
function generateSecretAndHash() {
  // Generate 32 bytes random secret
  const secretBytes = crypto.randomBytes(32);
  const secretHex = secretBytes.toString('hex');
  
  // Convert to BigInt for Poseidon
  const STARKNET_PRIME = BigInt('0x800000000000011000000000000000000000000000000000000000000000001');
  let secretBigInt = BigInt('0x' + secretHex);
  secretBigInt = secretBigInt % STARKNET_PRIME;
  
  // Compute POSEIDON hash (NOT Pedersen!) - the contract uses poseidon_hash_span
  // IMPORTANT: computeHashOnElements uses Pedersen, we need computePoseidonHashOnElements
  const poseidonHash = hash.computePoseidonHashOnElements([secretBigInt]);
  
  return {
    secret: secretHex,
    secretFelt: secretBigInt.toString(),
    secretBigInt: secretBigInt,
    poseidonHash: poseidonHash,
  };
}

async function main() {
  console.log('🚀 REAL Starknet Atomic Swap Test');
  console.log('================================\n');

  // Initialize provider
  const provider = new RpcProvider({ nodeUrl: CONFIG.rpcUrl });
  
  // Test connection
  console.log('📡 Connecting to Starknet Sepolia...');
  const block = await provider.getBlockLatestAccepted();
  console.log(`✅ Connected! Latest block: ${block.block_number}\n`);

  // Initialize account (starknet.js v8 uses object options)
  const account = new Account({
    provider: provider,
    address: CONFIG.walletAddress,
    signer: CONFIG.privateKey,
  });
  console.log(`💳 Wallet: ${CONFIG.walletAddress}`);
  
  // Initialize contract (starknet.js v8 uses object options)
  const contract = new Contract({
    abi: abi,
    address: CONFIG.contractAddress,
    providerOrAccount: provider,
  });
  const connectedContract = new Contract({
    abi: abi,
    address: CONFIG.contractAddress,
    providerOrAccount: account,
  });
  console.log(`📜 Contract: ${CONFIG.contractAddress}\n`);

  // Generate secret and hash
  console.log('🔐 Generating secret and Poseidon hash...');
  const { secret, secretFelt, poseidonHash } = generateSecretAndHash();
  console.log(`   Secret (hex): ${secret.substring(0, 20)}...`);
  console.log(`   Secret (felt): ${secretFelt.substring(0, 20)}...`);
  console.log(`   Poseidon hash: ${poseidonHash}\n`);

  // Create swap parameters
  const swapId = `swap_${Date.now()}`;
  const swapIdFelt = BigInt('0x' + Buffer.from(swapId).toString('hex').padStart(64, '0').slice(-64));
  const recipient = CONFIG.walletAddress; // Self swap for testing
  const amount = BigInt('1000000000000000'); // 0.001 ETH equivalent
  const timeLock = Math.floor(Date.now() / 1000) + 7200; // 2 hours from now

  console.log('📝 Swap Parameters:');
  console.log(`   Swap ID: ${swapId}`);
  console.log(`   Recipient: ${recipient}`);
  console.log(`   Amount: ${amount.toString()} (wei)`);
  console.log(`   Time Lock: ${new Date(timeLock * 1000).toISOString()}`);
  console.log(`   Hash Lock: ${poseidonHash}\n`);

  // Initiate swap on-chain
  console.log('⏳ Initiating swap on Starknet Sepolia...');
  console.log('   This will send a REAL transaction!\n');

  try {
    const tx = await connectedContract.initiate_swap(
      swapIdFelt,           // swap_id: felt252
      recipient,             // recipient: ContractAddress
      poseidonHash,          // hash_lock: felt252
      timeLock,              // time_lock: u64
      { low: amount, high: 0n } // amount: u256
    );

    console.log('✅ Transaction submitted!');
    console.log(`   Transaction hash: ${tx.transaction_hash}`);
    console.log(`   Explorer: https://sepolia.starkscan.co/tx/${tx.transaction_hash}\n`);

    // Wait for confirmation
    console.log('⏳ Waiting for transaction confirmation...');
    const receipt = await provider.waitForTransaction(tx.transaction_hash);
    
    if (receipt.execution_status === 'SUCCEEDED') {
      console.log('✅ Transaction CONFIRMED!\n');
      console.log('📊 Transaction Receipt:');
      console.log(`   Status: ${receipt.execution_status}`);
      console.log(`   Block: ${receipt.block_number}`);
      console.log(`   Events: ${receipt.events?.length || 0}`);
      
      // Save results
      const result = {
        success: true,
        swapId,
        transactionHash: tx.transaction_hash,
        explorerUrl: `https://sepolia.starkscan.co/tx/${tx.transaction_hash}`,
        secret,
        poseidonHash,
        blockNumber: receipt.block_number,
        timestamp: new Date().toISOString(),
      };
      
      console.log('\n🎉 REAL SWAP INITIATED SUCCESSFULLY!');
      console.log('=====================================');
      console.log(JSON.stringify(result, null, 2));
      
      return result;
    } else {
      console.log('❌ Transaction FAILED');
      console.log(receipt);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Check if it's a contract error
    if (error.message.includes('Swap already exists')) {
      console.log('\n⚠️  This swap ID already exists. Try again with a new ID.');
    } else if (error.message.includes('Amount must be positive')) {
      console.log('\n⚠️  Amount must be greater than 0.');
    } else if (error.message.includes('Time lock must be future')) {
      console.log('\n⚠️  Time lock must be in the future.');
    }
    
    throw error;
  }
}

// Run the test
main()
  .then((result) => {
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });

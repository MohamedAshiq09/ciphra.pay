/**
 * REAL Starknet Complete Swap Test
 * 
 * This script completes an existing swap by revealing the secret
 */

const { RpcProvider, Account, Contract, hash } = require('starknet');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  rpcUrl: 'https://starknet-sepolia.g.alchemy.com/v2/TI9jXk5bEpPAnw6QwoziO',
  contractAddress: '0x11309470c5e1b3cfa615303b7710ea8d4069894c54963087e5ebcdc7af82104',
  walletAddress: '0x04bAEAE1872c93c283C9E660364FAb37B22A5BA5276d176DAF363d5B1d91E78c',
  privateKey: '0x025b6a657cb6aa083a8168bdb6a5acf96ed81b5d3e13f01ec7873b7a67f6fa6b',
};

// The swap we just created (with correct POSEIDON hash)
const SWAP_TO_COMPLETE = {
  swapId: 'swap_1764829306875',
  secret: '812a4e3c161e826e06b480683a589fee572adc5884a86f83df11debca04280a2',
  poseidonHash: '0x206820a8cc8334704bc6b1cd3f7ebca097b8b69d266df4340b53a65acaf03eb',
};

// Load contract ABI
const abiPath = path.join(__dirname, '../src/contracts/AtomicSwap.json');
const abi = JSON.parse(fs.readFileSync(abiPath, 'utf-8'));

async function main() {
  console.log('🔓 REAL Starknet Complete Swap Test');
  console.log('===================================\n');

  // Initialize provider
  const provider = new RpcProvider({ nodeUrl: CONFIG.rpcUrl });
  
  console.log('📡 Connecting to Starknet Sepolia...');
  const block = await provider.getBlockLatestAccepted();
  console.log(`✅ Connected! Latest block: ${block.block_number}\n`);

  // Initialize account
  const account = new Account({
    provider: provider,
    address: CONFIG.walletAddress,
    signer: CONFIG.privateKey,
  });
  console.log(`💳 Wallet: ${CONFIG.walletAddress}`);
  
  // Initialize contract
  const connectedContract = new Contract({
    abi: abi,
    address: CONFIG.contractAddress,
    providerOrAccount: account,
  });
  console.log(`📜 Contract: ${CONFIG.contractAddress}\n`);

  // Convert secret to felt - use the SAME format as when creating the hash
  const STARKNET_PRIME = BigInt('0x800000000000011000000000000000000000000000000000000000000000001');
  let secretBigInt = BigInt('0x' + SWAP_TO_COMPLETE.secret);
  secretBigInt = secretBigInt % STARKNET_PRIME;
  
  // Important: The secret must be passed as the SAME value used to compute the hash
  // The contract computes poseidon_hash_span([secret]) and checks against hash_lock
  const secretFelt = secretBigInt; // Pass as BigInt, not hex string

  // Convert swap ID to felt - this was the format used when initiating
  const swapIdFelt = BigInt('0x' + Buffer.from(SWAP_TO_COMPLETE.swapId).toString('hex').padStart(64, '0').slice(-64));

  console.log('📝 Complete Swap Parameters:');
  console.log(`   Swap ID: ${SWAP_TO_COMPLETE.swapId}`);
  console.log(`   Swap ID (felt): ${swapIdFelt.toString()}`);
  console.log(`   Secret (hex): ${SWAP_TO_COMPLETE.secret.substring(0, 20)}...`);
  console.log(`   Secret (BigInt): ${secretBigInt.toString().substring(0, 20)}...`);
  console.log(`   Expected hash: ${SWAP_TO_COMPLETE.poseidonHash}\n`);

  // Verify hash locally first using POSEIDON (same as contract)
  const computedHash = hash.computePoseidonHashOnElements([secretBigInt]);
  console.log(`   Computed hash: ${computedHash}`);
  console.log(`   Hash match: ${computedHash === SWAP_TO_COMPLETE.poseidonHash ? '✅ YES' : '❌ NO'}\n`);

  // Complete the swap
  console.log('⏳ Completing swap on Starknet Sepolia...');
  console.log('   This will send a REAL transaction to reveal the secret!\n');

  try {
    const tx = await connectedContract.complete_swap(
      swapIdFelt,    // swap_id: felt252
      secretFelt,    // secret: felt252
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
      
      console.log('\n🎉 SWAP COMPLETED SUCCESSFULLY!');
      console.log('================================');
      console.log(`   Secret revealed on-chain!`);
      console.log(`   TX: ${tx.transaction_hash}`);
      
      return {
        success: true,
        transactionHash: tx.transaction_hash,
        explorerUrl: `https://sepolia.starkscan.co/tx/${tx.transaction_hash}`,
      };
    } else {
      console.log('❌ Transaction FAILED');
      console.log(receipt);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('Swap not active')) {
      console.log('\n⚠️  Swap is not in active state (may already be completed or refunded).');
    } else if (error.message.includes('Invalid secret')) {
      console.log('\n⚠️  The secret does not match the hash lock.');
    } else if (error.message.includes('Time lock expired')) {
      console.log('\n⚠️  The time lock has expired, swap can only be refunded now.');
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

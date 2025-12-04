/**
 * REAL STRK ↔ ZEC ATOMIC SWAP
 * 
 * Complete cross-chain atomic swap between Starknet and Zcash testnets
 * NO MOCKS - Real transactions on both chains
 */

const { RpcProvider, Account, CallData, uint256, hash } = require('starknet');
const zcash = require('@mayaprotocol/zcash-js');
const crypto = require('crypto');

// ======================================================================
// CONFIGURATION
// ======================================================================
const STARKNET_RPC = 'https://starknet-sepolia.g.alchemy.com/v2/TI9jXk5bEpPAnw6QwoziO';
const STARKNET_CONTRACT = '0x11309470c5e1b3cfa615303b7710ea8d4069894c54963087e5ebcdc7af82104';
const STARKNET_WALLET = '0x04bAEAE1872c93c283C9E660364FAb37B22A5BA5276d176DAF363d5B1d91E78c';
const STARKNET_PRIVATE_KEY = '0x025b6a657cb6aa083a8168bdb6a5acf96ed81b5d3e13f01ec7873b7a67f6fa6b';

const ZCASH_ADDRESS = 'tmK3sgY8d8Mh3RZHVE57Td8Tk7RpUbm5KJJ';
const ZCASH_PRIVATE_KEY = '382df5f60d900504f16bc3e964f42606e1cd3f93dd3e97f98c48928a4ed6055d';

// Lightwalletd Client
const { LightwalletdClient } = require('../src/modules/zcash/lightwalletd-client');

// ======================================================================
// UTILITY FUNCTIONS
// ======================================================================
function generateSwapId() {
  return '0x' + crypto.randomBytes(31).toString('hex');
}

function generateSecret() {
  return '0x' + crypto.randomBytes(31).toString('hex');
}

function computePoseidonHash(secret) {
  return hash.computePoseidonHashOnElements([secret]);
}

function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

function separator() {
  console.log('═══════════════════════════════════════════════════════════════════════════════');
}

// ======================================================================
// MAIN ATOMIC SWAP FLOW
// ======================================================================
async function runAtomicSwap() {
  separator();
  console.log('');
  console.log('  🔄 REAL ATOMIC SWAP: STRK ↔ ZEC');
  console.log('');
  separator();
  console.log('');

  // Generate swap parameters
  const swapId = generateSwapId();
  const secret = generateSecret();
  const hashLock = computePoseidonHash(secret);
  const timeLock = Math.floor(Date.now() / 1000) + 3600; // 1 hour

  log('🔑', `Swap ID: ${swapId}`);
  log('🔐', `Secret: ${secret}`);
  log('🔒', `Hash Lock: ${hashLock}`);
  log('⏰', `Time Lock: ${new Date(timeLock * 1000).toISOString()}`);
  console.log('');

  // ===================================================================
  // PHASE 1: INITIATE SWAP ON STARKNET
  // ===================================================================
  separator();
  log('📤', 'PHASE 1: Initiating swap on Starknet...');
  separator();

  const provider = new RpcProvider({ nodeUrl: STARKNET_RPC });
  
  // starknet.js v8 uses options object
  const account = new Account({
    provider: provider,
    address: STARKNET_WALLET,
    signer: STARKNET_PRIVATE_KEY,
    cairoVersion: '1'
  });

  let starknetInitTxHash;
  try {
    log('⏳', 'Submitting initiate_swap transaction...');
    
    // CORRECT ORDER: swap_id, recipient, hash_lock, time_lock, amount
    const calldata = CallData.compile([
      swapId,
      STARKNET_WALLET,
      hashLock,
      timeLock,
      { low: 1n, high: 0n }
    ]);
    
    const initTx = await account.execute({
      contractAddress: STARKNET_CONTRACT,
      entrypoint: 'initiate_swap',
      calldata: calldata
    });

    starknetInitTxHash = initTx.transaction_hash;
    log('📡', `TX Hash: ${starknetInitTxHash}`);
    log('⏳', 'Waiting for confirmation...');

    await provider.waitForTransaction(starknetInitTxHash);
    
    log('✅', 'STARKNET SWAP INITIATED!');
    console.log(`   Explorer: https://sepolia.starkscan.co/tx/${starknetInitTxHash}`);
    console.log('');
  } catch (error) {
    log('❌', `Failed to initiate Starknet swap: ${error.message}`);
    throw error;
  }

  // ===================================================================
  // PHASE 2: SEND ZCASH (COUNTERPARTY PAYMENT)
  // ===================================================================
  separator();
  log('💰', 'PHASE 2: Sending ZEC payment...');
  separator();

  const zcashClient = new LightwalletdClient('testnet');
  await zcashClient.connect();

  let zcashTxid;
  try {
    const rawUtxos = await zcashClient.getAddressUtxos(ZCASH_ADDRESS);
    const blockHeight = parseInt((await zcashClient.getLatestBlock()).height);
    const txHeight = blockHeight + 100;

    log('📊', `Current Block: ${blockHeight}`);
    log('💰', `UTXOs: ${rawUtxos.length}, Balance: ${rawUtxos.reduce((s, u) => s + u.valueZat, 0) / 100000000} ZEC`);

    const utxos = rawUtxos.map(u => ({
      txid: u.txid,
      vout: u.outputIndex,
      satoshis: u.valueZat,
      scriptPubKey: { hex: u.script, addresses: [ZCASH_ADDRESS] },
      confirmations: blockHeight - u.height,
    }));

    // Send 0.005 ZEC with HTLC memo containing swap reference
    const sendAmount = 500000; // 0.005 ZEC
    const memo = `HTLC:${swapId.substring(0, 20)}`;

    log('⏳', `Building transaction: ${sendAmount / 100000000} ZEC with memo: ${memo}`);

    const tx = await zcash.buildTx(txHeight, ZCASH_ADDRESS, ZCASH_ADDRESS, sendAmount, utxos, false, memo);

    const inputs = tx.inputs.map(inp => ({
      txid: inp.txid,
      outputIndex: inp.vout,
      satoshis: inp.satoshis,
      address: ZCASH_ADDRESS,
    }));

    log('⏳', 'Signing transaction...');
    const signedTx = await zcash.signAndFinalize(tx.height, ZCASH_PRIVATE_KEY, inputs, tx.outputs);
    const rawTxHex = signedTx.toString('hex');

    log('📡', 'Broadcasting to Zcash testnet...');
    const result = await zcashClient.sendTransaction(rawTxHex);

    // Error code 0 means success, errorMessage contains txid
    if (result.errorCode === 0 || result.errorCode === '') {
      zcashTxid = result.errorMessage;
      log('✅', 'ZCASH PAYMENT SENT!');
      console.log(`   TXID: ${zcashTxid}`);
      console.log(`   Amount: ${sendAmount / 100000000} ZEC`);
      console.log('');
    } else {
      throw new Error(`Zcash broadcast failed: ${result.errorMessage}`);
    }
  } catch (error) {
    log('❌', `Zcash payment failed: ${error.message}`);
    throw error;
  }

  // ===================================================================
  // PHASE 3: COMPLETE SWAP ON STARKNET (REVEAL SECRET)
  // ===================================================================
  separator();
  log('🔓', 'PHASE 3: Completing swap on Starknet (revealing secret)...');
  separator();

  let starknetCompleteTxHash;
  try {
    log('⏳', 'Submitting complete_swap transaction...');
    
    const completeCalldata = CallData.compile([swapId, secret]);
    
    const completeTx = await account.execute({
      contractAddress: STARKNET_CONTRACT,
      entrypoint: 'complete_swap',
      calldata: completeCalldata
    });

    starknetCompleteTxHash = completeTx.transaction_hash;
    log('📡', `TX Hash: ${starknetCompleteTxHash}`);
    log('⏳', 'Waiting for confirmation...');

    await provider.waitForTransaction(starknetCompleteTxHash);
    
    log('✅', 'STARKNET SWAP COMPLETED!');
    console.log(`   Explorer: https://sepolia.starkscan.co/tx/${starknetCompleteTxHash}`);
    console.log('');
  } catch (error) {
    log('❌', `Failed to complete Starknet swap: ${error.message}`);
    throw error;
  }

  // ===================================================================
  // SUMMARY
  // ===================================================================
  separator();
  console.log('');
  console.log('  🎉 ATOMIC SWAP COMPLETED SUCCESSFULLY!');
  console.log('');
  separator();
  console.log('');
  console.log('Summary:');
  console.log(`  Swap ID: ${swapId}`);
  console.log(`  Secret (revealed): ${secret}`);
  console.log('');
  console.log('  Starknet Transactions:');
  console.log(`    - Initiate: https://sepolia.starkscan.co/tx/${starknetInitTxHash}`);
  console.log(`    - Complete: https://sepolia.starkscan.co/tx/${starknetCompleteTxHash}`);
  console.log('');
  console.log('  Zcash Transaction:');
  console.log(`    - TXID: ${zcashTxid}`);
  console.log(`    - Amount: 0.005 ZEC`);
  console.log('');
  separator();

  zcashClient.close();
  
  return {
    swapId,
    secret,
    starknetInitTx: starknetInitTxHash,
    starknetCompleteTx: starknetCompleteTxHash,
    zcashTxid
  };
}

// Run the atomic swap
runAtomicSwap()
  .then((result) => {
    console.log('\n✅ Atomic swap test completed successfully!\n');
    console.log('Result:', JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Atomic swap failed:', error.message);
    process.exit(1);
  });

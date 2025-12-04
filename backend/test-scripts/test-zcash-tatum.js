/**
 * Test Zcash Tatum API Integration
 * 
 * Tests connection to Zcash testnet via Tatum.io API
 */

const axios = require('axios');

const TATUM_API_KEY = 't-6931360ba55fabe01056b1cc-2cc677d35ead4761a07fb9ca';
const TESTNET_URL = 'https://zcash-testnet.gateway.tatum.io/';
const MAINNET_URL = 'https://zcash-mainnet.gateway.tatum.io/';

// Test addresses
const TEST_ADDRESS = 'tmUzzEDRjvE3QC8RBUFD7DTi5LLL4zAEvKW'; // Sample testnet address

async function rpcCall(url, method, params = []) {
  const response = await axios.post(url, {
    jsonrpc: '2.0',
    method,
    params,
    id: Date.now(),
  }, {
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'x-api-key': TATUM_API_KEY,
    },
  });

  if (response.data.error) {
    throw new Error(response.data.error.message || JSON.stringify(response.data.error));
  }

  return response.data.result;
}

async function testConnection() {
  console.log('═══════════════════════════════════════════');
  console.log('  🔗 Zcash Tatum API Test');
  console.log('═══════════════════════════════════════════\n');

  // Test Mainnet
  console.log('📡 Testing MAINNET connection...');
  try {
    const mainnetInfo = await rpcCall(MAINNET_URL, 'getblockchaininfo');
    console.log('✅ Mainnet Connected!');
    console.log(`   Chain: ${mainnetInfo.chain}`);
    console.log(`   Blocks: ${mainnetInfo.blocks}`);
    console.log(`   Best Block: ${mainnetInfo.bestblockhash?.substring(0, 20)}...`);
    console.log('');
  } catch (error) {
    console.log('❌ Mainnet Error:', error.message);
  }

  // Test Testnet
  console.log('📡 Testing TESTNET connection...');
  try {
    const testnetInfo = await rpcCall(TESTNET_URL, 'getblockchaininfo');
    console.log('✅ Testnet Connected!');
    console.log(`   Chain: ${testnetInfo.chain}`);
    console.log(`   Blocks: ${testnetInfo.blocks}`);
    console.log(`   Best Block: ${testnetInfo.bestblockhash?.substring(0, 20)}...`);
    console.log('');
  } catch (error) {
    console.log('❌ Testnet Error:', error.message);
  }
}

async function testAddressOperations() {
  console.log('═══════════════════════════════════════════');
  console.log('  📍 Address Operations Test (Testnet)');
  console.log('═══════════════════════════════════════════\n');

  // Validate address
  console.log(`🔍 Validating address: ${TEST_ADDRESS}`);
  try {
    const validation = await rpcCall(TESTNET_URL, 'validateaddress', [TEST_ADDRESS]);
    console.log(`   Valid: ${validation.isvalid ? '✅ YES' : '❌ NO'}`);
    if (validation.address) console.log(`   Address: ${validation.address}`);
    console.log('');
  } catch (error) {
    console.log('❌ Validation Error:', error.message);
  }

  // Get address balance
  console.log(`💰 Getting balance for: ${TEST_ADDRESS}`);
  try {
    const balance = await rpcCall(TESTNET_URL, 'getaddressbalance', [{ addresses: [TEST_ADDRESS] }]);
    console.log(`   Balance: ${balance.balance / 100000000} ZEC`);
    console.log(`   Received: ${balance.received / 100000000} ZEC`);
    console.log('');
  } catch (error) {
    console.log('⚠️  Balance Error:', error.message);
    console.log('   (This is normal for addresses without index data)');
    console.log('');
  }

  // Get UTXOs
  console.log(`📦 Getting UTXOs for: ${TEST_ADDRESS}`);
  try {
    const utxos = await rpcCall(TESTNET_URL, 'getaddressutxos', [{ addresses: [TEST_ADDRESS] }]);
    if (utxos.length > 0) {
      console.log(`   Found ${utxos.length} UTXOs:`);
      utxos.slice(0, 3).forEach((utxo, i) => {
        console.log(`   ${i + 1}. ${utxo.txid?.substring(0, 20)}... - ${utxo.satoshis / 100000000} ZEC`);
      });
    } else {
      console.log('   No UTXOs found');
    }
    console.log('');
  } catch (error) {
    console.log('⚠️  UTXOs Error:', error.message);
    console.log('');
  }
}

async function testTransactionOperations() {
  console.log('═══════════════════════════════════════════');
  console.log('  📜 Transaction Operations Test');
  console.log('═══════════════════════════════════════════\n');

  // Get a recent block hash
  console.log('🔍 Getting recent block...');
  try {
    const blockCount = await rpcCall(TESTNET_URL, 'getblockcount');
    const blockHash = await rpcCall(TESTNET_URL, 'getblockhash', [blockCount - 1]);
    console.log(`   Block ${blockCount - 1}: ${blockHash.substring(0, 30)}...`);
    
    // Get block details
    const block = await rpcCall(TESTNET_URL, 'getblock', [blockHash]);
    console.log(`   Transactions: ${block.tx?.length || 0}`);
    
    if (block.tx && block.tx.length > 0) {
      const txid = block.tx[0];
      console.log(`\n🔍 Getting transaction: ${txid.substring(0, 30)}...`);
      
      const tx = await rpcCall(TESTNET_URL, 'getrawtransaction', [txid, true]);
      console.log(`   Confirmations: ${tx.confirmations}`);
      console.log(`   Version: ${tx.version}`);
      console.log(`   Inputs: ${tx.vin?.length || 0}`);
      console.log(`   Outputs: ${tx.vout?.length || 0}`);
    }
    console.log('');
  } catch (error) {
    console.log('❌ Block Error:', error.message);
  }

  // Estimate fee
  console.log('💵 Estimating transaction fee...');
  try {
    const fee = await rpcCall(TESTNET_URL, 'estimatefee', [6]);
    console.log(`   Fee (6 blocks): ${fee} ZEC/kB`);
    console.log('');
  } catch (error) {
    console.log('⚠️  Fee estimation not available');
    console.log('');
  }
}

async function showSupportedMethods() {
  console.log('═══════════════════════════════════════════');
  console.log('  📋 Supported RPC Methods');
  console.log('═══════════════════════════════════════════\n');

  const methods = [
    { name: 'getblockcount', desc: 'Get current block height' },
    { name: 'getblockchaininfo', desc: 'Get blockchain info' },
    { name: 'getblockhash', desc: 'Get block hash by height' },
    { name: 'getblock', desc: 'Get block details' },
    { name: 'getrawtransaction', desc: 'Get transaction details' },
    { name: 'sendrawtransaction', desc: 'Broadcast signed transaction' },
    { name: 'validateaddress', desc: 'Validate Zcash address' },
    { name: 'getaddressbalance', desc: 'Get address balance (indexed)' },
    { name: 'getaddressutxos', desc: 'Get address UTXOs (indexed)' },
    { name: 'getaddresstxids', desc: 'Get address transactions (indexed)' },
    { name: 'estimatefee', desc: 'Estimate transaction fee' },
  ];

  methods.forEach(m => {
    console.log(`  ✅ ${m.name.padEnd(20)} - ${m.desc}`);
  });
  console.log('');
}

async function main() {
  try {
    await testConnection();
    await testAddressOperations();
    await testTransactionOperations();
    await showSupportedMethods();

    console.log('═══════════════════════════════════════════');
    console.log('  ✅ Test Complete!');
    console.log('═══════════════════════════════════════════\n');

    console.log('The Tatum API provides:');
    console.log('  • Read access to Zcash blockchain');
    console.log('  • Address balance and UTXO queries');
    console.log('  • Transaction broadcasting (sendrawtransaction)');
    console.log('');
    console.log('For HTLC operations:');
    console.log('  1. Build transaction locally using @mayaprotocol/zcash-js');
    console.log('  2. Sign with facilitator private key');
    console.log('  3. Broadcast via Tatum sendrawtransaction');
    console.log('');
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

main();

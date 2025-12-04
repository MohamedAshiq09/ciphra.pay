/**
 * Test Zcash Connection and Transaction Service
 * 
 * This script tests if the Zcash RPC is accessible
 * and if the transaction service can work properly
 */

const axios = require('axios');

// Configuration from .env
const CONFIG = {
  lightwalletdUrl: 'https://lightwalletd.testnet.electriccoin.co:9067',
  network: 'testnet',
  // Note: For real transactions, you need a full Zcash node with RPC
  // Lightwalletd is read-only and doesn't support transaction signing
  rpcUrl: 'http://localhost:8232', // Local zcashd node
  rpcUser: 'zcashrpc',
  rpcPassword: 'password',
};

async function testLightwalletd() {
  console.log('🔗 Testing Lightwalletd Connection...\n');
  console.log(`URL: ${CONFIG.lightwalletdUrl}`);
  
  try {
    // Lightwalletd uses gRPC, not REST
    // For testing, we can try the gRPC-web gateway if available
    const response = await axios.get(`${CONFIG.lightwalletdUrl}/health`, {
      timeout: 5000,
    });
    console.log('✅ Lightwalletd Response:', response.data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Cannot connect to lightwalletd');
    } else if (error.response) {
      console.log('⚠️  Response:', error.response.status, error.response.statusText);
    } else {
      console.log('⚠️  Error:', error.message);
    }
    console.log('\nNote: Lightwalletd uses gRPC protocol, not REST.');
    console.log('The testnet server may require a gRPC client to connect.');
  }
}

async function testZcashRpc() {
  console.log('\n🔗 Testing Local Zcash RPC...\n');
  console.log(`URL: ${CONFIG.rpcUrl}`);
  
  try {
    const response = await axios.post(
      CONFIG.rpcUrl,
      {
        jsonrpc: '1.0',
        id: 'test',
        method: 'getblockchaininfo',
        params: [],
      },
      {
        auth: {
          username: CONFIG.rpcUser,
          password: CONFIG.rpcPassword,
        },
        timeout: 5000,
      }
    );
    
    console.log('✅ Connected to Zcash node!');
    console.log('   Chain:', response.data.result.chain);
    console.log('   Blocks:', response.data.result.blocks);
    console.log('   Verification Progress:', (response.data.result.verificationprogress * 100).toFixed(2) + '%');
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ No local Zcash node running');
      console.log('\n📋 To run a Zcash node:');
      console.log('   1. Install zcashd: https://zcash.readthedocs.io/en/latest/rtd_pages/zcashd.html');
      console.log('   2. Add to ~/.zcash/zcash.conf:');
      console.log('      testnet=1');
      console.log('      rpcuser=zcashrpc');
      console.log('      rpcpassword=password');
      console.log('      txindex=1');
      console.log('   3. Run: zcashd');
    } else if (error.response && error.response.status === 401) {
      console.log('❌ Authentication failed - check RPC credentials');
    } else {
      console.log('❌ Error:', error.message);
    }
    return false;
  }
}

async function testZcashLibrary() {
  console.log('\n📦 Testing @mayaprotocol/zcash-js library...\n');
  
  try {
    const zcash = await import('@mayaprotocol/zcash-js');
    console.log('✅ Library loaded successfully!');
    console.log('   Available exports:', Object.keys(zcash).join(', '));
    
    // Test address validation
    const testnetAddr = 'tmUzzEDRjvE3QC8RBUFD7DTi5LLL4zAEvKW';
    if (zcash.testnetPrefix) {
      const isValid = zcash.isValidAddr(testnetAddr, Buffer.from(zcash.testnetPrefix));
      console.log(`   Testnet address validation: ${isValid ? '✅' : '❌'}`);
    }
    
    return true;
  } catch (error) {
    console.log('❌ Failed to load library:', error.message);
    return false;
  }
}

async function showAlternatives() {
  console.log('\n📋 Alternative Options for Zcash Integration:\n');
  
  console.log('1. **Public Block Explorers API**');
  console.log('   - Blockbook (Nownodes): https://nownodes.io/nodes/zcash');
  console.log('   - Can get balance, UTXOs, and broadcast signed transactions');
  console.log('');
  
  console.log('2. **Zashi Wallet Integration**');
  console.log('   - Use QR codes for users to send from Zashi mobile app');
  console.log('   - Monitor incoming payments via lightwalletd');
  console.log('');
  
  console.log('3. **Facilitator Model (Current Implementation)**');
  console.log('   - Users send ZEC to facilitator address with memo');
  console.log('   - Backend monitors payments and triggers swap logic');
  console.log('   - Facilitator releases funds upon secret reveal');
  console.log('');
  
  console.log('4. **Run Your Own Zcash Node**');
  console.log('   - Full control over transactions');
  console.log('   - Requires disk space (~40GB) and sync time');
  console.log('   - Best for production deployments');
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  Zcash Integration Test');
  console.log('═══════════════════════════════════════════\n');
  
  await testLightwalletd();
  const hasLocalNode = await testZcashRpc();
  await testZcashLibrary();
  
  if (!hasLocalNode) {
    await showAlternatives();
  }
  
  console.log('\n═══════════════════════════════════════════');
  console.log('  Test Complete');
  console.log('═══════════════════════════════════════════\n');
}

main().catch(console.error);

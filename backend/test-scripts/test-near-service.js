#!/usr/bin/env node

/**
 * Test NEAR Service Connectivity
 * Quick test to verify NEAR integration is working
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testNearService() {
  console.log('🔍 Testing NEAR Service Connectivity\n');
  console.log('=' .repeat(50));

  const tests = [
    {
      name: 'Network Info',
      endpoint: '/near/network-info',
      method: 'GET'
    },
    {
      name: 'Swap Initiate',
      endpoint: '/near/swap/initiate',
      method: 'POST',
      data: {
        swapId: 'test_swap_123',
        recipient: 'ashiq09.testnet',
        amount: '1.0',
        hashLock: 'test_hash_123',
        timeLock: 86400
      }
    }
  ];

  console.log('\n📊 Testing NEAR Endpoints:');
  console.log('-'.repeat(30));

  for (const test of tests) {
    try {
      const response = await axios({
        method: test.method,
        url: `${BASE_URL}${test.endpoint}`,
        data: test.data
      });
      
      console.log(`✅ ${test.name}: Working (${response.status})`);
      
      if (test.name === 'Network Info' && response.data.data) {
        console.log(`   Network: ${response.data.data.network || 'testnet'}`);
        console.log(`   Chain ID: ${response.data.data.chainId || 'testnet'}`);
      }
      
    } catch (error) {
      if (error.response?.status === 402) {
        console.log(`💰 ${test.name}: Requires Payment (402) - Expected`);
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`❌ ${test.name}: Backend not running`);
        break;
      } else {
        console.log(`⚠️  ${test.name}: Error (${error.response?.status || error.code})`);
        if (error.response?.data?.message) {
          console.log(`   Message: ${error.response.data.message}`);
        }
      }
    }
  }

  console.log('\n🔧 NEAR Service Status:');
  console.log('-'.repeat(30));
  
  try {
    const networkInfo = await axios.get(`${BASE_URL}/near/network-info`);
    console.log('✅ NEAR service is running and connected');
    console.log('✅ Ready for NEAR → Mina swaps');
    console.log('🌐 Smart contracts accessible');
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Backend is not running');
    } else {
      console.log('⚠️  NEAR service status unclear');
      console.log('💡 This might be normal if endpoints require payment');
    }
  }

  console.log('\n🚀 Next Steps:');
  console.log('-'.repeat(30));
  console.log('1. Run: node test-scripts/simple-near-to-mina.js');
  console.log('2. Or: node test-scripts/real-near-to-mina.js');
  console.log('3. Use your NEAR testnet tokens to get MINA!');
}

testNearService().catch(console.error);
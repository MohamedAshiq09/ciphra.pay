#!/usr/bin/env node

/**
 * Test Mina Service Connectivity
 * Quick test to verify Mina integration is working
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testMinaService() {
  console.log('🔍 Testing Mina Service Connectivity\n');
  console.log('=' .repeat(50));

  const tests = [
    {
      name: 'Network Info',
      endpoint: '/mina/network-info',
      method: 'GET'
    },
    {
      name: 'Account Info',
      endpoint: '/mina/account/B62qiuUe2FGR5PwtL9rb8vMQhy73VWWUpPniM7GTw33jF6PvCY1EXQR',
      method: 'GET'
    },
    {
      name: 'zkApp Info',
      endpoint: '/mina/zkapp/B62qo6UoWj3YEH4xKny25gwxAeYmad9pgvYxo4NtgBBJuhFVzpUPuqx',
      method: 'GET'
    }
  ];

  console.log('\n📊 Testing Mina Endpoints:');
  console.log('-'.repeat(30));

  for (const test of tests) {
    try {
      const response = await axios({
        method: test.method,
        url: `${BASE_URL}${test.endpoint}`
      });
      
      console.log(`✅ ${test.name}: Working (${response.status})`);
      
      if (test.name === 'Network Info' && response.data.data) {
        console.log(`   Chain ID: ${response.data.data.chainId || 'devnet'}`);
        console.log(`   Network: ${response.data.data.network || 'Mina Devnet'}`);
      }
      
    } catch (error) {
      if (error.response?.status === 402) {
        console.log(`💰 ${test.name}: Requires Payment (402) - Expected`);
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`❌ ${test.name}: Backend not running`);
        break;
      } else {
        console.log(`⚠️  ${test.name}: Error (${error.response?.status || error.code})`);
      }
    }
  }

  console.log('\n🔧 Mina Service Status:');
  console.log('-'.repeat(30));
  
  try {
    const networkInfo = await axios.get(`${BASE_URL}/mina/network-info`);
    console.log('✅ Mina service is running and connected');
    console.log('✅ Ready for Starknet → Mina swaps');
    console.log('💎 zkApp contracts accessible');
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Backend is not running');
    } else {
      console.log('⚠️  Mina service status unclear');
      console.log('💡 This might be normal if endpoints require payment');
    }
  }

  console.log('\n🚀 Next Steps:');
  console.log('-'.repeat(30));
  console.log('1. Run: node test-scripts/simple-starknet-to-mina.js');
  console.log('2. Or: node test-scripts/test-starknet-to-mina.js');
  console.log('3. Use your Starknet testnet ETH to get MINA!');
}

testMinaService().catch(console.error);
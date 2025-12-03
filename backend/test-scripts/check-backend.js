#!/usr/bin/env node

/**
 * Backend Health Check
 * Tests which endpoints are available and working
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function checkBackend() {
  console.log('🔍 Backend Health Check\n');
  console.log('=' .repeat(50));

  const endpoints = [
    { name: 'Health Check', url: '/health', method: 'GET', requiresPayment: false },
    { name: 'Bridge Stats', url: '/bridge/stats', method: 'GET', requiresPayment: true },
    { name: 'Wallet Info', url: '/wallet/ash/starknet', method: 'GET', requiresPayment: false },
    { name: 'Zcash Address', url: '/zcash/address/ash', method: 'GET', requiresPayment: false },
    { name: 'Swap Create', url: '/swap/create', method: 'POST', requiresPayment: false }
  ];

  console.log('\n📊 Testing Endpoints:');
  console.log('-'.repeat(30));

  for (const endpoint of endpoints) {
    try {
      let response;
      
      if (endpoint.method === 'POST' && endpoint.url.includes('swap/create')) {
        // Test swap creation with sample data
        const swapData = {
          initiator: 'ash',
          recipient: 'ash',
          fromChain: 'starknet',
          toChain: 'zcash',
          amount: '0.1',
          recipientAmount: '0.05',
          timeLockHours: 24
        };
        response = await axios.post(`${BASE_URL}${endpoint.url}`, swapData);
      } else {
        response = await axios.get(`${BASE_URL}${endpoint.url}`);
      }
      
      console.log(`✅ ${endpoint.name}: Working (${response.status})`);
      
    } catch (error) {
      if (error.response?.status === 402) {
        console.log(`💰 ${endpoint.name}: Requires Payment (402) ${endpoint.requiresPayment ? '- Expected' : '- Unexpected'}`);
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`❌ ${endpoint.name}: Backend not running`);
        console.log('\n🚀 To start backend:');
        console.log('   cd backend');
        console.log('   npm run start:dev');
        break;
      } else {
        console.log(`⚠️  ${endpoint.name}: Error (${error.response?.status || error.code})`);
      }
    }
  }

  console.log('\n🔧 Backend Status Summary:');
  console.log('-'.repeat(30));
  
  try {
    const healthCheck = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Backend is running and healthy');
    console.log('✅ Ready for Starknet → Zcash swaps');
    console.log('💡 Some endpoints require X402 payment (this is normal)');
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Backend is not running');
      console.log('\n🚀 To start backend:');
      console.log('   1. cd backend');
      console.log('   2. npm install (if not done)');
      console.log('   3. npm run start:dev');
      console.log('   4. Wait for "Application is running on: http://localhost:3000"');
      console.log('   5. Run this check again');
    } else {
      console.log('⚠️  Backend status unclear');
    }
  }
}

checkBackend().catch(console.error);
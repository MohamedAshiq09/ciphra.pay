#!/usr/bin/env node

/**
 * Simple X402 Test Script
 * Tests the X402 payment module using the backend's payment service
 *
 * Usage:
 *   node test-x402-simple.js
 */

const http = require('http');

// ANSI colors for pretty output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(80));
  log('cyan', `  ${title}`);
  console.log('='.repeat(80) + '\n');
}

function success(message) {
  log('green', `✅ ${message}`);
}

function error(message) {
  log('red', `❌ ${message}`);
}

function info(message) {
  log('blue', `ℹ️  ${message}`);
}

function warn(message) {
  log('yellow', `⚠️  ${message}`);
}

/**
 * Make HTTP request
 */
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

/**
 * Test 1: Check if backend is running
 */
async function testBackendHealth() {
  section('Test 1: Backend Health Check');

  try {
    info('Checking if backend is running on http://localhost:3000...');

    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      method: 'GET',
    });

    if (response.statusCode === 200) {
      success(`Backend is running! Status: ${response.statusCode}`);
      info('Response: ' + response.body);
      return true;
    } else {
      warn(`Backend responded with status ${response.statusCode}`);
      warn('Make sure the backend is running with: pnpm run start:dev');
      return false;
    }
  } catch (err) {
    error(`Backend not reachable: ${err.message}`);
    warn('Start the backend with: pnpm run start:dev');
    return false;
  }
}

/**
 * Test 2: Test 402 Payment Required Response
 */
async function test402Response() {
  section('Test 2: HTTP 402 Payment Required Response');

  try {
    info('Making request to protected endpoint WITHOUT payment...');

    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/swap/initiate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }, JSON.stringify({}));

    info(`Response Status: ${response.statusCode}`);
    info('Response Body:');
    console.log(JSON.stringify(JSON.parse(response.body), null, 2));

    if (response.statusCode === 402) {
      success('✅ Got 402 Payment Required response!');

      const body = JSON.parse(response.body);

      // Validate 402 response structure
      if (body.x402Version === 1) {
        success('✅ x402Version is correct (1)');
      } else {
        warn(`⚠️  x402Version is ${body.x402Version}, expected 1`);
      }

      if (Array.isArray(body.accepts) && body.accepts.length > 0) {
        success('✅ Payment requirements present');

        const req = body.accepts[0];
        info('\nPayment Requirements:');
        console.log(`  Scheme: ${req.scheme}`);
        console.log(`  Network: ${req.network}`);
        console.log(`  Amount: ${req.maxAmountRequired}`);
        console.log(`  Asset: ${req.asset}`);
        console.log(`  PayTo: ${req.payTo}`);
        console.log(`  Resource: ${req.resource}`);
        console.log(`  Timeout: ${req.maxTimeoutSeconds}s`);
      } else {
        warn('⚠️  No payment requirements in response');
      }

      return true;
    } else if (response.statusCode === 200 || response.statusCode === 201) {
      warn('⚠️  Endpoint returned success without payment!');
      warn('This means X402 is disabled (X402_ENABLED=false)');
      info('Enable X402 in .env: X402_ENABLED=true');
      return false;
    } else {
      warn(`⚠️  Unexpected status code: ${response.statusCode}`);
      return false;
    }
  } catch (err) {
    error(`Test failed: ${err.message}`);
    return false;
  }
}

/**
 * Test 3: Test public endpoint (should not require payment)
 */
async function testPublicEndpoint() {
  section('Test 3: Public Endpoint (No Payment Required)');

  try {
    info('Testing public endpoint /api...');

    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api',
      method: 'GET',
    });

    if (response.statusCode === 200) {
      success(`✅ Public endpoint works without payment (${response.statusCode})`);
      info('Response: ' + response.body);
      return true;
    } else if (response.statusCode === 402) {
      error('❌ Public endpoint incorrectly requires payment!');
      warn('The /api endpoint should be excluded from X402 middleware');
      return false;
    } else {
      warn(`Unexpected status: ${response.statusCode}`);
      return false;
    }
  } catch (err) {
    error(`Test failed: ${err.message}`);
    return false;
  }
}

/**
 * Test 4: Environment Configuration
 */
async function testEnvConfig() {
  section('Test 4: Environment Configuration');

  try {
    info('Reading .env file...');

    const fs = require('fs');
    const path = require('path');

    const envPath = path.join(__dirname, '.env');

    if (!fs.existsSync(envPath)) {
      warn('.env file not found');
      warn('Copy .env.example to .env and configure it');
      return false;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');

    const checkEnvVar = (name) => {
      const regex = new RegExp(`^${name}=(.+)$`, 'm');
      const match = envContent.match(regex);
      return match ? match[1] : null;
    };

    info('Environment Variables:');

    const vars = [
      'X402_ENABLED',
      'STARKNET_NETWORK',
      'STARKNET_RPC_URL',
      'X402_PAYMENT_AMOUNT',
      'X402_PAYMENT_RECIPIENT',
    ];

    vars.forEach(varName => {
      const value = checkEnvVar(varName);
      if (value) {
        console.log(`  ${varName}: ${value}`);
      } else {
        console.log(`  ${varName}: ❌ not set`);
      }
    });

    success('Environment file exists');
    return true;
  } catch (err) {
    error(`Test failed: ${err.message}`);
    return false;
  }
}

/**
 * Main Test Runner
 */
async function main() {
  console.clear();

  log('magenta', `
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║                  X402 SIMPLE TEST SUITE                                   ║
║                  Ciphra.Pay Payment Module                                ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
  `);

  let passed = 0;
  let failed = 0;

  const tests = [
    { name: 'Backend Health', fn: testBackendHealth },
    { name: 'Environment Config', fn: testEnvConfig },
    { name: 'Public Endpoint', fn: testPublicEndpoint },
    { name: '402 Response', fn: test402Response },
  ];

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (err) {
      error(`Test ${test.name} crashed: ${err.message}`);
      failed++;
    }

    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  section('Test Summary');

  console.log(`Total Tests: ${tests.length}`);
  success(`Passed: ${passed}`);
  if (failed > 0) {
    error(`Failed: ${failed}`);
  }

  console.log('\n');

  if (failed === 0) {
    log('green', '🎉 All tests passed! The X402 module is working correctly.\n');
  } else {
    log('yellow', '⚠️  Some tests failed. Check the output above for details.\n');
  }

  info('Next steps:');
  console.log('  1. If backend is not running: pnpm run start:dev');
  console.log('  2. If X402 is disabled: Set X402_ENABLED=true in .env');
  console.log('  3. Check the implementation guide: X402_IMPLEMENTATION_COMPLETE.md\n');
}

// Run tests
main().catch((err) => {
  error(`Fatal error: ${err.message}`);
  console.error(err);
  process.exit(1);
});

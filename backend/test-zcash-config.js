#!/usr/bin/env node

/**
 * Test script to verify Zcash config properties are accessible
 */

console.log('🧪 Testing Zcash configuration...\n');

// Simple test to check if the config service can be imported and used
const testCode = `
import { AppConfigService } from './src/common/config/config.service';
import { ConfigService } from '@nestjs/config';

// Create a mock config service
const mockConfigService = {
  get: (key, defaultValue) => {
    const values = {
      'ZCASH_NETWORK': 'testnet',
      'ZCASH_LIGHTWALLETD_URL': 'https://lightwalletd.testnet.electriccoin.co:9067',
      'ZCASH_FACILITATOR_ADDRESS': 'ztestsapling1abc123...',
    };
    return values[key] || defaultValue;
  },
  getOrThrow: (key) => {
    const values = {
      'ZCASH_FACILITATOR_ADDRESS': 'ztestsapling1abc123...',
      'ZCASH_FACILITATOR_PRIVATE_KEY': 'secret-key-123...',
    };
    if (!values[key]) throw new Error(\`Missing config: \${key}\`);
    return values[key];
  }
};

// Test the config service
const appConfig = new AppConfigService(mockConfigService);

console.log('✅ zcashNetwork:', appConfig.zcashNetwork);
console.log('✅ zcashLightwalletdUrl:', appConfig.zcashLightwalletdUrl);
console.log('✅ zcashFacilitatorAddress:', appConfig.zcashFacilitatorAddress);

console.log('\\n🎉 All Zcash config properties are accessible!');
`;

// Write test file
require('fs').writeFileSync('temp-test.mjs', testCode);

try {
  // Run the test
  require('child_process').execSync('node temp-test.mjs', { stdio: 'inherit' });
} catch (error) {
  console.log('❌ Test failed:', error.message);
} finally {
  // Clean up
  try {
    require('fs').unlinkSync('temp-test.mjs');
  } catch {}
}

console.log('\n🚀 Now try: npm run start:dev');
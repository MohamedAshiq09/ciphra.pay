#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔍 Quick compilation test...\n');

try {
  // Just check if TypeScript can resolve the imports
  execSync('npx tsc --noEmit --skipLibCheck', { 
    stdio: 'pipe',
    cwd: process.cwd()
  });
  console.log('✅ Compilation successful!');
  console.log('\n🚀 Ready to start server with: npm run start:dev');
} catch (error) {
  console.log('❌ Compilation errors found:');
  console.log(error.stdout?.toString() || error.message);
  
  // Try to identify the specific issue
  const output = error.stdout?.toString() || '';
  if (output.includes('zcashLightwalletdUrl')) {
    console.log('\n💡 Suggestion: The Zcash config properties are missing from AppConfigService');
    console.log('   Check that you\'re importing from the correct config service path');
  }
}
#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔍 Final compilation test...\n');

try {
  // Test compilation
  execSync('npx tsc --noEmit --skipLibCheck', { 
    stdio: 'pipe',
    cwd: process.cwd()
  });
  console.log('✅ Compilation successful!');
  console.log('\n🎉 All issues resolved!');
  console.log('\n🚀 Start the server with: npm run start:dev');
} catch (error) {
  const output = error.stdout?.toString() || error.stderr?.toString() || '';
  console.log('❌ Remaining compilation errors:');
  console.log(output);
  
  if (output.includes('zcash')) {
    console.log('\n💡 Zcash config issue detected');
  }
  if (output.includes('getHello')) {
    console.log('\n💡 Test file issue detected');
  }
}
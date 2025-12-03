#!/usr/bin/env node

/**
 * Test compilation without starting the server
 */

const { execSync } = require('child_process');

console.log('🔍 Testing TypeScript compilation...\n');

try {
  // Test compilation
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('\n✅ Compilation successful!');
  console.log('\n🚀 You can now start the server with: npm run start:dev');
} catch (error) {
  console.error('\n❌ Compilation failed. Please fix the errors above.');
  process.exit(1);
}
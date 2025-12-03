#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const testScripts = [
  'test-zcash-to-starknet.js',
  'test-starknet-to-zcash.js',
  'test-zcash-to-near.js',
  'test-zcash-to-mina.js'
];

function runTest(scriptName) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Running ${scriptName}...`);
    console.log('='.repeat(50));
    
    const scriptPath = path.join(__dirname, 'test-scripts', scriptName);
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${scriptName} completed successfully`);
        resolve();
      } else {
        console.log(`❌ ${scriptName} failed with code ${code}`);
        reject(new Error(`Test failed: ${scriptName}`));
      }
    });
    
    child.on('error', (err) => {
      console.error(`❌ Error running ${scriptName}:`, err.message);
      reject(err);
    });
  });
}

async function runAllTests() {
  console.log('🧪 Cross-Chain Swap Test Suite');
  console.log('='.repeat(50));
  
  const testName = process.argv[2];
  
  if (testName) {
    // Run specific test
    const scriptName = testName.includes('.js') ? testName : `${testName}.js`;
    if (testScripts.includes(scriptName)) {
      try {
        await runTest(scriptName);
        console.log(`\n🎉 Test ${scriptName} completed!`);
      } catch (error) {
        console.error(`\n💥 Test ${scriptName} failed!`);
        process.exit(1);
      }
    } else {
      console.log(`❌ Test script not found: ${scriptName}`);
      console.log('Available tests:', testScripts.join(', '));
      process.exit(1);
    }
  } else {
    // Run all tests
    for (const script of testScripts) {
      try {
        await runTest(script);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between tests
      } catch (error) {
        console.error(`\n💥 Test suite failed at ${script}!`);
        process.exit(1);
      }
    }
    
    console.log('\n🎉 All tests completed successfully!');
  }
}

// Usage info
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage:
  node run-tests.js                    # Run all tests
  node run-tests.js test-name          # Run specific test
  
Available tests:
  ${testScripts.map(s => `- ${s.replace('.js', '')}`).join('\n  ')}
  
Examples:
  node run-tests.js test-zcash-to-starknet
  node run-tests.js test-starknet-to-zcash
`);
  process.exit(0);
}

runAllTests().catch(console.error);
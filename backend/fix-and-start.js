#!/usr/bin/env node

/**
 * Quick fix script to resolve common issues and start the backend
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing backend issues and starting server...\n');

try {
  // 1. Check if node_modules exists
  if (!fs.existsSync('node_modules')) {
    console.log('📦 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
  }

  // 2. Install additional required packages
  console.log('📦 Installing additional packages...');
  const additionalPackages = [
    '@nestjs/event-emitter',
    'axios',
    'class-validator',
    'class-transformer'
  ];
  
  execSync(`npm install ${additionalPackages.join(' ')}`, { stdio: 'inherit' });

  // 3. Create missing directories
  console.log('📁 Creating missing directories...');
  const dirs = [
    'src/modules/zcash/dto',
    'src/modules/wallet/dto',
    'src/modules/p2p/dto'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`   Created: ${dir}`);
    }
  });

  // 4. Check if all module files exist
  console.log('📄 Checking module files...');
  const moduleFiles = [
    'src/modules/zcash/zcash.module.ts',
    'src/modules/wallet/wallet.module.ts',
    'src/modules/p2p/p2p.module.ts'
  ];
  
  moduleFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`   ✅ ${file}`);
    } else {
      console.log(`   ❌ Missing: ${file}`);
    }
  });

  // 5. Start the server
  console.log('\n🚀 Starting the backend server...\n');
  execSync('npm run start:dev', { stdio: 'inherit' });

} catch (error) {
  console.error('❌ Error:', error.message);
  
  // Fallback: try to start anyway
  console.log('\n🔄 Trying to start server anyway...');
  try {
    execSync('npm run start:dev', { stdio: 'inherit' });
  } catch (startError) {
    console.error('❌ Failed to start server:', startError.message);
    process.exit(1);
  }
}
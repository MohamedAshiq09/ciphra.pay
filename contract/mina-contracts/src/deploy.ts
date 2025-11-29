/**
 * ============================================================================
 * MINA PROTOCOL DEPLOYMENT SCRIPT
 * Deploys Ciphra.Pay Atomic Swap zkApp to Berkeley Testnet
 * ============================================================================
 */

import {
  Mina,
  PrivateKey,
  AccountUpdate,
  fetchAccount,
} from 'o1js';

import { AtomicSwapContract } from './AtomicSwap.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const NETWORK = process.env.MINA_NETWORK || 'berkeley';
const FEE = 0.1; // MINA

const NETWORKS = {
  berkeley: 'https://proxy.berkeley.minaexplorer.com/graphql',
  mainnet: 'https://proxy.minaexplorer.com/graphql',
};

// ============================================================================
// DEPLOYMENT
// ============================================================================

async function deploy() {
  console.log('\n============================================================');
  console.log('🚀 Deploying Ciphra.Pay Atomic Swap zkApp to Mina Protocol');
  console.log('============================================================\n');

  // Setup network
  const networkUrl = NETWORKS[NETWORK as keyof typeof NETWORKS];
  console.log(`📡 Network: ${NETWORK}`);
  console.log(`🌐 URL: ${networkUrl}\n`);

  const Network = Mina.Network(networkUrl);
  Mina.setActiveInstance(Network);

  // Load deployer account
  let deployerKey: PrivateKey;
  if (process.env.DEPLOYER_PRIVATE_KEY) {
    deployerKey = PrivateKey.fromBase58(process.env.DEPLOYER_PRIVATE_KEY);
    console.log('✅ Loaded deployer key from environment');
  } else {
    // Generate new key for testnet
    deployerKey = PrivateKey.random();
    console.log('⚠️  Generated new deployer key (save this!):');
    console.log(`   ${deployerKey.toBase58()}\n`);
  }

  const deployerAccount = deployerKey.toPublicKey();
  console.log(`👤 Deployer Address: ${deployerAccount.toBase58()}\n`);

  // Fetch deployer account
  console.log('⏳ Fetching deployer account...');
  await fetchAccount({ publicKey: deployerAccount });
  console.log('✅ Account fetched\n');

  // Generate zkApp account
  const zkAppPrivateKey = PrivateKey.random();
  const zkAppAddress = zkAppPrivateKey.toPublicKey();

  console.log(`📍 zkApp Address: ${zkAppAddress.toBase58()}`);
  console.log(`🔑 zkApp Private Key: ${zkAppPrivateKey.toBase58()}\n`);

  // Create contract instance
  console.log('📦 Creating contract instance...');
  const zkApp = new AtomicSwapContract(zkAppAddress);
  console.log('✅ Contract instance created\n');

  // Compile contract
  console.log('🔨 Compiling contract (this may take a few minutes)...');
  const startTime = Date.now();
  const { verificationKey } = await AtomicSwapContract.compile();
  const compileTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ Compiled in ${compileTime}s`);
  console.log(`🔐 Verification Key Hash: ${verificationKey.hash.toString()}\n`);

  // Deploy transaction
  console.log('📤 Creating deployment transaction...');
  const txn = await Mina.transaction({ sender: deployerAccount, fee: FEE * 1e9 },
    () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
    }
  );

  console.log('⚙️  Proving transaction...');
  await txn.prove();
  console.log('✅ Transaction proved\n');

  console.log('📝 Signing transaction...');
  await txn.sign([deployerKey, zkAppPrivateKey]).send();

  console.log('\n============================================================');
  console.log('🎉 DEPLOYMENT SUCCESSFUL!');
  console.log('============================================================\n');

  console.log('📋 Deployment Details:');
  console.log(`   Network:          ${NETWORK}`);
  console.log(`   zkApp Address:    ${zkAppAddress.toBase58()}`);
  console.log(`   zkApp Private Key: ${zkAppPrivateKey.toBase58()}`);
  console.log(`   Deployer:         ${deployerAccount.toBase58()}`);
  console.log(`   Fee:              ${FEE} MINA`);
  console.log(`   Verification Key: ${verificationKey.hash.toString()}\n`);

  console.log('🔗 View on Explorer:');
  if (NETWORK === 'berkeley') {
    console.log(`   https://berkeley.minaexplorer.com/wallet/${zkAppAddress.toBase58()}`);
  } else {
    console.log(`   https://minaexplorer.com/wallet/${zkAppAddress.toBase58()}`);
  }

  console.log('\n📝 Save these for future interactions:');
  console.log(`   export ZKAPP_ADDRESS=${zkAppAddress.toBase58()}`);
  console.log(`   export ZKAPP_PRIVATE_KEY=${zkAppPrivateKey.toBase58()}`);
  console.log(`   export DEPLOYER_ADDRESS=${deployerAccount.toBase58()}`);
  console.log(`   export DEPLOYER_PRIVATE_KEY=${deployerKey.toBase58()}\n`);

  console.log('✅ Next Steps:');
  console.log('   1. Fund the zkApp account with MINA tokens');
  console.log('   2. Test atomic swap functionality');
  console.log('   3. Integrate with backend for cross-chain coordination');
  console.log('   4. Deploy to mainnet when ready\n');
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

deploy()
  .then(() => {
    console.log('✅ Deployment completed successfully!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
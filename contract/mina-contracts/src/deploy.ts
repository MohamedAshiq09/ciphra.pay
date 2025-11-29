/**
 * ============================================================================
 * MINA PROTOCOL DEPLOYMENT SCRIPT
 * Deploys Ciphra.Pay Atomic Swap zkApp to Berkeley Testnet
 * ============================================================================
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

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

  // Load deployer account from .env
  if (!process.env.DEPLOYER_PRIVATE_KEY) {
    console.error('❌ ERROR: DEPLOYER_PRIVATE_KEY not found in .env file!');
    console.error('\n📝 Steps to fix:');
    console.error('   1. Create .env file in project root');
    console.error('   2. Generate a key:');
    console.error('      node -e "import(\'o1js\').then(m => { const key = m.PrivateKey.random(); console.log(\'Address:\', key.toPublicKey().toBase58()); console.log(\'Private Key:\', key.toBase58()); })"');
    console.error('   3. Get testnet MINA from https://faucet.minaprotocol.com/');
    console.error('   4. Add to .env: DEPLOYER_PRIVATE_KEY=EKE...\n');
    process.exit(1);
  }

  const deployerKey = PrivateKey.fromBase58(process.env.DEPLOYER_PRIVATE_KEY);
  const deployerAccount = deployerKey.toPublicKey();

  console.log('✅ Loaded deployer key from .env');
  console.log(`👤 Deployer Address: ${deployerAccount.toBase58()}\n`);

  // Fetch deployer account
  console.log('⏳ Fetching deployer account...');
  try {
    await fetchAccount({ publicKey: deployerAccount });
    console.log('✅ Account fetched\n');
  } catch (error) {
    console.error('❌ Failed to fetch account. Make sure you have testnet MINA!');
    console.error('   Get tokens from: https://faucet.minaprotocol.com/\n');
    throw error;
  }

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
  console.log('🔨 Compiling contract (this may take 1-2 minutes)...');
  const startTime = Date.now();
  const { verificationKey } = await AtomicSwapContract.compile();
  const compileTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ Compiled in ${compileTime}s`);
  console.log(`🔐 Verification Key Hash: ${verificationKey.hash.toString()}\n`);

  // Deploy transaction
  console.log('📤 Creating deployment transaction...');
  const txn = await Mina.transaction(
    { sender: deployerAccount, fee: FEE * 1e9 },
    async () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
    }
  );

  console.log('⚙️  Proving transaction (this takes time)...');
  await txn.prove();
  console.log('✅ Transaction proved\n');

  console.log('📝 Signing and sending transaction...');
  const pendingTx = await txn.sign([deployerKey, zkAppPrivateKey]).send();
  console.log('✅ Transaction sent!\n');

  console.log('⏳ Waiting for transaction confirmation...');
  console.log(`   Transaction hash: ${pendingTx.hash}\n`);

  console.log('\n============================================================');
  console.log('🎉 DEPLOYMENT SUCCESSFUL!');
  console.log('============================================================\n');

  console.log('📋 Deployment Details:');
  console.log(`   Network:           ${NETWORK}`);
  console.log(`   zkApp Address:     ${zkAppAddress.toBase58()}`);
  console.log(`   zkApp Private Key: ${zkAppPrivateKey.toBase58()}`);
  console.log(`   Deployer:          ${deployerAccount.toBase58()}`);
  console.log(`   Fee:               ${FEE} MINA\n`);

  console.log('🔗 View on Explorer:');
  if (NETWORK === 'berkeley') {
    console.log(`   https://berkeley.minaexplorer.com/wallet/${zkAppAddress.toBase58()}\n`);
  } else {
    console.log(`   https://minaexplorer.com/wallet/${zkAppAddress.toBase58()}\n`);
  }

  console.log('📝 UPDATE YOUR .env FILE WITH:');
  console.log(`ZKAPP_ADDRESS=${zkAppAddress.toBase58()}`);
  console.log(`ZKAPP_PRIVATE_KEY=${zkAppPrivateKey.toBase58()}\n`);

  console.log('✅ Next Steps:');
  console.log('   1. Update .env file with zkApp details above');
  console.log('   2. Test atomic swap functionality');
  console.log('   3. Integrate with backend for cross-chain coordination\n');
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
    console.error('\n❌ Deployment failed:', error);
    console.error('\n💡 Common issues:');
    console.error('   - Make sure you have testnet MINA tokens');
    console.error('   - Check your DEPLOYER_PRIVATE_KEY in .env');
    console.error('   - Verify network is accessible\n');
    process.exit(1);
  });
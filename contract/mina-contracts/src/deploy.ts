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

const NETWORK = process.env.MINA_NETWORK || 'devnet';
const FEE = 0.1; // MINA

const NETWORKS = {
  devnet: 'https://api.minascan.io/node/devnet/v1/graphql',
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
  
  if (!networkUrl) {
    console.error(`❌ ERROR: Unknown network "${NETWORK}"`);
    console.error('   Valid networks: devnet, berkeley, mainnet\n');
    process.exit(1);
  }
  
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
    console.error('   3. Get testnet MINA from:');
    console.error('      Devnet: https://faucet.minaprotocol.com/ (select Devnet)');
    console.error('      Berkeley: https://faucet.minaprotocol.com/ (select Berkeley)');
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
    const accountInfo = await fetchAccount({ publicKey: deployerAccount });
    
    if (accountInfo.account) {
      const balance = Number(accountInfo.account.balance.toBigInt()) / 1e9;
      console.log('✅ Account fetched');
      console.log(`💰 Balance: ${balance.toFixed(4)} MINA`);
      
      if (balance < 2) {
        console.log('\n⚠️  WARNING: Balance is low!');
        console.log('   Deployment requires ~2 MINA');
        console.log('   Get tokens from faucet:\n');
        if (NETWORK === 'devnet') {
          console.log('   🔗 https://faucet.minaprotocol.com/ (select Devnet)\n');
        } else if (NETWORK === 'berkeley') {
          console.log('   🔗 https://faucet.minaprotocol.com/ (select Berkeley)\n');
        }
      }
    }
    console.log('');
  } catch (error: any) {
    console.error('❌ Failed to fetch account!');
    console.error(`   Error: ${error.message}\n`);
    console.error('💡 This usually means:');
    console.error('   1. Account has never been funded');
    console.error('   2. Wrong network selected');
    console.error('   3. Network is temporarily unavailable\n');
    console.error('🔧 Solutions:');
    console.error(`   1. Make sure you have ${NETWORK} MINA (not a different network!)`);
    console.error('   2. Get tokens from faucet:');
    if (NETWORK === 'devnet') {
      console.error('      https://faucet.minaprotocol.com/ (select Devnet)');
    } else if (NETWORK === 'berkeley') {
      console.error('      https://faucet.minaprotocol.com/ (select Berkeley)');
    }
    console.error('   3. Check that MINA_NETWORK in .env matches your funded network\n');
    process.exit(1);
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
  if (NETWORK === 'devnet') {
    console.log(`   https://minascan.io/devnet/account/${zkAppAddress.toBase58()}\n`);
  } else if (NETWORK === 'berkeley') {
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
    console.error('   - Make sure you have MINA tokens on the CORRECT network');
    console.error('   - Check your DEPLOYER_PRIVATE_KEY in .env');
    console.error('   - Verify MINA_NETWORK matches your funded network');
    console.error('   - Ensure network is accessible\n');
    process.exit(1);
  });
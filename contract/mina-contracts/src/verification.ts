/**
 * Verify Mina zkApp Deployment
 * Checks if the contract was successfully deployed to devnet
 */

import dotenv from 'dotenv';
dotenv.config();

import { Mina, PublicKey, fetchAccount } from 'o1js';

const ZKAPP_ADDRESS = 'B62qo6UoWj3YEH4xKny25gwxAeYmad9pgvYxo4NtgBBJuhFVzpUPuqx';
const NETWORK_URL = 'https://api.minascan.io/node/devnet/v1/graphql';

async function verifyDeployment() {
  console.log('\n🔍 VERIFYING MINA ZKAPP DEPLOYMENT\n');
  console.log('='.repeat(70));
  console.log(`\nzkApp Address: ${ZKAPP_ADDRESS}`);
  console.log(`Network: Devnet`);
  console.log(`URL: ${NETWORK_URL}\n`);

  // Connect to network
  console.log('📡 Connecting to Mina devnet...');
  const Network = Mina.Network(NETWORK_URL);
  Mina.setActiveInstance(Network);
  console.log('✅ Connected\n');

  // Fetch account
  console.log('⏳ Fetching zkApp account...');
  try {
    const zkAppPublicKey = PublicKey.fromBase58(ZKAPP_ADDRESS);
    const accountInfo = await fetchAccount({ publicKey: zkAppPublicKey });

    if (!accountInfo.account) {
      console.log('❌ zkApp account NOT FOUND on devnet!');
      console.log('\n💡 This could mean:');
      console.log('   1. Transaction is still pending (wait 2-3 minutes)');
      console.log('   2. Transaction failed');
      console.log('   3. Wrong network');
      console.log('\n🔗 Check transaction:');
      console.log('   https://minascan.io/devnet/tx/5JuGUZCFkiBfpPrdztQu2zcSt6g37kQDZi5yR4uwtfsBtbSruETp\n');
      process.exit(1);
    }

    console.log('✅ zkApp account FOUND!\n');

    // Display account details
    console.log('📊 ACCOUNT DETAILS:');
    console.log('='.repeat(70));
    
    const balance = Number(accountInfo.account.balance.toBigInt()) / 1e9;
    const nonce = accountInfo.account.nonce.toString();
    
    console.log(`Balance: ${balance.toFixed(4)} MINA`);
    console.log(`Nonce: ${nonce}`);
    
    // Check if it's a zkApp
    if (accountInfo.account.zkapp) {
      console.log('\n✅ THIS IS A ZKAPP ACCOUNT!');
      console.log('\n🔐 zkApp State:');
      
      const zkappState = accountInfo.account.zkapp.appState;
      if (zkappState && Array.isArray(zkappState)) {
        zkappState.forEach((field, index) => {
          console.log(`   Field ${index}: ${field?.toString() || '0'}`);
        });
      }
      
      if (accountInfo.account.zkapp.verificationKey) {
        console.log('\n✅ Verification Key: SET');
      } else {
        console.log('\n⚠️  Verification Key: NOT SET');
      }
    } else {
      console.log('\n⚠️  This is a regular account, not a zkApp!');
      console.log('   The deployment might have failed.');
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 DEPLOYMENT VERIFICATION COMPLETE!\n');
    console.log('🔗 View on Explorer:');
    console.log(`   https://minascan.io/devnet/account/${ZKAPP_ADDRESS}\n`);
    console.log('🔗 View Transaction:');
    console.log('   https://minascan.io/devnet/tx/5JuGUZCFkiBfpPrdztQu2zcSt6g37kQDZi5yR4uwtfsBtbSruETp\n');

  } catch (error: any) {
    console.log(`❌ Error fetching account: ${error.message}\n`);
    
    if (error.message.includes('getAccount')) {
      console.log('💡 Account not found. Possible reasons:');
      console.log('   1. Transaction still pending (wait a few minutes)');
      console.log('   2. Wrong network selected');
      console.log('   3. Deployment failed\n');
    }
    
    console.log('🔗 Check transaction status:');
    console.log('   https://minascan.io/devnet/tx/5JuGUZCFkiBfpPrdztQu2zcSt6g37kQDZi5yR4uwtfsBtbSruETp\n');
    
    process.exit(1);
  }
}

verifyDeployment().catch((error) => {
  console.error('\n❌ Verification failed:', error.message);
  console.error('\nFull error:', error);
  process.exit(1);
});
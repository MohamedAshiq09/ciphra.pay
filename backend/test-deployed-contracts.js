/**
 * Test script for deployed contracts
 * Tests connection to all deployed contracts on NEAR and Starknet
 */

const { RpcProvider, Contract } = require('starknet');

async function testStarknetContracts() {
  console.log('🔍 Testing Starknet Contracts\n');

  const provider = new RpcProvider({
    nodeUrl: 'https://starknet-sepolia.g.alchemy.com/v2/TI9jXk5bEpPAnw6QwoziO'
  });

  const contracts = {
    'AtomicSwap': '0x113032fba3903bf3b0271397f765703d6d11964928a6f2c1cb85b2b40feb640',
    'Escrow': '0x0a7e242ebb920336c4ba0ad3cf2b0f6f598a924aead1b783b4f28c8ceaaf2c9',
    'BridgeConnector': '0x2631be4e94dd1c586b8daa0bb86115aabccdeb8ef129e39503482829855422b',
    'P2PTransfer': '0x71fbcde5660a42ce00d998eddba94c81ddf5ff570d09cc67d7a7984e34789cc'
  };

  for (const [name, address] of Object.entries(contracts)) {
    try {
      // Try to get contract class hash (verifies deployment)
      const classHash = await provider.getClassHashAt(address);
      console.log(`✅ ${name}: ${address.slice(0, 10)}...`);
      console.log(`   Class Hash: ${classHash.slice(0, 20)}...\n`);
    } catch (error) {
      console.log(`❌ ${name}: ${address}`);
      console.log(`   Error: ${error.message}\n`);
    }
  }
}

async function testNEARContracts() {
  console.log('\n🔍 Testing NEAR Contracts\n');

  const { connect, keyStores } = require('near-api-js');

  const config = {
    networkId: 'testnet',
    keyStore: new keyStores.InMemoryKeyStore(),
    nodeUrl: 'https://rpc.testnet.near.org',
    walletUrl: 'https://wallet.testnet.near.org',
    helperUrl: 'https://helper.testnet.near.org'
  };

  try {
    const near = await connect(config);

    const contracts = [
      'swap.ashiq09.testnet',
      'escrow.ashiq09.testnet',
      'oracle.ashiq09.testnet',
      'p2p.ashiq09.testnet'
    ];

    for (const contractId of contracts) {
      try {
        const account = await near.account(contractId);
        const state = await account.state();
        console.log(`✅ ${contractId}`);
        console.log(`   Storage: ${(state.storage_usage / 1024).toFixed(2)} KB`);
        console.log(`   Balance: ${(state.amount / 1e24).toFixed(4)} NEAR\n`);
      } catch (error) {
        console.log(`❌ ${contractId}`);
        console.log(`   Error: ${error.message}\n`);
      }
    }
  } catch (error) {
    console.log('❌ NEAR connection failed:', error.message);
  }
}

async function main() {
  console.log('🚀 Testing Deployed Contracts\n');
  console.log('='.repeat(60) + '\n');

  await testStarknetContracts();
  await testNEARContracts();

  console.log('='.repeat(60));
  console.log('\n✅ Contract testing complete!');
}

main().catch(console.error);

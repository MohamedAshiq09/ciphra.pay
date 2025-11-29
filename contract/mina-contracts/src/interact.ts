/**
 * ============================================================================
 * MINA ATOMIC SWAP INTERACTION SCRIPT
 * Interact with deployed Ciphra.Pay zkApp
 * Updated for 8-field optimized contract
 * ============================================================================
 */

import {
  Mina,
  PrivateKey,
  PublicKey,
  Field,
  UInt64,
  Poseidon,
  MerkleMap,
  Signature,
  fetchAccount,
  Bool,
} from 'o1js';

import {
  AtomicSwapContract,
  SwapDetails,
  SwapStatus,
  CrossChainProof,
  ContractConfig,
  encodeChainName,
} from './AtomicSwap.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const NETWORK = process.env.MINA_NETWORK || 'berkeley';
const ZKAPP_ADDRESS = process.env.ZKAPP_ADDRESS || '';
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || '';

const NETWORKS = {
  berkeley: 'https://proxy.berkeley.minaexplorer.com/graphql',
  mainnet: 'https://proxy.minaexplorer.com/graphql',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function setupNetwork() {
  const networkUrl = NETWORKS[NETWORK as keyof typeof NETWORKS];
  const Network = Mina.Network(networkUrl);
  Mina.setActiveInstance(Network);

  const deployerKey = PrivateKey.fromBase58(DEPLOYER_PRIVATE_KEY);
  const deployerAccount = deployerKey.toPublicKey();
  const zkAppAddress = PublicKey.fromBase58(ZKAPP_ADDRESS);
  const zkApp = new AtomicSwapContract(zkAppAddress);

  await fetchAccount({ publicKey: deployerAccount });
  await fetchAccount({ publicKey: zkAppAddress });

  // Get current config (in production, fetch from off-chain storage/events)
  // For now, we'll use the deployer as owner/feeRecipient/oracle
  const config = new ContractConfig({
    owner: deployerAccount,
    feeRecipient: deployerAccount,
    oraclePublicKey: deployerAccount,
  });

  return { zkApp, deployerKey, deployerAccount, zkAppAddress, config };
}

// ============================================================================
// INTERACTION FUNCTIONS
// ============================================================================

/**
 * Initiate an atomic swap
 */
async function initiateSwap(args: any) {
  console.log('\n🚀 Initiating Atomic Swap...\n');

  const { zkApp, deployerKey, deployerAccount } = await setupNetwork();

  // Parse arguments
  const swapId = Field(args.swapId || Math.floor(Math.random() * 1000000));
  const recipient = PublicKey.fromBase58(args.recipient);
  const amount = UInt64.from(args.amount || 1000);
  const secret = Field(args.secret ? parseInt(args.secret) : 12345);
  const hashLock = Poseidon.hash([secret]);
  const timeLockDuration = UInt64.from(args.timeLock || 7200);
  const targetChain = encodeChainName(args.targetChain || 'zcash');
  const targetSwapId = Field(args.targetSwapId ? parseInt(args.targetSwapId) : 123);

  console.log('📝 Swap Parameters:');
  console.log(`   Swap ID:         ${swapId.toString()}`);
  console.log(`   Recipient:       ${recipient.toBase58()}`);
  console.log(`   Amount:          ${amount.toString()} MINA`);
  console.log(`   Hash Lock:       ${hashLock.toString()}`);
  console.log(`   Time Lock:       ${timeLockDuration.toString()}s`);
  console.log(`   Target Chain:    ${args.targetChain || 'zcash'}`);
  console.log(`   Target Swap ID:  ${args.targetSwapId || 'target_swap'}\n`);

  // Create Merkle witness
  const merkleMap = new MerkleMap();
  const witness = merkleMap.getWitness(swapId);

  // Create transaction
  console.log('📤 Creating transaction...');
  const txn = await Mina.transaction({ sender: deployerAccount, fee: 0.1 * 1e9 },
    async () => {
      zkApp.initiateSwap(
        swapId,
        recipient,
        amount,
        hashLock,
        timeLockDuration,
        targetChain,
        targetSwapId,
        witness
      );
    }
  );

  console.log('⚙️  Proving transaction...');
  await txn.prove();

  console.log('📝 Signing and sending...');
  await txn.sign([deployerKey]).send();

  console.log('\n✅ Swap initiated successfully!');
  console.log(`   Swap ID: ${swapId.toString()}`);
  console.log(`   Secret (save this!): ${args.secret || 'default_secret'}\n`);
}

/**
 * Complete an atomic swap
 */
async function completeSwap(args: any) {
  console.log('\n🔓 Completing Atomic Swap...\n');

  const { zkApp, deployerKey, deployerAccount, config } = await setupNetwork();

  // Parse arguments
  const swapId = Field(args.swapId);
  const secret = Field(parseInt(args.secret));

  console.log('📝 Completion Parameters:');
  console.log(`   Swap ID: ${swapId.toString()}`);
  console.log(`   Secret:  ${args.secret}\n`);

  // Reconstruct swap details (would typically fetch from backend/off-chain storage)
  const swapDetails = new SwapDetails({
    swapId,
    initiator: deployerAccount, // Would be actual initiator
    recipient: deployerAccount, // Would be actual recipient
    amount: UInt64.from(args.amount || 1000),
    hashLock: Poseidon.hash([secret]),
    timeLock: UInt64.from(args.timeLock || 7200),
    status: SwapStatus.Active,
    secret: Field(0),
    targetChain: encodeChainName(args.targetChain || 'zcash'),
    targetSwapId: Field(args.targetSwapId ? parseInt(args.targetSwapId) : 456),
    createdAt: UInt64.from(0),
  });

  // Create Merkle witness
  const merkleMap = new MerkleMap();
  merkleMap.set(swapId, swapDetails.hash());
  const witness = merkleMap.getWitness(swapId);

  // Cross-chain proof (mock for now)
  const crossChainProof = new CrossChainProof({
    chainId: encodeChainName(args.targetChain || 'zcash'),
    txHash: Field(789),
    blockNumber: UInt64.from(123456),
    proofData: Field(0),
    verified: Bool(true),
  });

  // Create transaction
  console.log('📤 Creating transaction...');
  const txn = await Mina.transaction({ sender: deployerAccount, fee: 0.1 * 1e9 },
    async () => {
      zkApp.completeSwap(
        swapId,
        secret,
        swapDetails,
        witness,
        crossChainProof,
        config // ← Added config parameter!
      );
    }
  );

  console.log('⚙️  Proving transaction...');
  await txn.prove();

  console.log('📝 Signing and sending...');
  await txn.sign([deployerKey]).send();

  console.log('\n✅ Swap completed successfully!\n');
}

/**
 * Refund an expired swap
 */
async function refundSwap(args: any) {
  console.log('\n🔄 Refunding Atomic Swap...\n');

  const { zkApp, deployerKey, deployerAccount } = await setupNetwork();

  const swapId = Field(args.swapId);

  console.log('📝 Refund Parameters:');
  console.log(`   Swap ID: ${swapId.toString()}\n`);

  // Reconstruct swap details
  const swapDetails = new SwapDetails({
    swapId,
    initiator: deployerAccount,
    recipient: PublicKey.fromBase58(args.recipient || deployerAccount.toBase58()),
    amount: UInt64.from(args.amount || 1000),
    hashLock: Field(0),
    timeLock: UInt64.from(1000), // Expired
    status: SwapStatus.Active,
    secret: Field(0),
    targetChain: encodeChainName('zcash'),
    targetSwapId: Field(0),
    createdAt: UInt64.from(0),
  });

  const merkleMap = new MerkleMap();
  merkleMap.set(swapId, swapDetails.hash());
  const witness = merkleMap.getWitness(swapId);

  console.log('📤 Creating transaction...');
  const txn = await Mina.transaction({ sender: deployerAccount, fee: 0.1 * 1e9 },
    async () => {
      zkApp.refundSwap(swapId, swapDetails, witness);
    }
  );

  console.log('⚙️  Proving transaction...');
  await txn.prove();

  console.log('📝 Signing and sending...');
  await txn.sign([deployerKey]).send();

  console.log('\n✅ Swap refunded successfully!\n');
}

/**
 * Query swap status
 */
async function querySwap(args: any) {
  console.log('\n🔍 Querying Swap Status...\n');

  const { zkApp } = await setupNetwork();

  const swapId = Field(args.swapId);
  console.log(`Swap ID: ${swapId.toString()}\n`);

  // Fetch contract events
  const events = await zkApp.fetchEvents();
  console.log(`Found ${events.length} events:`);

  events.forEach((event: any, i: number) => {
    console.log(`\n${i + 1}. ${event.type}`);
    console.log(`   Data: ${JSON.stringify(event.event.data, null, 2)}`);
  });

  console.log('');
}

/**
 * Update contract configuration
 */
async function updateConfig(args: any) {
  console.log('\n⚙️  Updating Contract Config...\n');

  const { zkApp, deployerKey, deployerAccount } = await setupNetwork();

  const newConfig = new ContractConfig({
    owner: args.owner ? PublicKey.fromBase58(args.owner) : deployerAccount,
    feeRecipient: args.feeRecipient ? PublicKey.fromBase58(args.feeRecipient) : deployerAccount,
    oraclePublicKey: args.oracle ? PublicKey.fromBase58(args.oracle) : deployerAccount,
  });

  console.log('📝 New Config:');
  console.log(`   Owner:        ${newConfig.owner.toBase58()}`);
  console.log(`   Fee Recipient: ${newConfig.feeRecipient.toBase58()}`);
  console.log(`   Oracle:       ${newConfig.oraclePublicKey.toBase58()}\n`);

  const configFields = [
    ...newConfig.owner.toFields(),
    ...newConfig.feeRecipient.toFields(),
    ...newConfig.oraclePublicKey.toFields(),
  ];
  const signature = Signature.create(deployerKey, configFields);

  console.log('📤 Creating transaction...');
  const txn = await Mina.transaction({ sender: deployerAccount, fee: 0.1 * 1e9 },
    async () => {
      zkApp.updateConfig(newConfig, signature);
    }
  );

  console.log('⚙️  Proving transaction...');
  await txn.prove();

  console.log('📝 Signing and sending...');
  await txn.sign([deployerKey]).send();

  console.log('\n✅ Config updated successfully!\n');
}

// ============================================================================
// MAIN CLI
// ============================================================================

const args = process.argv.slice(2);
const command = args[0];

// Parse command-line arguments
function parseArgs() {
  const parsed: any = {};
  for (let i = 1; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    parsed[key] = value;
  }
  return parsed;
}

const parsedArgs = parseArgs();

switch (command) {
  case 'initiate':
    initiateSwap(parsedArgs).catch(console.error);
    break;

  case 'complete':
    completeSwap(parsedArgs).catch(console.error);
    break;

  case 'refund':
    refundSwap(parsedArgs).catch(console.error);
    break;

  case 'query':
    querySwap(parsedArgs).catch(console.error);
    break;

  case 'config':
    updateConfig(parsedArgs).catch(console.error);
    break;

  default:
    console.log(`📖 Mina Atomic Swap Interaction CLI

Usage:
  npm run interact <command> [options]

Commands:
  initiate    Initiate a new atomic swap
  complete    Complete a swap by revealing secret
  refund      Refund an expired swap
  query       Query swap status
  config      Update contract configuration

Examples:
  # Initiate a swap
  npm run interact initiate \\
    --recipient B62qXXXXXXXXXXXXXXXXXXXXXX \\
    --amount 1000 \\
    --secret mysecret123 \\
    --timeLock 7200 \\
    --targetChain zcash \\
    --targetSwapId zec_tx_abc123

  # Complete a swap
  npm run interact complete \\
    --swapId 12345 \\
    --secret mysecret123

  # Refund a swap
  npm run interact refund --swapId 12345

  # Query swap
  npm run interact query --swapId 12345

  # Update config
  npm run interact config \\
    --feeRecipient B62qYYYYYYYYYYYYYYYYYYYY \\
    --oracle B62qZZZZZZZZZZZZZZZZZZZZZ`);
}
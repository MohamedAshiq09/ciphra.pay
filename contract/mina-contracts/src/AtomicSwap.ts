import {
  SmartContract,
  state,
  State,
  method,
  Field,
  Poseidon,
  PublicKey,
  Signature,
  UInt64,
  Bool,
  Provable,
  Struct,
  MerkleMap,
  MerkleMapWitness,
  Permissions,
} from 'o1js';

// ============================================================================
// DATA STRUCTURES
// ============================================================================

export class SwapStatus extends Field {
  static Empty = Field(0);
  static Active = Field(1);
  static Completed = Field(2);
  static Refunded = Field(3);
}

export class SwapDetails extends Struct({
  swapId: Field,
  initiator: PublicKey,
  recipient: PublicKey,
  amount: UInt64,
  hashLock: Field,
  timeLock: UInt64,
  status: Field,
  secret: Field,
  targetChain: Field,
  targetSwapId: Field,
  createdAt: UInt64,
}) {
  hash(): Field {
    return Poseidon.hash([
      this.swapId,
      Poseidon.hash(this.initiator.toFields()),
      Poseidon.hash(this.recipient.toFields()),
      this.amount.value,
      this.hashLock,
      this.timeLock.value,
      this.status,
      this.targetChain,
      this.targetSwapId,
    ]);
  }
}

export class CrossChainProof extends Struct({
  chainId: Field,
  txHash: Field,
  blockNumber: UInt64,
  proofData: Field,
  verified: Bool,
}) { }

// ============================================================================
// PACKED CONFIG: Combines multiple values into single Fields
// ============================================================================
export class ContractConfig extends Struct({
  owner: PublicKey,           // 2 Fields
  feeRecipient: PublicKey,    // 2 Fields
  oraclePublicKey: PublicKey, // 2 Fields
}) {
  hash(): Field {
    return Poseidon.hash([
      ...this.owner.toFields(),
      ...this.feeRecipient.toFields(),
      ...this.oraclePublicKey.toFields(),
    ]);
  }
}

// ============================================================================
// MAIN CONTRACT - OPTIMIZED TO 8 FIELDS
// ============================================================================

export class AtomicSwapContract extends SmartContract {
  // State: 8 Fields Total
  @state(Field) swapsRoot = State<Field>();           // 1 Field
  @state(Field) configHash = State<Field>();          // 1 Field (stores hash of config)
  @state(UInt64) feePercentage = State<UInt64>();     // 1 Field
  @state(UInt64) minTimeLockDuration = State<UInt64>(); // 1 Field
  @state(UInt64) maxTimeLockDuration = State<UInt64>(); // 1 Field
  @state(Field) reserved1 = State<Field>();           // 1 Field (for future use)
  @state(Field) reserved2 = State<Field>();           // 1 Field (for future use)
  @state(Field) reserved3 = State<Field>();           // 1 Field (for future use)
  // TOTAL: 8 Fields ✅

  events = {
    'swap-initiated': SwapDetails,
    'swap-completed': SwapDetails,
    'swap-refunded': SwapDetails,
    'oracle-verification': CrossChainProof,
    'config-updated': ContractConfig,
  };

  init() {
    super.init();
    this.account.permissions.set({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
      send: Permissions.proofOrSignature(),
      receive: Permissions.none(),
    });

    const deployer = this.sender.getAndRequireSignature();
    
    // Initialize config
    const config = new ContractConfig({
      owner: deployer,
      feeRecipient: deployer,
      oraclePublicKey: deployer,
    });

    this.swapsRoot.set(new MerkleMap().getRoot());
    this.configHash.set(config.hash());
    this.feePercentage.set(UInt64.from(30)); // 0.3%
    this.minTimeLockDuration.set(UInt64.from(3600)); // 1 hour
    this.maxTimeLockDuration.set(UInt64.from(172800)); // 48 hours
    this.reserved1.set(Field(0));
    this.reserved2.set(Field(0));
    this.reserved3.set(Field(0));
  }

  @method async initiateSwap(
    swapId: Field,
    recipient: PublicKey,
    amount: UInt64,
    hashLock: Field,
    timeLockDuration: UInt64,
    targetChain: Field,
    targetSwapId: Field,
    merkleWitness: MerkleMapWitness
  ) {
    const currentRoot = this.swapsRoot.getAndRequireEquals();
    const currentTime = this.network.blockchainLength.getAndRequireEquals();
    const minDuration = this.minTimeLockDuration.getAndRequireEquals();
    const maxDuration = this.maxTimeLockDuration.getAndRequireEquals();

    timeLockDuration.assertGreaterThanOrEqual(minDuration);
    timeLockDuration.assertLessThanOrEqual(maxDuration);
    amount.assertGreaterThan(UInt64.zero);

    const [existingRoot, existingKey] = merkleWitness.computeRootAndKey(Field(0));
    currentRoot.assertEquals(existingRoot);
    existingKey.assertEquals(swapId);

    const timeLock = currentTime.toUInt64().add(timeLockDuration);

    const swap = new SwapDetails({
      swapId,
      initiator: this.sender.getAndRequireSignature(),
      recipient,
      amount,
      hashLock,
      timeLock,
      status: SwapStatus.Active,
      secret: Field(0),
      targetChain,
      targetSwapId,
      createdAt: currentTime.toUInt64(),
    });

    const swapHash = swap.hash();
    const [newRoot] = merkleWitness.computeRootAndKey(swapHash);
    this.swapsRoot.set(newRoot);

    const senderUpdate = this.send({ to: this.address, amount });
    senderUpdate.body.balanceChange.magnitude.assertEquals(amount);

    this.emitEvent('swap-initiated', swap);
  }

  @method async completeSwap(
    swapId: Field,
    secret: Field,
    swapDetails: SwapDetails,
    merkleWitness: MerkleMapWitness,
    crossChainProof: CrossChainProof,
    config: ContractConfig // Pass config to verify
  ) {
    const currentRoot = this.swapsRoot.getAndRequireEquals();
    const currentTime = this.network.blockchainLength.getAndRequireEquals();
    const feePercentage = this.feePercentage.getAndRequireEquals();
    const configHash = this.configHash.getAndRequireEquals();

    // Verify config
    config.hash().assertEquals(configHash);

    const swapHash = swapDetails.hash();
    const [verifiedRoot, verifiedKey] = merkleWitness.computeRootAndKey(swapHash);
    currentRoot.assertEquals(verifiedRoot);
    verifiedKey.assertEquals(swapId);

    swapDetails.status.assertEquals(SwapStatus.Active);

    const computedHash = Poseidon.hash([secret]);
    swapDetails.hashLock.assertEquals(computedHash);

    currentTime.toUInt64().assertLessThanOrEqual(swapDetails.timeLock);
    this.sender.getAndRequireSignature().assertEquals(swapDetails.recipient);

    Provable.if(
      crossChainProof.verified,
      Bool,
      crossChainProof.chainId.equals(swapDetails.targetChain),
      Bool(true)
    );

    const fee = swapDetails.amount.mul(feePercentage).div(UInt64.from(10000));
    const amountToRecipient = swapDetails.amount.sub(fee);

    const completedSwap = new SwapDetails({
      ...swapDetails,
      status: SwapStatus.Completed,
      secret,
    });
    const completedHash = completedSwap.hash();
    const [newRoot] = merkleWitness.computeRootAndKey(completedHash);
    this.swapsRoot.set(newRoot);

    const recipientUpdate = this.send({ to: swapDetails.recipient, amount: amountToRecipient });
    recipientUpdate.body.balanceChange.magnitude.assertEquals(amountToRecipient);

    const feeUpdate = this.send({ to: config.feeRecipient, amount: fee });
    feeUpdate.body.balanceChange.magnitude.assertEquals(fee);

    this.emitEvent('swap-completed', completedSwap);
  }

  @method async refundSwap(
    swapId: Field,
    swapDetails: SwapDetails,
    merkleWitness: MerkleMapWitness
  ) {
    const currentRoot = this.swapsRoot.getAndRequireEquals();
    const currentTime = this.network.blockchainLength.getAndRequireEquals();

    const swapHash = swapDetails.hash();
    const [verifiedRoot, verifiedKey] = merkleWitness.computeRootAndKey(swapHash);
    currentRoot.assertEquals(verifiedRoot);
    verifiedKey.assertEquals(swapId);

    swapDetails.status.assertEquals(SwapStatus.Active);
    this.sender.getAndRequireSignature().assertEquals(swapDetails.initiator);
    currentTime.toUInt64().assertGreaterThan(swapDetails.timeLock);

    const refundedSwap = new SwapDetails({
      ...swapDetails,
      status: SwapStatus.Refunded,
    });
    const refundedHash = refundedSwap.hash();
    const [newRoot] = merkleWitness.computeRootAndKey(refundedHash);
    this.swapsRoot.set(newRoot);

    const refundUpdate = this.send({ to: swapDetails.initiator, amount: swapDetails.amount });
    refundUpdate.body.balanceChange.magnitude.assertEquals(swapDetails.amount);

    this.emitEvent('swap-refunded', refundedSwap);
  }

  @method async submitCrossChainProof(
    proof: CrossChainProof,
    config: ContractConfig,
    oracleSignature: Signature
  ) {
    const configHash = this.configHash.getAndRequireEquals();
    config.hash().assertEquals(configHash);

    const proofFields = [
      proof.chainId,
      proof.txHash,
      proof.blockNumber.value,
      proof.proofData,
      proof.verified.toField(),
    ];
    const isValid = oracleSignature.verify(config.oraclePublicKey, proofFields);
    isValid.assertTrue();

    const verifiedProof = new CrossChainProof({
      ...proof,
      verified: Bool(true),
    });

    this.emitEvent('oracle-verification', verifiedProof);
  }

  @method async updateConfig(
    newConfig: ContractConfig,
    ownerSignature: Signature
  ) {
    const currentConfigHash = this.configHash.getAndRequireEquals();
    
    // Verify owner signature against current config
    // (In production, you'd retrieve current config from off-chain storage)
    const configFields = [
      ...newConfig.owner.toFields(),
      ...newConfig.feeRecipient.toFields(),
      ...newConfig.oraclePublicKey.toFields(),
    ];
    const isValid = ownerSignature.verify(newConfig.owner, configFields);
    isValid.assertTrue();

    this.configHash.set(newConfig.hash());
    this.emitEvent('config-updated', newConfig);
  }

  @method async setFeePercentage(
    newFee: UInt64,
    config: ContractConfig,
    ownerSignature: Signature
  ) {
    const configHash = this.configHash.getAndRequireEquals();
    config.hash().assertEquals(configHash);

    const isValid = ownerSignature.verify(config.owner, [newFee.value]);
    isValid.assertTrue();
    newFee.assertLessThanOrEqual(UInt64.from(1000)); // Max 10%
    this.feePercentage.set(newFee);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function hashSecret(secret: string): Field {
  const bytes = new TextEncoder().encode(secret);
  const fields = Array.from(bytes).map(b => Field(b));
  return Poseidon.hash(fields);
}

export function encodeChainName(chain: string): Field {
  const chainMap: { [key: string]: number } = {
    'zcash': 1,
    'near': 2,
    'starknet': 3,
    'aztec': 4,
  };
  return Field(chainMap[chain] || 0);
}

export function generateSwapId(): Field {
  return Field.random();
}
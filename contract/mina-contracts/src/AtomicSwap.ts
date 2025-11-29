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
// MAIN CONTRACT
// ============================================================================

export class AtomicSwapContract extends SmartContract {
  @state(Field) swapsRoot = State<Field>();
  @state(PublicKey) owner = State<PublicKey>();
  @state(UInt64) feePercentage = State<UInt64>();
  @state(PublicKey) feeRecipient = State<PublicKey>();
  @state(PublicKey) oraclePublicKey = State<PublicKey>();
  @state(UInt64) minTimeLockDuration = State<UInt64>();
  @state(UInt64) maxTimeLockDuration = State<UInt64>();

  events = {
    'swap-initiated': SwapDetails,
    'swap-completed': SwapDetails,
    'swap-refunded': SwapDetails,
    'oracle-verification': CrossChainProof,
  };

  init() {
    super.init();
    this.account.permissions.set({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
      send: Permissions.proofOrSignature(),
      receive: Permissions.none(),
    });

    this.swapsRoot.set(new MerkleMap().getRoot());
    this.owner.set(this.sender.getAndRequireSignature());
    this.feePercentage.set(UInt64.from(30));
    this.feeRecipient.set(this.sender.getAndRequireSignature());
    this.oraclePublicKey.set(this.sender.getAndRequireSignature());
    this.minTimeLockDuration.set(UInt64.from(3600));
    this.maxTimeLockDuration.set(UInt64.from(172800));
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
    const currentRoot = this.swapsRoot.get();
    this.swapsRoot.requireEquals(currentRoot);
    
    const currentTime = this.network.blockchainLength.get();
    this.network.blockchainLength.requireEquals(currentTime);
    
    const minDuration = this.minTimeLockDuration.get();
    this.minTimeLockDuration.requireEquals(minDuration);
    
    const maxDuration = this.maxTimeLockDuration.get();
    this.maxTimeLockDuration.requireEquals(maxDuration);

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
    crossChainProof: CrossChainProof
  ) {
    const currentRoot = this.swapsRoot.get();
    this.swapsRoot.requireEquals(currentRoot);
    
    const currentTime = this.network.blockchainLength.get();
    this.network.blockchainLength.requireEquals(currentTime);
    
    const feePercentage = this.feePercentage.get();
    this.feePercentage.requireEquals(feePercentage);
    
    const feeRecipient = this.feeRecipient.get();
    this.feeRecipient.requireEquals(feeRecipient);

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

    const feeUpdate = this.send({ to: feeRecipient, amount: fee });
    feeUpdate.body.balanceChange.magnitude.assertEquals(fee);

    this.emitEvent('swap-completed', completedSwap);
  }

  @method async refundSwap(
    swapId: Field,
    swapDetails: SwapDetails,
    merkleWitness: MerkleMapWitness
  ) {
    const currentRoot = this.swapsRoot.get();
    this.swapsRoot.requireEquals(currentRoot);
    
    const currentTime = this.network.blockchainLength.get();
    this.network.blockchainLength.requireEquals(currentTime);

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
    oracleSignature: Signature
  ) {
    const oracle = this.oraclePublicKey.get();
    this.oraclePublicKey.requireEquals(oracle);

    const proofFields = [
      proof.chainId,
      proof.txHash,
      proof.blockNumber.value,
      proof.proofData,
      proof.verified.toField(),
    ];
    const isValid = oracleSignature.verify(oracle, proofFields);
    isValid.assertTrue();

    const verifiedProof = new CrossChainProof({
      ...proof,
      verified: Bool(true),
    });

    this.emitEvent('oracle-verification', verifiedProof);
  }

  @method async setFeePercentage(newFee: UInt64, ownerSignature: Signature) {
    const owner = this.owner.get();
    this.owner.requireEquals(owner);
    
    const isValid = ownerSignature.verify(owner, [newFee.value]);
    isValid.assertTrue();
    newFee.assertLessThanOrEqual(UInt64.from(1000));
    this.feePercentage.set(newFee);
  }

  @method async setFeeRecipient(newRecipient: PublicKey, ownerSignature: Signature) {
    const owner = this.owner.get();
    this.owner.requireEquals(owner);
    
    const isValid = ownerSignature.verify(owner, newRecipient.toFields());
    isValid.assertTrue();
    this.feeRecipient.set(newRecipient);
  }

  @method async setOraclePublicKey(newOracle: PublicKey, ownerSignature: Signature) {
    const owner = this.owner.get();
    this.owner.requireEquals(owner);
    
    const isValid = ownerSignature.verify(owner, newOracle.toFields());
    isValid.assertTrue();
    this.oraclePublicKey.set(newOracle);
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
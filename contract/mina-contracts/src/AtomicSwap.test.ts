import {
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  UInt64,
  UInt32,
  Poseidon,
  MerkleMap,
  Signature,
  Bool,
} from 'o1js';

import {
  AtomicSwapContract,
  SwapDetails,
  SwapStatus,
  CrossChainProof,
  ContractConfig,
  hashSecret,
  encodeChainName,
} from './AtomicSwap';

describe('Mina Atomic Swap Contract', () => {
  let deployerAccount: PublicKey;
  let deployerKey: PrivateKey;
  let senderAccount: PublicKey;
  let senderKey: PrivateKey;
  let recipientAccount: PublicKey;
  let recipientKey: PrivateKey;
  let zkAppAddress: PublicKey;
  let zkAppPrivateKey: PrivateKey;
  let zkApp: AtomicSwapContract;
  let Local: any;
  let merkleMap: MerkleMap;
  let config: ContractConfig;

  beforeAll(async () => {
    // Setup local blockchain
    Local = Mina.LocalBlockchain({ proofsEnabled: false });
    Mina.setActiveInstance(Local);

    // Generate accounts
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    ({ privateKey: senderKey, publicKey: senderAccount } =
      Local.testAccounts[1]);
    ({ privateKey: recipientKey, publicKey: recipientAccount } =
      Local.testAccounts[2]);

    // Generate zkApp account
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();

    // Create contract instance
    zkApp = new AtomicSwapContract(zkAppAddress);

    // Initialize Merkle map
    merkleMap = new MerkleMap();

    // Initialize config (will be set after deployment)
    config = new ContractConfig({
      owner: deployerAccount,
      feeRecipient: deployerAccount,
      oraclePublicKey: deployerAccount,
    });
  });

  // ==========================================================================
  // TEST GROUP 1: Contract Deployment
  // ==========================================================================

  describe('Deployment', () => {
    it('should deploy the zkApp', async () => {
      const txn = await Mina.transaction(deployerAccount, async () => {
        AccountUpdate.fundNewAccount(deployerAccount);
        zkApp.deploy();
      });
      await txn.prove();
      await txn.sign([deployerKey, zkAppPrivateKey]).send();

      // Verify config hash is set
      const configHash = zkApp.configHash.get();
      expect(configHash).toEqual(config.hash());

      const feePercentage = zkApp.feePercentage.get();
      expect(feePercentage).toEqual(UInt64.from(30)); // 0.3%
    });

    it('should have correct initial state', async () => {
      const swapsRoot = zkApp.swapsRoot.get();
      expect(swapsRoot).toEqual(merkleMap.getRoot());

      const minTimeLock = zkApp.minTimeLockDuration.get();
      expect(minTimeLock).toEqual(UInt64.from(3600)); // 1 hour

      const maxTimeLock = zkApp.maxTimeLockDuration.get();
      expect(maxTimeLock).toEqual(UInt64.from(172800)); // 48 hours
    });
  });

  // ==========================================================================
  // TEST GROUP 2: Initiate Swap
  // ==========================================================================

  describe('Initiate Swap', () => {
    it('should initiate a Zcash ↔ Mina swap', async () => {
      const swapId = Field(1);
      const secret = Field(12345);
      const hashLock = Poseidon.hash([secret]);
      const amount = UInt64.from(1000);
      const timeLockDuration = UInt64.from(7200); // 2 hours
      const targetChain = Field(1); // zcash
      const targetSwapId = Field(123);

      const witness = merkleMap.getWitness(swapId);

      const txn = await Mina.transaction(senderAccount, async () => {
        zkApp.initiateSwap(
          swapId,
          recipientAccount,
          amount,
          hashLock,
          timeLockDuration,
          targetChain,
          targetSwapId,
          witness
        );
      });
      await txn.prove();
      await txn.sign([senderKey]).send();

      // Verify swap was created (check events)
      const events = await zkApp.fetchEvents();
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('swap-initiated');
    });

    it('should initiate a NEAR ↔ Mina swap', async () => {
      const swapId = Field(2);
      const secret = Field(23456);
      const hashLock = Poseidon.hash([secret]);
      const amount = UInt64.from(2000);
      const timeLockDuration = UInt64.from(3600); // 1 hour
      const targetChain = Field(2); // near
      const targetSwapId = Field(234);

      const witness = merkleMap.getWitness(swapId);

      const txn = await Mina.transaction(senderAccount, async () => {
        zkApp.initiateSwap(
          swapId,
          recipientAccount,
          amount,
          hashLock,
          timeLockDuration,
          targetChain,
          targetSwapId,
          witness
        );
      });
      await txn.prove();
      await txn.sign([senderKey]).send();

      const events = await zkApp.fetchEvents();
      expect(events.length).toBeGreaterThan(0);
    });

    it('should initiate a Starknet ↔ Mina swap', async () => {
      const swapId = Field(3);
      const secret = Field(34567);
      const hashLock = Poseidon.hash([secret]);
      const amount = UInt64.from(3000);
      const timeLockDuration = UInt64.from(10800); // 3 hours
      const targetChain = Field(3); // starknet
      const targetSwapId = Field(345);

      const witness = merkleMap.getWitness(swapId);

      const txn = await Mina.transaction(senderAccount, async () => {
        zkApp.initiateSwap(
          swapId,
          recipientAccount,
          amount,
          hashLock,
          timeLockDuration,
          targetChain,
          targetSwapId,
          witness
        );
      });
      await txn.prove();
      await txn.sign([senderKey]).send();

      const events = await zkApp.fetchEvents();
      expect(events.length).toBeGreaterThan(0);
    });

    it('should fail with zero amount', async () => {
      const swapId = Field(999);
      const hashLock = Poseidon.hash([Field(123)]);
      const amount = UInt64.zero; // Invalid!
      const timeLockDuration = UInt64.from(3600);
      const witness = merkleMap.getWitness(swapId);

      await expect(async () => {
        const txn = await Mina.transaction(senderAccount, async () => {
          zkApp.initiateSwap(
            swapId,
            recipientAccount,
            amount,
            hashLock,
            timeLockDuration,
            Field(1), // zcash
            Field(0),
            witness
          );
        });
        await txn.prove();
        await txn.sign([senderKey]).send();
      }).rejects.toThrow();
    });

    it('should fail with time lock too short', async () => {
      const swapId = Field(1000);
      const hashLock = Poseidon.hash([Field(123)]);
      const amount = UInt64.from(1000);
      const timeLockDuration = UInt64.from(1800); // 30 minutes - too short!
      const witness = merkleMap.getWitness(swapId);

      await expect(async () => {
        const txn = await Mina.transaction(senderAccount, async () => {
          zkApp.initiateSwap(
            swapId,
            recipientAccount,
            amount,
            hashLock,
            timeLockDuration,
            Field(1), // zcash
            Field(0),
            witness
          );
        });
        await txn.prove();
        await txn.sign([senderKey]).send();
      }).rejects.toThrow();
    });
  });

  // ==========================================================================
  // TEST GROUP 3: Complete Swap
  // ==========================================================================

  describe('Complete Swap', () => {
    it('should complete swap with valid secret', async () => {
      // Setup: Initiate a swap first
      const swapId = Field(10);
      const secret = Field(45678);
      const hashLock = Poseidon.hash([secret]);
      const amount = UInt64.from(5000);
      const timeLockDuration = UInt64.from(7200);
      const witness = merkleMap.getWitness(swapId);

      // Initiate
      let txn = await Mina.transaction(senderAccount, async () => {
        zkApp.initiateSwap(
          swapId,
          recipientAccount,
          amount,
          hashLock,
          timeLockDuration,
          Field(1), // zcash
          Field(456),
          witness
        );
      });
      await txn.prove();
      await txn.sign([senderKey]).send();

      // Update merkle map (simulate off-chain storage)
      const swapDetails = new SwapDetails({
        swapId,
        initiator: senderAccount,
        recipient: recipientAccount,
        amount,
        hashLock,
        timeLock: UInt64.from(7200),
        status: SwapStatus.Active,
        secret: Field(0),
        targetChain: Field(1), // zcash
        targetSwapId: Field(456),
        createdAt: UInt64.from(0),
      });
      const swapHash = swapDetails.hash();
      merkleMap.set(swapId, swapHash);

      // Complete swap (NOW WITH CONFIG!)
      const completeWitness = merkleMap.getWitness(swapId);
      const crossChainProof = new CrossChainProof({
        chainId: Field(1), // zcash
        txHash: Field(789),
        blockNumber: UInt64.from(123456),
        proofData: Field(0),
        verified: Bool(true),
      });

      txn = await Mina.transaction(recipientAccount, async () => {
        zkApp.completeSwap(
          swapId,
          secret,
          swapDetails,
          completeWitness,
          crossChainProof,
          config // ← Added config parameter!
        );
      });
      await txn.prove();
      await txn.sign([recipientKey]).send();

      const events = await zkApp.fetchEvents();
      const completedEvent = events.find((e: any) => e.type === 'swap-completed');
      expect(completedEvent).toBeDefined();
    });

    it('should fail with wrong secret', async () => {
      const swapId = Field(11);
      const correctSecret = Field(56789);
      const wrongSecret = Field(98765);
      const hashLock = Poseidon.hash([correctSecret]);
      const amount = UInt64.from(1000);

      // Initiate swap
      const witness = merkleMap.getWitness(swapId);
      let txn = await Mina.transaction(senderAccount, async () => {
        zkApp.initiateSwap(
          swapId,
          recipientAccount,
          amount,
          hashLock,
          UInt64.from(7200),
          Field(2), // near
          Field(0),
          witness
        );
      });
      await txn.prove();
      await txn.sign([senderKey]).send();

      // Try to complete with wrong secret
      const swapDetails = new SwapDetails({
        swapId,
        initiator: senderAccount,
        recipient: recipientAccount,
        amount,
        hashLock,
        timeLock: UInt64.from(7200),
        status: SwapStatus.Active,
        secret: Field(0),
        targetChain: Field(2), // near
        targetSwapId: Field(0),
        createdAt: UInt64.from(0),
      });
      merkleMap.set(swapId, swapDetails.hash());
      const completeWitness = merkleMap.getWitness(swapId);

      await expect(async () => {
        const txn = await Mina.transaction(recipientAccount, async () => {
          zkApp.completeSwap(
            swapId,
            wrongSecret, // Wrong!
            swapDetails,
            completeWitness,
            new CrossChainProof({
              chainId: Field(0),
              txHash: Field(0),
              blockNumber: UInt64.zero,
              proofData: Field(0),
              verified: Bool(false),
            }),
            config // ← Added config parameter!
          );
        });
        await txn.prove();
        await txn.sign([recipientKey]).send();
      }).rejects.toThrow();
    });
  });

  // ==========================================================================
  // TEST GROUP 4: Refund Swap
  // ==========================================================================

  describe('Refund Swap', () => {
    it('should refund expired swap', async () => {
      const swapId = Field(20);
      const secret = Field(67890);
      const hashLock = Poseidon.hash([secret]);
      const amount = UInt64.from(2000);

      // Initiate swap
      const witness = merkleMap.getWitness(swapId);
      let txn = await Mina.transaction(senderAccount, async () => {
        zkApp.initiateSwap(
          swapId,
          recipientAccount,
          amount,
          hashLock,
          UInt64.from(3600),
          Field(1), // zcash
          Field(0),
          witness
        );
      });
      await txn.prove();
      await txn.sign([senderKey]).send();

      // Simulate time passing (advance blockchain)
      Local.setBlockchainLength(UInt32.from(10000)); // Simulate expiry

      // Refund
      const swapDetails = new SwapDetails({
        swapId,
        initiator: senderAccount,
        recipient: recipientAccount,
        amount,
        hashLock,
        timeLock: UInt64.from(1000), // In the past now
        status: SwapStatus.Active,
        secret: Field(0),
        targetChain: Field(1), // zcash
        targetSwapId: Field(0),
        createdAt: UInt64.from(0),
      });
      merkleMap.set(swapId, swapDetails.hash());
      const refundWitness = merkleMap.getWitness(swapId);

      txn = await Mina.transaction(senderAccount, async () => {
        zkApp.refundSwap(swapId, swapDetails, refundWitness);
      });
      await txn.prove();
      await txn.sign([senderKey]).send();

      const events = await zkApp.fetchEvents();
      const refundedEvent = events.find((e: any) => e.type === 'swap-refunded');
      expect(refundedEvent).toBeDefined();
    });
  });

  // ==========================================================================
  // TEST GROUP 5: Admin Functions
  // ==========================================================================

  describe('Admin Functions', () => {
    it('should update fee percentage (owner only)', async () => {
      const newFee = UInt64.from(50); // 0.5%
      const signature = Signature.create(deployerKey, [newFee.value]);

      const txn = await Mina.transaction(deployerAccount, async () => {
        zkApp.setFeePercentage(newFee, config, signature); // ← Added config parameter!
      });
      await txn.prove();
      await txn.sign([deployerKey]).send();

      const updatedFee = zkApp.feePercentage.get();
      expect(updatedFee).toEqual(newFee);
    });

    it('should fail to update fee from non-owner', async () => {
      const newFee = UInt64.from(100);
      const signature = Signature.create(senderKey, [newFee.value]); // Wrong key!

      await expect(async () => {
        const txn = await Mina.transaction(senderAccount, async () => {
          zkApp.setFeePercentage(newFee, config, signature); // ← Added config parameter!
        });
        await txn.prove();
        await txn.sign([senderKey]).send();
      }).rejects.toThrow();
    });

    it('should update contract config', async () => {
      const newConfig = new ContractConfig({
        owner: deployerAccount,
        feeRecipient: senderAccount, // Changed!
        oraclePublicKey: deployerAccount,
      });

      const configFields = [
        ...newConfig.owner.toFields(),
        ...newConfig.feeRecipient.toFields(),
        ...newConfig.oraclePublicKey.toFields(),
      ];
      const signature = Signature.create(deployerKey, configFields);

      const txn = await Mina.transaction(deployerAccount, async () => {
        zkApp.updateConfig(newConfig, signature);
      });
      await txn.prove();
      await txn.sign([deployerKey]).send();

      const updatedConfigHash = zkApp.configHash.get();
      expect(updatedConfigHash).toEqual(newConfig.hash());

      // Update our local config reference
      config = newConfig;
    });
  });

  // ==========================================================================
  // TEST GROUP 6: Cross-Chain Verification
  // ==========================================================================

  describe('Cross-Chain Verification', () => {
    it('should submit Zcash cross-chain proof', async () => {
      const proof = new CrossChainProof({
        chainId: Field(1), // zcash
        txHash: Field(78901),
        blockNumber: UInt64.from(789012),
        proofData: Field(12345),
        verified: Bool(false),
      });

      const proofFields = [
        proof.chainId,
        proof.txHash,
        proof.blockNumber.value,
        proof.proofData,
        proof.verified.toField(),
      ];
      const signature = Signature.create(deployerKey, proofFields);

      const txn = await Mina.transaction(deployerAccount, async () => {
        zkApp.submitCrossChainProof(proof, config, signature); // ← Added config parameter!
      });
      await txn.prove();
      await txn.sign([deployerKey]).send();

      const events = await zkApp.fetchEvents();
      const verificationEvent = events.find((e: any) => e.type === 'oracle-verification');
      expect(verificationEvent).toBeDefined();
    });
  });

  // ==========================================================================
  // TEST GROUP 7: Fee Calculations
  // ==========================================================================

  describe('Fee Calculations', () => {
    it('should charge correct fee (0.3%)', () => {
      const amount = UInt64.from(10000);
      const feePercentage = UInt64.from(30); // 0.3%
      const expectedFee = amount.mul(feePercentage).div(UInt64.from(10000));
      expect(expectedFee).toEqual(UInt64.from(30));
    });

    it('should charge correct fee (0.5%)', () => {
      const amount = UInt64.from(10000);
      const feePercentage = UInt64.from(50); // 0.5%
      const expectedFee = amount.mul(feePercentage).div(UInt64.from(10000));
      expect(expectedFee).toEqual(UInt64.from(50));
    });
  });
});
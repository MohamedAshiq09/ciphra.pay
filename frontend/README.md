
  🔄 REAL ATOMIC SWAP: ZEC → STRK
  (Sender gives ZEC, receives STRK)

═══════════════════════════════════════════════════════════════════════════════

🔑 Swap ID: 0xec1dc0fa07f4cd06c0185aeb27db744d758668efc82b5b0bea72ffa9148790
🔐 Secret: 0xefaf59fabb2fc3d5e39bc0707adba3fb7789014ed1beaee980b4ce3c3c329b
🔒 Hash Lock: 0x69694a70395270c270e3d6d86247568be2ff4a4b1ba9dc9fa4f226a3d18fb5b

═══════════════════════════════════════════════════════════════════════════════
💰 PHASE 1: Sender locks ZEC on Zcash...
═══════════════════════════════════════════════════════════════════════════════
Connecting to Zcash testnet lightwalletd: lightwalletd.testnet.electriccoin.co:9067
✅ Connected! Latest block: 3718116
Getting UTXOs for tmK3sgY8d8Mh3RZHVE57Td8Tk7RpUbm5KJJ...
Found 5 UTXOs
📊 Current Block: 3718116
💰 UTXOs: 5, Balance: 0.8995 ZEC
⏳ Building ZEC transaction: 0.008 ZEC
⏳ Signing ZEC transaction...
📡 Broadcasting to Zcash testnet...
✅ ZEC LOCKED!
   TXID: 8f11f9c86d2707f91ff011fd2c6e0fb1a857c13005010076fd9897907aeaeb19
   Amount: 0.008 ZEC

═══════════════════════════════════════════════════════════════════════════════
📤 PHASE 2: Counterparty locks STRK on Starknet...
═══════════════════════════════════════════════════════════════════════════════
⏳ Submitting initiate_swap on Starknet...
📡 TX Hash: 0x50dd22ce4a7a635da099a7a3c1d2d20196e013d116f32479b32506ca5f1320d
⏳ Waiting for confirmation...
✅ STRK LOCKED ON STARKNET!
   Explorer: https://sepolia.starkscan.co/tx/0x50dd22ce4a7a635da099a7a3c1d2d20196e013d116f32479b32506ca5f1320d

═══════════════════════════════════════════════════════════════════════════════
🔓 PHASE 3: Sender reveals secret to claim STRK...
═══════════════════════════════════════════════════════════════════════════════
⏳ Submitting complete_swap with secret...
[2025-12-04T16:32:29.399Z] ERROR: Insufficient transaction data: found 9 V3 transactions with tips in 3 blocks (block range: 3571728-3571730). Required: 10 transactions. Consider reducing minTxsNecessary or increasing maxBlocks.
📡 TX Hash: 0x1bb5b3e30d7388779508fce38e3ce36dba7bc6a8bba1b959c098f86fad47bc7
✅ STRK CLAIMED!
   Explorer: https://sepolia.starkscan.co/tx/0x1bb5b3e30d7388779508fce38e3ce36dba7bc6a8bba1b959c098f86fad47bc7

═══════════════════════════════════════════════════════════════════════════════

  🎉 ZEC → STRK ATOMIC SWAP COMPLETED!

═══════════════════════════════════════════════════════════════════════════════

Summary:
  Swap ID: 0xec1dc0fa07f4cd06c0185aeb27db744d758668efc82b5b0bea72ffa9148790
  Secret: 0xefaf59fabb2fc3d5e39bc0707adba3fb7789014ed1beaee980b4ce3c3c329b

  Zcash (Sender locks first):
    TXID: 8f11f9c86d2707f91ff011fd2c6e0fb1a857c13005010076fd9897907aeaeb19
    Amount: 0.008 ZEC

  Starknet (Counterparty locks, Sender claims):
    Lock TX: https://sepolia.starkscan.co/tx/0x50dd22ce4a7a635da099a7a3c1d2d20196e013d116f32479b32506ca5f1320d
    Claim TX: https://sepolia.starkscan.co/tx/0x1bb5b3e30d7388779508fce38e3ce36dba7bc6a8bba1b959c098f86fad47bc7

═══════════════════════════════════════════════════════════════════════════════

✅ ZEC → STRK swap completed!


|||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
|||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||

└─I node test-scripts/real-atomic-swap.js
═══════════════════════════════════════════════════════════════════════════════

  🔄 REAL ATOMIC SWAP: STRK ↔ ZEC

═══════════════════════════════════════════════════════════════════════════════

🔑 Swap ID: 0xc52283b86ab0a5afe01b6227896f59d4a994f9d138eca56e4f43733e357f4d
🔐 Secret: 0x678b8a72bff14532abd99ba4930687b59ae2296f1bc1eef7c20f53fadf0cda
🔒 Hash Lock: 0x36448eb828290b4f311d44f69c53e4515271d9a5f2a7d40c85bfcb38bd94c10
⏰ Time Lock: 2025-12-04T17:27:06.000Z

═══════════════════════════════════════════════════════════════════════════════
📤 PHASE 1: Initiating swap on Starknet...
═══════════════════════════════════════════════════════════════════════════════
⏳ Submitting initiate_swap transaction...
[2025-12-04T16:27:07.777Z] ERROR: Insufficient transaction data: found 9 V3 transactions with tips in 3 blocks (block range: 3571571-3571573). Required: 10 transactions. Consider reducing minTxsNecessary or increasing maxBlocks.
📡 TX Hash: 0x4ab74198d6ecba0ca7e1b2860a24e7f3735b52538570ebe1971b50f8578942c
⏳ Waiting for confirmation...
✅ STARKNET SWAP INITIATED!
   Explorer: https://sepolia.starkscan.co/tx/0x4ab74198d6ecba0ca7e1b2860a24e7f3735b52538570ebe1971b50f8578942c

═══════════════════════════════════════════════════════════════════════════════
💰 PHASE 2: Sending ZEC payment...
═══════════════════════════════════════════════════════════════════════════════
Connecting to Zcash testnet lightwalletd: lightwalletd.testnet.electriccoin.co:9067
✅ Connected! Latest block: 3718114
Getting UTXOs for tmK3sgY8d8Mh3RZHVE57Td8Tk7RpUbm5KJJ...
Found 4 UTXOs
📊 Current Block: 3718114
💰 UTXOs: 4, Balance: 0.89975 ZEC
⏳ Building transaction: 0.005 ZEC with memo: HTLC:0xc52283b86ab0a5afe0
⏳ Signing transaction...
📡 Broadcasting to Zcash testnet...
✅ ZCASH PAYMENT SENT!
   TXID: "e205681ce9b8e9e89e1b9ac107f36a3bd90e159faddeff7d80b9263bff071fe5"
   Amount: 0.005 ZEC

═══════════════════════════════════════════════════════════════════════════════
🔓 PHASE 3: Completing swap on Starknet (revealing secret)...
═══════════════════════════════════════════════════════════════════════════════
⏳ Submitting complete_swap transaction...
[2025-12-04T16:27:27.984Z] ERROR: Insufficient transaction data: found 8 V3 transactions with tips in 3 blocks (block range: 3571580-3571582). Required: 10 transactions. Consider reducing minTxsNecessary or increasing maxBlocks.
📡 TX Hash: 0x160eee424e7503abf487b5c9f1cb07f51356f13f8dbf21e982797472bb995d9
⏳ Waiting for confirmation...
✅ STARKNET SWAP COMPLETED!
   Explorer: https://sepolia.starkscan.co/tx/0x160eee424e7503abf487b5c9f1cb07f51356f13f8dbf21e982797472bb995d9

═══════════════════════════════════════════════════════════════════════════════

  🎉 ATOMIC SWAP COMPLETED SUCCESSFULLY!

═══════════════════════════════════════════════════════════════════════════════

Summary:
  Swap ID: 0xc52283b86ab0a5afe01b6227896f59d4a994f9d138eca56e4f43733e357f4d
  Secret (revealed): 0x678b8a72bff14532abd99ba4930687b59ae2296f1bc1eef7c20f53fadf0cda

  Starknet Transactions:
    - Initiate: https://sepolia.starkscan.co/tx/0x4ab74198d6ecba0ca7e1b2860a24e7f3735b52538570ebe1971b50f8578942c
    - Complete: https://sepolia.starkscan.co/tx/0x160eee424e7503abf487b5c9f1cb07f51356f13f8dbf21e982797472bb995d9

  Zcash Transaction:
    - TXID: "e205681ce9b8e9e89e1b9ac107f36a3bd90e159faddeff7d80b9263bff071fe5"
    - Amount: 0.005 ZEC

═══════════════════════════════════════════════════════════════════════════════

✅ Atomic swap test completed successfully!

Result: {
  "swapId": "0xc52283b86ab0a5afe01b6227896f59d4a994f9d138eca56e4f43733e357f4d",
  "secret": "0x678b8a72bff14532abd99ba4930687b59ae2296f1bc1eef7c20f53fadf0cda",
  "starknetInitTx": "0x4ab74198d6ecba0ca7e1b2860a24e7f3735b52538570ebe1971b50f8578942c",
  "starknetCompleteTx": "0x160eee424e7503abf487b5c9f1cb07f51356f13f8dbf21e982797472bb995d9",
  "zcashTxid": "\"e205681ce9b8e9e89e1b9ac107f36a3bd90e159faddeff7d80b9263bff071fe5\""
}
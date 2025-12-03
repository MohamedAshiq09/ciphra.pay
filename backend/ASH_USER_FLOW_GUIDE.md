# 🚀 Ciphra.Pay User Flow Guide - How Ash Uses the Platform

## 👤 **Meet Ash - Our Power User**

Ash is a crypto enthusiast who wants to:
- Swap tokens between different blockchains
- Send private P2P payments
- Use escrow services for secure transactions
- Access everything through mobile wallets

## 🌐 **Platform Overview**

**Ciphra.Pay** is a multi-chain privacy-focused platform supporting:
- **Zcash** (Privacy + Zashi mobile wallet)
- **Starknet** (ZK-rollup + browser wallets)
- **NEAR** (Fast + web wallets)
- **Mina** (zk-SNARKs + Auro wallet)

---

## 📱 **User Flow 1: Ash's First Cross-Chain Swap (Zcash → NEAR)**

### **Step 1: Setup**
```bash
# Ash opens the Ciphra.Pay web app
https://ciphra.pay

# Gets his multi-chain wallet addresses
GET /api/wallet/ash/addresses
```

**Response:**
```json
{
  "success": true,
  "data": {
    "zcash": "ztestsapling1abc123...",
    "near": "ash.testnet",
    "starknet": "0x123...",
    "mina": "B62q..."
  }
}
```

### **Step 2: Check Balances**
```bash
# Ash checks his Zcash balance
GET /api/wallet/ash/zcash
```

**Response:**
```json
{
  "success": true,
  "data": {
    "chain": "zcash",
    "address": "ztestsapling1abc123...",
    "balance": {
      "confirmed": "5.0",
      "total": "5.0"
    },
    "features": ["shielded_transactions", "memos", "zashi_integration"]
  }
}
```

### **Step 3: Initiate Cross-Chain Swap**
```bash
# Ash wants to swap 1 ZEC for 100 NEAR
POST /api/swap/zcash/create
```

**Request:**
```json
{
  "initiator": "ash",
  "recipient": "ash",
  "direction": "zcash_to_other",
  "targetChain": "near",
  "zcashAmount": "1.0",
  "targetAmount": "100.0"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "swapId": "swap_1234567890_abc123",
    "status": "initiated",
    "paymentInstructions": {
      "address": "ztestsapling1facilitator...",
      "qrCode": "zcash:ztestsapling1facilitator...?amount=1.0&memo=SWAP-swap_1234567890_abc123",
      "deepLink": "zashi://pay?address=ztestsapling1facilitator...&amount=1.0&memo=SWAP-swap_1234567890_abc123",
      "instructions": [
        "Open Zashi wallet on your mobile device",
        "Scan the QR code or tap the Zashi link",
        "Verify the swap details and memo",
        "Confirm the ZEC payment in Zashi",
        "Wait for confirmation, then claim your tokens on NEAR"
      ]
    },
    "expiresAt": "2024-01-02T12:00:00Z"
  }
}
```

### **Step 4: Pay with Zashi Mobile Wallet**
1. **Ash opens Zashi wallet** on his phone
2. **Scans QR code** or taps the deep link
3. **Zashi pre-fills** payment details:
   - Amount: 1.0 ZEC
   - Address: ztestsapling1facilitator...
   - Memo: SWAP-swap_1234567890_abc123
4. **Ash confirms** the payment in Zashi
5. **Transaction broadcasts** to Zcash network

### **Step 5: Backend Detects Payment**
```bash
# Backend automatically detects the payment
[ZcashService] ✅ Zcash payment confirmed for swap: swap_1234567890_abc123
[ZcashService]    TX: abc123def456...
[SwapService] 🔄 Processing cross-chain swap to NEAR...
```

### **Step 6: NEAR Tokens Released**
```bash
# Backend calls NEAR contract to release tokens
POST /api/near/swap/complete
```

**Ash receives:**
- 100 NEAR tokens in his ash.testnet account
- Swap completion notification

---

## 💸 **User Flow 2: Ash's Private P2P Transfer (Zcash)**

### **Step 1: Create P2P Transfer**
```bash
# Ash wants to send 0.5 ZEC to his friend Bob privately
POST /api/p2p/zcash/create
```

**Request:**
```json
{
  "sender": "ash",
  "recipient": "bob",
  "amount": "0.5",
  "memo": "Coffee money 😊",
  "type": "custodial"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transferId": "p2p_1234567890_xyz789",
    "status": "pending",
    "paymentInstructions": {
      "address": "ztestsapling1facilitator...",
      "qrCode": "zcash:ztestsapling1facilitator...?amount=0.5&memo=P2P-p2p_1234567890_xyz789",
      "deepLink": "zashi://pay?address=ztestsapling1facilitator...&amount=0.5&memo=P2P-p2p_1234567890_xyz789",
      "instructions": [
        "Open Zashi wallet on your mobile device",
        "Scan the QR code or tap the Zashi link",
        "Verify the payment details and memo",
        "Confirm the transaction in Zashi",
        "Funds will be held in escrow until Bob claims them"
      ]
    }
  }
}
```

### **Step 2: Ash Pays via Zashi**
1. **Ash scans QR** with Zashi
2. **Confirms payment** of 0.5 ZEC
3. **Funds escrowed** by facilitator

### **Step 3: Bob Gets Notified**
```bash
# Bob checks his pending transfers
GET /api/p2p/user/bob/history
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transfers": [
      {
        "transferId": "p2p_1234567890_xyz789",
        "sender": "ash",
        "amount": "0.5",
        "memo": "Coffee money 😊",
        "status": "escrowed"
      }
    ]
  }
}
```

### **Step 4: Bob Claims the Transfer**
```bash
# Bob completes the P2P transfer
POST /api/p2p/p2p_1234567890_xyz789/complete
```

**Result:**
- 0.5 ZEC sent to Bob's Zcash address
- Private transaction with memo
- Both parties notified

---

## 🔒 **User Flow 3: Ash's Escrow Service (Starknet)**

### **Step 1: Create Escrow for Freelance Work**
```bash
# Ash hires a developer and wants to use escrow
POST /api/starknet/escrow/create
```

**Request:**
```json
{
  "escrowId": "escrow_dev_work_123",
  "beneficiary": "0xdeveloper123...",
  "releaseTime": 1704067200,
  "metadata": "Website development project",
  "amount": "1000"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "txHash": "0xstarknet_tx_456...",
    "escrowId": "escrow_dev_work_123",
    "message": "Starknet escrow created successfully"
  }
}
```

### **Step 2: Developer Completes Work**
```bash
# Developer submits cross-chain proof of work completion
POST /api/starknet/escrow/escrow_dev_work_123/submit-proof
```

### **Step 3: Funds Released**
```bash
# After verification, funds are released
POST /api/starknet/escrow/escrow_dev_work_123/release
```

---

## 🌉 **User Flow 4: Ash's Cross-Chain Bridge (Mina ↔ Starknet)**

### **Step 1: Bridge Tokens from Mina to Starknet**
```bash
# Ash wants to bridge MINA tokens to Starknet
POST /api/mina/swap/initiate
```

**Request:**
```json
{
  "swapId": "bridge_mina_stark_456",
  "recipient": "0xash_starknet...",
  "amount": "100",
  "targetChain": "starknet",
  "targetSwapId": "stark_swap_789"
}
```

### **Step 2: zk-SNARK Proof Generation**
```bash
# Mina generates zero-knowledge proof (takes 1-2 minutes)
[MinaService] 🔄 Generating zk-SNARK proof for swap...
[MinaService] ✅ Proof generated and transaction sent
```

### **Step 3: Starknet Receives Proof**
```bash
# Starknet verifies the proof and mints tokens
POST /api/starknet/bridge/verify-proof
```

---

## 📊 **User Flow 5: Ash Monitors Everything**

### **Dashboard Overview**
```bash
# Ash checks his complete portfolio
GET /api/wallet/ash/balance
```

**Response:**
```json
{
  "success": true,
  "data": {
    "zcash": {
      "balance": { "total": "3.5" },
      "features": ["shielded_transactions", "zashi_integration"]
    },
    "near": {
      "balance": { "total": "100.0" },
      "features": ["smart_contracts", "low_fees"]
    },
    "starknet": {
      "balance": { "total": "500.0" },
      "features": ["zk_rollup", "cairo_contracts"]
    },
    "mina": {
      "balance": { "total": "50.0" },
      "features": ["zk_snarks", "constant_size"]
    }
  }
}
```

### **Transaction History**
```bash
# Ash reviews all his transactions
GET /api/wallet/ash/history
```

**Response shows:**
- Cross-chain swaps
- P2P transfers
- Escrow transactions
- Bridge operations

---

## 🔧 **Technical Features Ash Enjoys**

### **🔐 Privacy Features**
- **Zcash shielded transactions** hide amounts and addresses
- **Zashi mobile wallet** for easy private payments
- **Cross-chain privacy** preservation

### **⚡ Performance Features**
- **NEAR fast finality** (1-2 seconds)
- **Starknet low fees** via ZK-rollup
- **Mina constant-size** blockchain

### **🛡️ Security Features**
- **Atomic swaps** prevent loss of funds
- **Time-locked escrows** with dispute resolution
- **zk-SNARK proofs** for privacy and verification

### **📱 User Experience**
- **Mobile-first** with Zashi integration
- **QR code payments** for easy mobile use
- **Multi-wallet support** (Zashi, Auro, ArgentX, etc.)

---

## 🎯 **Why Ash Loves Ciphra.Pay**

1. **🔒 Privacy First**: Shielded transactions across all chains
2. **📱 Mobile Native**: Zashi integration for seamless mobile payments
3. **🌉 Cross-Chain**: Swap between any supported blockchain
4. **⚡ Fast & Cheap**: Optimized for speed and low fees
5. **🛡️ Secure**: Atomic swaps and escrow services
6. **🎨 Simple UX**: Complex crypto made simple

---

## 🚀 **API Endpoints Summary**

### **Wallet Management**
- `GET /api/wallet/{userId}/addresses` - Get all addresses
- `GET /api/wallet/{userId}/{chain}` - Get chain-specific wallet
- `GET /api/wallet/{userId}/balance` - Get aggregated balance

### **Zcash + Zashi**
- `POST /api/zcash/payment-instructions` - Generate QR codes
- `GET /api/zcash/balance/{address}` - Check ZEC balance
- `GET /api/zcash/network-info` - Network information

### **Cross-Chain Swaps**
- `POST /api/swap/zcash/create` - Create Zcash swap
- `POST /api/swap/{swapId}/complete` - Complete with secret
- `GET /api/swap/pairs/supported` - Supported pairs

### **P2P Transfers**
- `POST /api/p2p/zcash/create` - Create Zcash P2P
- `GET /api/p2p/user/{userId}/history` - Transfer history
- `POST /api/p2p/{transferId}/complete` - Complete transfer

### **NEAR Operations**
- `POST /api/near/swap/initiate` - NEAR atomic swap
- `POST /api/near/p2p/direct` - Direct P2P transfer
- `POST /api/near/escrow/create` - Create escrow

### **Starknet Operations**
- `POST /api/starknet/swap/initiate` - Starknet swap
- `POST /api/starknet/p2p/direct` - Direct transfer
- `POST /api/starknet/escrow/create` - Create escrow

### **Mina Operations**
- `POST /api/mina/swap/initiate` - Mina zk-swap
- `POST /api/mina/proof/submit` - Submit zk-proof
- `GET /api/mina/zkapp/{address}` - zkApp state

---

## 🎉 **Conclusion**

Ash can now:
- ✅ **Swap tokens** between Zcash, NEAR, Starknet, and Mina
- ✅ **Send private P2P payments** using Zashi mobile wallet
- ✅ **Use escrow services** for secure transactions
- ✅ **Bridge assets** across chains with zk-proofs
- ✅ **Monitor everything** from a unified dashboard

**Ciphra.Pay makes complex multi-chain operations simple and private!** 🚀
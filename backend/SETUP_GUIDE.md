# Ciphra.Pay Backend Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
```bash
# Copy and edit environment file
cp .env.example .env

# Required Zcash configuration:
ZCASH_NETWORK=testnet
ZCASH_LIGHTWALLETD_URL=https://lightwalletd.testnet.electriccoin.co:9067
ZCASH_FACILITATOR_ADDRESS=ztestsapling1...
ZCASH_FACILITATOR_PRIVATE_KEY=...
```

### 3. Test Setup
```bash
node test-startup.js
```

### 4. Start Development Server
```bash
npm run start:dev
```

## 📡 Key API Endpoints

### Zcash + Zashi Integration
- `POST /zcash/payment-instructions` - Create QR code for Zashi
- `GET /zcash/balance/{address}` - Check ZEC balance

### Multi-Chain Wallet
- `GET /wallet/{userId}/addresses` - Get all chain addresses
- `GET /wallet/{userId}/balance` - Aggregated balance

### Atomic Swaps
- `POST /swap/zcash/create` - Create Zcash swap
- `GET /swap/{swapId}` - Check swap status

### P2P Transfers
- `POST /p2p/zcash/create` - Create Zcash P2P transfer
- `POST /p2p/{transferId}/complete` - Complete transfer

## 🔗 Zashi Integration

### QR Code Format
```
zcash:address?amount=X&memo=Y
```

### Deep Link Format
```
zashi://pay?address=X&amount=Y&memo=Z
```

## 📚 Documentation

- `ZCASH_INTEGRATION_API.md` - Complete API documentation
- `ZCASH_IMPLEMENTATION_SUMMARY.md` - Technical details

## 🧪 Testing

1. Get testnet ZEC from faucet
2. Create payment instructions via API
3. Scan QR code with Zashi testnet
4. Verify payment detection
5. Test swap/P2P flows

## ✅ Implementation Status

- ✅ Zcash service with lightwalletd integration
- ✅ Zashi wallet QR codes and deep links
- ✅ Multi-chain wallet management
- ✅ P2P transfers (custodial)
- ✅ Atomic swaps with Zcash
- ✅ Complete API endpoints

Ready for testing and deployment! 🎉
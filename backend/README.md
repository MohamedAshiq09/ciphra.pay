# Ciphra.Pay Backend - Multi-Chain Privacy Payment Infrastructure

## 🎯 Overview

The Ciphra.:

- **Zcash** (with Zashi mobile wallet integration)
- **NEAR Protocol** (smart contracts and low fees)
- **Starknet** (ZK-rollup technology)


## 🏗️ Architecture

```
┌────────────────────────────────────────────
│
├────────┤
02   │
└──────────────┘

│                   Service 

│ WalletService│ SwapService │ P2PService  │ZcashS│
└──────────────────────────────────────┘
┌────────────────────────────────────────────────────┐
│                 Blockchain Integration   │
──┤
│lightwalletd  │ ontracts│
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
ded)
- Zcash lightwalletd endpoint
- Facilin

### Installation

1. **Clone and install dependencies:**
```bash
cd backend
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```


```bash
node test-startup.js
```

4. **Start the development server:**
``bash
npm run start:dev
```



## ⚙️ Configuration

### Environment Variables

bash
# Z
K=testnet
ZCASH_LIGHTWALLETD_URL=https67
..
ZCASH_FACILITATOR_PRIVATE.

# NEAR Configuration
NEAR_NETWORK=testnet
ear.org
NEAR_SWAP_CONTRACt
NEAR_P2P_CONTRACT_ID=dev-p2p.testnet
NEAR_ESCROW_CONTRACT_ID=dev-esct

# Starknet Configuration
STARKNET_NETWORK=starknet-sepolia
STARKNET_RPC_URL=https://rpc.nethermind.io/sepolia-juno/
STARKNET_ATOMIC_SWAP_ADDRESS=0x...

figuration
MINA_NETWORK=devnet
MINA_RPC_URL=ql
MINA_SWAP_CON.

# Server Configuration
PORT=3000
NODE_ENV=development
```

#tup

rations:

1. **Generate Zcash shielded address:**
ess
   - Export the private key securely
ions

2. **Set up other chain wallets:**
   - NEAR: Create testnet account
   - Starkract
   -

## 📡 API Endpoints

### Multi-Chain Wallet Management

```http
GET    /wallet/{userId}/addreses
GET let info
GET   ce
POST   /wallet/{userId}/payment-request     # Create payment rest
```

### Zcash Operations (Zashi Integratio

```http
GET    /zcash/address/{userId}              # Get user's ZEess
POST   /zcash/payment-instructions          # Create ZasQR
GET    /zcash/balance/{address}             # Get ZEC balance
POST   /zcash/send                          # Send ZEC (ftator)


### Atomic Swaps

```http
ap
POST   /swap/zcash/create            p
GET    /swap/{swapId}                       # Get swap status
POST   /swap/{swapId}/complete              # Completcret
POST   /swap/{swapId}/refund                #
```

### P2P Transfers

http
POST   /p2p/create                   er
POST   /p2p/zcash/create                    # Cresh P2P
GET    /p2p/{transferId}                    # Get transfer status
POST   /p2p/{transferId}/complete           # Complete transfer
```

## 🔗 Zashi Wallet Integion

### QR Code Format
```
zcash:<address>?amount=<amount>&memo=<memo>
```

### Deep Link Format
```
zashi://pay?a
```

### Integration Flow

1. **Backend** generates payment instructions wicode
2. **Frontend** displays QR code and "Pay with n
k
4. **Zashi** open
5. **User** confirms payment in Zashi
6. **Backend** detects payment via lightwalletd monitoring
7. **System** processes the confirmed payment

## 🔒 Security Fs

### Facilitator Model
ent
- Multi-signature supplanned)
- Balance monitoring and alerts
- Transaction confirmation requirements

ion
- Uing
ents
- Double-spend prot


### API Security
- Input validation on all endpoints
- Rate limiting (configurable)
e
- X402 payment protocol sut

## 🧪 Testing

### Manual Testing Flow

1. **Set up testnet environment:**
```sh
# Get testnet funds
# Zcash: Use testnet faucet
# NEAR: Use testnet faucet
cet
# Mina: Use d faucet
```

2. **Test Zashi integration:**
```h
# Create payment instructions
curl -X POST http://localhost:3000/zcash/payment-instruc\
  -H "Content-Type: application/json" \
yment"}'

# Scan QR code with Zashi testnet
# Verify payment detection
```

*
```bash
# CreatAR swap
curl -X POST http://localhost:3000/swap/zcash/create \
  -H "Content-Type: application/json" \
  -d '{
    "initiator":"user1",
    "recipient":"user2",
    "direction":"zcash_to_other",
   
:"1.0",
   
  }'
```

### Uni
```bash
npm run test
```

ng
```bash
npm run test:e2e
```

## 📊 Monitoring

cks
```http
GET /health                    # Basic hek
GET /bridge/health            # Bridgeatus

```

### Logging
- Structured logging wit
- Request/response logging
- Error tracking and alerting


### Metrics
- Transaction vhain
aps/P2P
- Rest
- Balancering

yment

### Development
```bash
npm
```

n
```bash

npmrod
```

### Docker (Optional)
```bash
docke .
docker run -p 3000:3000 --env-file .env ciphra-pay-ackend
```

### Environment-Specific Configuration

**Tes*
- All chains on testnet/devnet
- Public RPC endpoints
- Testnet facilitator wallets

**Mai*
- Mainnet chain configurations
- Private/dedicated RPC endpo
- Secure key management (HSM/KMS)
- Load balancing and redundancy

## 🔧

### Common Issues

**1. lightwalletd Connection Failed**
```bash
# Check network 
curl us

# Verify environment variable
echo $ZCASH_LIGHTWALLETD_URL
```

**2. Payment Not Detected**
```bash
# Check facilitator address lance
curl http://localhost:3000/zcas

# Ver
# Check transaction confirmations
```

**3. ed**
```bash
# Verify all chain s
# Check facilitatorlances
# Review error logs for ss
```

### Debug Mode
```bash
NODE_ENV=developmv
```

## 📚 Documenn


- *n
tails

p

rent)
- ✅ Multi-chain wallet managet
- ✅ Zcash ation
- ✅ Atomic swaps (basic)
- ✅ P2P transfers (custodial)

### Phase 2 (Next)
- [ ] istence

- [ ] Comprehensive test suite
- [ ] Perfns

### Phase 3 (Future)
- [ ] 

- [ ] Mobile SDK
- [ ] Dece

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new fu
5. Subquest

## 📄 License

This project is licensed under the MIT.

## 🆘 Support

For support and quetions:
- Checion above
tation
- Open an issue n GitHub


---

**Bnts**ivacy paymen prhais-cof crosuture  for the fwith ❤️uilt 
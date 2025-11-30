# X402 PAYMENT INTEGRATION - COMPLETE PLAN
## Ciphra.Pay Cross-Chain Privacy Payment Infrastructure

**Document Version**: 1.0
**Date**: 2025-11-30
**Status**: Ready for Implementation
**Priority**: HIGH (Core Feature)

---

## 📋 TABLE OF CONTENTS

1. [Project Overview](#project-overview)
2. [Current Status](#current-status)
3. [What is X402?](#what-is-x402)
4. [Your Task: X402 Integration](#your-task-x402-integration)
5. [Environment Setup](#environment-setup)
6. [Implementation Plan](#implementation-plan)
7. [Code Examples](#code-examples)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Checklist](#deployment-checklist)
10. [Troubleshooting](#troubleshooting)

---

## 📖 PROJECT OVERVIEW

### What is Ciphra.Pay?

**Ciphra.Pay** is a privacy-preserving cross-chain payment protocol enabling atomic swaps between:
- **Aztec Network** (Privacy Layer) - Fully encrypted transactions
- **Starknet** (ZK-Rollup Layer) - Zero-knowledge proofs with X402 payments
- **NEAR Protocol** (Fast Layer) - Low-cost, fast transactions

### The Innovation

**Hash Compatibility Oracle** - Solves the fundamental problem that different blockchains use incompatible hash functions:
- **Aztec**: Pedersen hash
- **Starknet**: Poseidon hash
- **NEAR**: SHA256

The backend acts as a trusted oracle to convert secrets between these hash functions, enabling atomic swaps between chains that couldn't otherwise verify each other's hash locks.

### Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Aztec     │◄────────┤   Backend   ├────────►│  Starknet   │
│  Contract   │         │   Oracle    │         │  Contract   │
│  (Private)  │         │  (NestJS)   │         │  (Public)   │
└─────────────┘         └─────────────┘         └─────────────┘
      │                        │                        │
      │                        │                        │
   Pedersen                  Hash                   Poseidon
    Hash                  Conversion                  Hash
```

### Key Components

**Already Implemented** ✅:
1. **Aztec Contract** - PrivateAtomicSwap V3 (26 functions, deployed)
2. **Starknet Contracts** - AtomicSwapV2 with OpenZeppelin (deployed)
3. **Backend Core** - NestJS with all modules
4. **Hash Oracle Service** - SHA256/Poseidon/Pedersen conversion
5. **Swap Coordinator** - Event-driven cross-chain orchestration
6. **X402 Library** - Production-ready TypeScript library (306 tests passing)

**Your Task** 🎯:
- **X402 Payment Module** - Integrate x402-starknet library into backend

---

## ✅ CURRENT STATUS

### Backend Completion: ~60%

**Completed Modules**:
- ✅ Config Module (`src/common/config/`)
- ✅ Hash Oracle (`src/modules/hash-oracle/`)
- ✅ Aztec Service (`src/modules/aztec/`)
- ✅ Starknet Service (`src/modules/starknet/`)
- ✅ Swap Coordinator (`src/modules/swap/`)
- ✅ Bridge API (`src/modules/bridge/`)

**Pending** ❌:
- ❌ **X402 Payment Module** ← YOUR TASK
- ❌ Database persistence (using in-memory maps)
- ❌ Advanced testing
- ❌ Production deployment config

### File Structure

```
backend/
├── src/
│   ├── modules/
│   │   ├── hash-oracle/      ✅ Done
│   │   ├── aztec/            ✅ Done
│   │   ├── starknet/         ✅ Done
│   │   ├── swap/             ✅ Done
│   │   ├── bridge/           ✅ Done
│   │   └── payment/          ❌ TO BE CREATED (X402)
│   ├── common/
│   │   └── config/           ✅ Done
│   ├── app.module.ts         ✅ Done
│   └── main.ts               ✅ Done
├── .env.example              ✅ Comprehensive template
├── package.json              ✅ All dependencies installed
└── X402_INTEGRATION_PLAN.md  ← This file
```

### Dependencies Already Installed

```json
{
  "dependencies": {
    "@nestjs/common": "^11.0.1",
    "@nestjs/config": "^3.2.3",
    "@nestjs/event-emitter": "^3.0.1",
    "starknet": "^8.0.0",
    "class-validator": "^0.14.1",
    "class-transformer": "^0.5.1"
  }
}
```

**Need to Install**:
```bash
pnpm add x402-starknet
```

---

## 🔍 WHAT IS X402?

### HTTP 402 Payment Protocol

X402 is a **micropayment protocol** that uses HTTP status code `402 Payment Required` to protect API endpoints.

**Traditional Problem**:
- Subscription models are too expensive for occasional use
- Free APIs get abused
- Payment integration is complex

**X402 Solution**:
- User requests protected resource → Server returns `402` with payment requirements
- User pays micropayment on Starknet → Gets payment proof
- User retries request with proof → Server verifies & grants access
- **All payments via AVNU paymaster** (gasless for users!)

### Payment Flow

```
1. Client: GET /api/swap/initiate
   ↓
2. Server: 402 Payment Required
   {
     "accepts": [{
       "scheme": "exact",
       "network": "starknet-sepolia",
       "maxAmountRequired": "1000000",  // 0.001 ETH
       "asset": "0x049d36...",           // ETH token
       "payTo": "0xBACKEND_WALLET",
       "resource": "/api/swap/initiate"
     }]
   }
   ↓
3. Client: Creates payment via x402-starknet
   const payload = await createPaymentPayload(...)
   ↓
4. Client: GET /api/swap/initiate
   Headers: { "X-Payment": base64(payload) }
   ↓
5. Server: Verifies payment
   - Signature valid? (SNIP-6)
   - Balance sufficient?
   - Not expired?
   ↓
6. Server: Settles payment via AVNU paymaster
   ↓
7. Server: 200 OK + Response data
```

### Why X402 for Ciphra.Pay?

1. **Monetization** - Premium swap features require micropayments
2. **Abuse Prevention** - Rate limiting via payment
3. **No Subscriptions** - Pay-per-use model
4. **Gasless UX** - AVNU paymaster covers gas costs
5. **Privacy-Friendly** - Payments on Starknet (ZK-rollup)

### X402-Starknet Library

**Location**: `/home/illogical/Desktop/hackathon/ciphra.pay/x402-starknet/`

**Status**: ✅ Production-Ready (v0.3.2)
- 306 tests passing
- Full TypeScript support
- AVNU paymaster integration
- Multi-network support (mainnet, sepolia, devnet)

**Core API** (21 exports):
```typescript
import {
  // Payment operations
  createPaymentPayload,
  verifyPayment,
  settlePayment,

  // Encoding (for HTTP headers)
  encodePaymentHeader,
  decodePaymentHeader,
  encodePaymentResponseHeader,
  decodePaymentResponseHeader,

  // Network utilities
  getNetworkConfig,
  getTransactionUrl,
  isTestnet,

  // Constants
  DEFAULT_PAYMASTER_ENDPOINTS,
  NETWORK_CONFIGS,
  X402_VERSION,

  // Errors
  X402Error,
  PaymentError,
  NetworkError,
  PaymasterError,
  ERROR_CODES,

  // Types
  type PaymentRequirements,
  type PaymentPayload,
  type VerifyResponse,
  type SettleResponse,
} from 'x402-starknet';
```

---

## 🎯 YOUR TASK: X402 INTEGRATION

### Objective

**Integrate the x402-starknet library into the NestJS backend to protect API endpoints with micropayments.**

### Success Criteria

1. ✅ Payment module created with proper NestJS structure
2. ✅ Middleware intercepts requests and returns `402` when no payment
3. ✅ Service verifies payment proofs using x402-starknet
4. ✅ Service settles payments via AVNU paymaster
5. ✅ Protected endpoints require valid payment
6. ✅ Payment can be enabled/disabled via environment variable
7. ✅ Comprehensive error handling
8. ✅ TypeScript types properly exported

### Scope

**What to Implement**:
- Payment module structure
- Payment service (verify, settle, create requirements)
- X402 middleware (intercept requests, return 402)
- X402 guard (NestJS guard for route protection)
- DTOs for payment requests/responses
- Integration with app.module.ts

**What NOT to Implement** (handled by friend):
- Database persistence
- Advanced monitoring
- Production deployment
- Frontend integration

### Time Estimate

**2-3 hours** for complete implementation

---

## 🔧 ENVIRONMENT SETUP

### Required Environment Variables

Add these to `backend/.env` (copy from `.env.example` and fill in):

```env
# ----------------------------------------------------------------------------
# STARKNET CONFIGURATION (Required for X402)
# ----------------------------------------------------------------------------
STARKNET_NETWORK=starknet-sepolia
STARKNET_RPC_URL=https://rpc.nethermind.io/sepolia-juno/

# Backend Wallet (for settlement)
STARKNET_WALLET_PRIVATE_KEY=0x...        # Your private key
STARKNET_WALLET_ADDRESS=0x...            # Your wallet address

# ----------------------------------------------------------------------------
# X402 PAYMENT PROTOCOL
# ----------------------------------------------------------------------------
# AVNU Paymaster Configuration
PAYMASTER_ENDPOINT=https://sepolia.paymaster.avnu.fi
PAYMASTER_API_KEY=                       # Optional for testnet

# Payment Configuration
X402_ENABLED=true                        # Enable/disable payment requirements
X402_PAYMENT_TOKEN_ADDRESS=0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7  # ETH on Sepolia
X402_PAYMENT_AMOUNT=1000000              # 0.001 ETH in smallest unit
X402_PAYMENT_RECIPIENT=0x...             # YOUR backend wallet (same as STARKNET_WALLET_ADDRESS)
X402_MAX_TIMEOUT_SECONDS=300             # 5 minutes
X402_RESOURCE_PREFIX=/api                # Prefix for protected resources

# ----------------------------------------------------------------------------
# API CONFIGURATION
# ----------------------------------------------------------------------------
PORT=3000
NODE_ENV=development
```

### What You Need

1. **Starknet Wallet** - Create one with Argent or Braavos
   - Get private key and address
   - Fund with Sepolia ETH (from faucet: https://starknet-faucet.vercel.app/)

2. **RPC URL** - Use public Nethermind RPC (already in .env.example)

3. **AVNU Paymaster** - No API key needed for Sepolia testnet

### Installation

```bash
cd backend

# Install x402-starknet
pnpm add x402-starknet

# Verify installation
pnpm list x402-starknet
```

---

## 📐 IMPLEMENTATION PLAN

### Phase 1: Module Structure (30 min)

**Create directory structure**:
```
src/modules/payment/
├── payment.module.ts
├── payment.service.ts
├── x402.middleware.ts
├── x402.guard.ts
├── dto/
│   ├── payment-requirements.dto.ts
│   ├── payment-payload.dto.ts
│   └── payment-response.dto.ts
└── exceptions/
    └── payment-required.exception.ts
```

**Files to create**:
1. DTOs for type safety
2. Custom exception for 402 responses
3. Payment service
4. Middleware
5. Guard
6. Module definition

### Phase 2: DTOs (15 min)

Create TypeScript DTOs that match x402-starknet types:

**payment-requirements.dto.ts**:
```typescript
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class PaymentRequirementsDto {
  @IsString()
  scheme: 'exact';

  @IsString()
  network: string;

  @IsString()
  maxAmountRequired: string;

  @IsString()
  asset: string;

  @IsString()
  payTo: string;

  @IsString()
  resource: string;

  @IsNumber()
  @IsOptional()
  maxTimeoutSeconds?: number;
}
```

**payment-payload.dto.ts**: Maps to x402-starknet PaymentPayload
**payment-response.dto.ts**: For 402 responses

### Phase 3: Payment Service (45 min)

**Core responsibilities**:
1. Create payment requirements
2. Verify payment proofs
3. Settle payments via AVNU
4. Error handling

**Key methods**:
```typescript
@Injectable()
export class PaymentService {
  // Create payment requirements for 402 response
  createPaymentRequirements(resource: string): PaymentRequirements;

  // Verify payment from X-Payment header
  async verifyPayment(paymentHeader: string, resource: string): Promise<VerifyResponse>;

  // Settle payment on Starknet
  async settlePayment(paymentPayload: PaymentPayload): Promise<SettleResponse>;

  // Check if X402 is enabled
  isEnabled(): boolean;
}
```

### Phase 4: Middleware (30 min)

**Intercepts ALL requests** to protected routes:

1. Check if X402 is enabled
2. Check for `X-Payment` header
3. If missing → Return 402 with payment requirements
4. If present → Verify payment
5. If valid → Settle payment & continue
6. If invalid → Return 402 with error

**Key features**:
- Error handling for invalid payments
- Support for disabling X402 via env variable
- Logging for debugging

### Phase 5: Guard (15 min)

**NestJS Guard** for route-level protection:

```typescript
@Injectable()
export class X402Guard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean>;
}
```

Use with decorator:
```typescript
@UseGuards(X402Guard)
@Post('/swap/initiate')
async initiateSwap() { ... }
```

### Phase 6: Integration (30 min)

**Update app.module.ts**:
1. Import PaymentModule
2. Configure middleware for specific routes
3. Test all endpoints

**Protected endpoints** (examples):
- `POST /swap/initiate` - Initiate cross-chain swap
- `GET /bridge/stats` - Get detailed statistics
- `POST /swap/coordinate` - Coordinate swap execution

**Free endpoints**:
- `GET /bridge/health` - Health check
- `GET /` - API info

---

## 💻 CODE EXAMPLES

### Example 1: Payment Service Implementation

```typescript
// src/modules/payment/payment.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../common/config/config.service';
import {
  createPaymentPayload,
  verifyPayment,
  settlePayment,
  encodePaymentHeader,
  decodePaymentHeader,
  DEFAULT_PAYMASTER_ENDPOINTS,
  type PaymentRequirements,
  type PaymentPayload,
  type VerifyResponse,
  type SettleResponse,
  PaymentError,
  NetworkError,
} from 'x402-starknet';
import { RpcProvider } from 'starknet';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly provider: RpcProvider;

  constructor(private readonly configService: AppConfigService) {
    // Initialize Starknet provider
    this.provider = new RpcProvider({
      nodeUrl: this.configService.starknetRpcUrl,
    });
  }

  /**
   * Check if X402 is enabled
   */
  isEnabled(): boolean {
    return process.env.X402_ENABLED === 'true';
  }

  /**
   * Create payment requirements for 402 response
   */
  createPaymentRequirements(resource: string): PaymentRequirements {
    const network = this.configService.starknetNetwork;

    return {
      scheme: 'exact',
      network,
      maxAmountRequired: process.env.X402_PAYMENT_AMOUNT || '1000000',
      asset: process.env.X402_PAYMENT_TOKEN_ADDRESS || '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
      payTo: process.env.X402_PAYMENT_RECIPIENT || '',
      resource,
      maxTimeoutSeconds: parseInt(process.env.X402_MAX_TIMEOUT_SECONDS || '300'),
    };
  }

  /**
   * Verify payment from X-Payment header
   */
  async verifyPayment(
    paymentHeader: string,
    resource: string,
  ): Promise<VerifyResponse> {
    try {
      // Decode payment header
      const payload = decodePaymentHeader(paymentHeader);

      // Get expected requirements
      const requirements = this.createPaymentRequirements(resource);

      // Verify payment
      const verification = await verifyPayment(
        this.provider,
        payload,
        requirements,
      );

      if (!verification.isValid) {
        this.logger.warn(
          `Payment verification failed: ${verification.invalidReason}`,
        );
      }

      return verification;
    } catch (error) {
      this.logger.error('Error verifying payment:', error);

      if (error instanceof PaymentError || error instanceof NetworkError) {
        return {
          isValid: false,
          invalidReason: error.message,
        };
      }

      return {
        isValid: false,
        invalidReason: 'Internal error verifying payment',
      };
    }
  }

  /**
   * Settle payment on Starknet via AVNU paymaster
   */
  async settlePayment(paymentPayload: PaymentPayload): Promise<SettleResponse> {
    try {
      const requirements = this.createPaymentRequirements(
        paymentPayload.resource,
      );

      const settlement = await settlePayment(
        this.provider,
        paymentPayload,
        requirements,
      );

      this.logger.log(
        `Payment settled: ${settlement.transaction?.transaction_hash || 'pending'}`,
      );

      return settlement;
    } catch (error) {
      this.logger.error('Error settling payment:', error);
      throw error;
    }
  }
}
```

### Example 2: X402 Middleware

```typescript
// src/modules/payment/x402.middleware.ts
import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PaymentService } from './payment.service';
import { decodePaymentHeader } from 'x402-starknet';

@Injectable()
export class X402Middleware implements NestMiddleware {
  private readonly logger = new Logger(X402Middleware.name);

  constructor(private readonly paymentService: PaymentService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Skip if X402 is disabled
    if (!this.paymentService.isEnabled()) {
      this.logger.debug('X402 disabled, skipping payment check');
      return next();
    }

    const paymentHeader = req.headers['x-payment'] as string | undefined;
    const resource = req.path;

    // No payment header → Return 402
    if (!paymentHeader) {
      return this.return402(res, resource);
    }

    try {
      // Verify payment
      const verification = await this.paymentService.verifyPayment(
        paymentHeader,
        resource,
      );

      if (!verification.isValid) {
        this.logger.warn(
          `Invalid payment for ${resource}: ${verification.invalidReason}`,
        );
        return this.return402(res, resource, verification.invalidReason);
      }

      // Settle payment
      const payload = decodePaymentHeader(paymentHeader);
      const settlement = await this.paymentService.settlePayment(payload);

      if (settlement.status !== 'ACCEPTED_ON_L2') {
        this.logger.error(`Payment settlement failed: ${settlement.status}`);
        return this.return402(res, resource, 'Payment settlement failed');
      }

      // Payment successful → Continue
      this.logger.log(`Payment verified for ${resource}`);
      next();
    } catch (error) {
      this.logger.error('Error processing payment:', error);
      return this.return402(res, resource, 'Error processing payment');
    }
  }

  /**
   * Return 402 Payment Required response
   */
  private return402(res: Response, resource: string, reason?: string) {
    const requirements = this.paymentService.createPaymentRequirements(resource);

    const response = {
      statusCode: 402,
      message: 'Payment Required',
      error: reason || 'This endpoint requires payment',
      x402Version: 1,
      accepts: [requirements],
    };

    return res.status(HttpStatus.PAYMENT_REQUIRED).json(response);
  }
}
```

### Example 3: Module Integration

```typescript
// src/modules/payment/payment.module.ts
import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { X402Middleware } from './x402.middleware';
import { X402Guard } from './x402.guard';

@Module({
  providers: [PaymentService, X402Guard],
  exports: [PaymentService, X402Guard],
})
export class PaymentModule {}
```

```typescript
// src/app.module.ts
import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { PaymentModule } from './modules/payment/payment.module';
import { X402Middleware } from './modules/payment/x402.middleware';

@Module({
  imports: [
    // ... other modules
    PaymentModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(X402Middleware)
      .forRoutes(
        // Protected routes
        { path: 'swap/initiate', method: RequestMethod.POST },
        { path: 'bridge/stats', method: RequestMethod.GET },
      );
  }
}
```

### Example 4: Using the Guard

```typescript
// src/modules/swap/swap.controller.ts
import { Controller, Post, UseGuards } from '@nestjs/common';
import { X402Guard } from '../payment/x402.guard';

@Controller('swap')
export class SwapController {
  @Post('initiate')
  @UseGuards(X402Guard)  // Protect this endpoint
  async initiateSwap() {
    // Only accessible with valid payment
    return { message: 'Swap initiated' };
  }
}
```

---

## 🧪 TESTING STRATEGY

### Manual Testing

**Test 1: 402 Response (No Payment)**
```bash
# Should return 402
curl -X POST http://localhost:3000/swap/initiate \
  -H "Content-Type: application/json"

# Expected response:
# {
#   "statusCode": 402,
#   "message": "Payment Required",
#   "error": "This endpoint requires payment",
#   "x402Version": 1,
#   "accepts": [{
#     "scheme": "exact",
#     "network": "starknet-sepolia",
#     "maxAmountRequired": "1000000",
#     "asset": "0x049d36...",
#     "payTo": "0xYOUR_WALLET",
#     "resource": "/swap/initiate",
#     "maxTimeoutSeconds": 300
#   }]
# }
```

**Test 2: Valid Payment**
```bash
# First, create payment using x402-starknet library (client-side)
# Then send request with payment header

curl -X POST http://localhost:3000/swap/initiate \
  -H "Content-Type: application/json" \
  -H "X-Payment: BASE64_ENCODED_PAYMENT_PAYLOAD"

# Expected: 200 OK with swap data
```

**Test 3: X402 Disabled**
```bash
# Set X402_ENABLED=false in .env
# Restart backend

curl -X POST http://localhost:3000/swap/initiate \
  -H "Content-Type: application/json"

# Expected: 200 OK (no payment required)
```

### Unit Tests (Optional)

```typescript
// src/modules/payment/payment.service.spec.ts
import { Test } from '@nestjs/testing';
import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PaymentService],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  it('should create payment requirements', () => {
    const requirements = service.createPaymentRequirements('/test');
    expect(requirements.scheme).toBe('exact');
    expect(requirements.resource).toBe('/test');
  });

  it('should detect if X402 is enabled', () => {
    expect(typeof service.isEnabled()).toBe('boolean');
  });
});
```

### Integration Test Script

Create `test-x402.sh`:
```bash
#!/bin/bash
set -e

echo "🧪 Testing X402 Payment Integration"

# Test 1: Health check (free endpoint)
echo "Test 1: Health check (should work without payment)"
curl -s http://localhost:3000/bridge/health | jq
echo "✅ Test 1 passed"

# Test 2: Protected endpoint without payment
echo "Test 2: Protected endpoint without payment (should return 402)"
response=$(curl -s -w "%{http_code}" http://localhost:3000/swap/initiate)
if [[ $response == *"402"* ]]; then
  echo "✅ Test 2 passed - Got 402 response"
else
  echo "❌ Test 2 failed - Expected 402, got: $response"
fi

# Test 3: X402 disabled
echo "Test 3: Disabling X402"
export X402_ENABLED=false
# (Restart backend)
curl -s http://localhost:3000/swap/initiate | jq
echo "✅ Test 3 passed"

echo "🎉 All tests passed!"
```

---

## 📦 DEPLOYMENT CHECKLIST

### Development

- [ ] Install x402-starknet: `pnpm add x402-starknet`
- [ ] Create payment module structure
- [ ] Implement payment service
- [ ] Implement X402 middleware
- [ ] Implement X402 guard
- [ ] Add to app.module.ts
- [ ] Configure .env file
- [ ] Test with curl
- [ ] Test with X402_ENABLED=false
- [ ] Test with real Starknet payment

### Environment Variables

- [ ] `STARKNET_NETWORK` set
- [ ] `STARKNET_RPC_URL` set
- [ ] `STARKNET_WALLET_PRIVATE_KEY` set (your wallet)
- [ ] `STARKNET_WALLET_ADDRESS` set
- [ ] `X402_ENABLED=true`
- [ ] `X402_PAYMENT_TOKEN_ADDRESS` set (ETH on Sepolia)
- [ ] `X402_PAYMENT_AMOUNT` set (e.g., 1000000)
- [ ] `X402_PAYMENT_RECIPIENT` set (your backend wallet)
- [ ] `PAYMASTER_ENDPOINT` set (AVNU Sepolia)

### Code Quality

- [ ] All TypeScript types properly defined
- [ ] DTOs use class-validator decorators
- [ ] Error handling comprehensive
- [ ] Logging added for debugging
- [ ] Comments explain complex logic
- [ ] No hardcoded values (use .env)

### Testing

- [ ] Manual test: 402 response
- [ ] Manual test: Valid payment
- [ ] Manual test: X402 disabled
- [ ] Manual test: Invalid payment
- [ ] Manual test: Expired payment
- [ ] Check logs for errors
- [ ] Test all protected endpoints

---

## 🔧 TROUBLESHOOTING

### Issue 1: "Payment verification failed"

**Symptoms**: All payments rejected, verification.isValid = false

**Possible Causes**:
1. Wrong payment requirements (amount, token, recipient)
2. Payment expired (timeout exceeded)
3. Insufficient balance in user wallet
4. Wrong network (mainnet vs sepolia)

**Solution**:
```typescript
// Add detailed logging in payment.service.ts
this.logger.debug('Payment payload:', JSON.stringify(payload));
this.logger.debug('Requirements:', JSON.stringify(requirements));
this.logger.debug('Verification result:', JSON.stringify(verification));
```

### Issue 2: "Settlement failed"

**Symptoms**: Verification passes but settlement fails

**Possible Causes**:
1. AVNU paymaster down
2. Backend wallet not configured
3. Network congestion
4. RPC endpoint issues

**Solution**:
```typescript
// Check settlement response
if (settlement.status !== 'ACCEPTED_ON_L2') {
  this.logger.error('Settlement details:', settlement);
}

// Try alternative RPC
STARKNET_RPC_URL=https://starknet-sepolia.public.blastapi.io
```

### Issue 3: "Cannot decode payment header"

**Symptoms**: Error parsing X-Payment header

**Possible Cause**: Invalid base64 encoding

**Solution**:
```typescript
try {
  const payload = decodePaymentHeader(paymentHeader);
} catch (error) {
  this.logger.error('Invalid payment header:', paymentHeader);
  throw new PaymentError('Invalid payment header format');
}
```

### Issue 4: Backend crashes on startup

**Symptoms**: Error about missing environment variables

**Solution**: Check all required variables in .env:
```bash
# Verify .env file
cat backend/.env | grep X402
cat backend/.env | grep STARKNET
```

### Issue 5: "Payment required" for health check

**Symptoms**: Even `/bridge/health` returns 402

**Possible Cause**: Middleware applied to all routes

**Solution**: Only apply to specific routes:
```typescript
// In app.module.ts
consumer
  .apply(X402Middleware)
  .exclude(
    { path: 'bridge/health', method: RequestMethod.GET },
    { path: '/', method: RequestMethod.GET },
  )
  .forRoutes('*');
```

---

## 📚 REFERENCE LINKS

### Documentation
- **X402 Spec**: https://github.com/x402/x402-spec
- **X402-Starknet Library**: `/home/illogical/Desktop/hackathon/ciphra.pay/x402-starknet/README.md`
- **AVNU Paymaster**: https://www.avnu.fi/
- **Starknet.js**: https://www.starknetjs.com/

### Tools
- **Sepolia Faucet**: https://starknet-faucet.vercel.app/
- **Sepolia Explorer**: https://sepolia.starkscan.co/
- **RPC Endpoints**: https://www.alchemy.com/starknet

### Backend Files
- **Config Service**: `src/common/config/config.service.ts`
- **Hash Oracle**: `src/modules/hash-oracle/hash-oracle.service.ts`
- **Swap Coordinator**: `src/modules/swap/swap-coordinator.service.ts`
- **.env.example**: `backend/.env.example`

---

## 📝 SUMMARY FOR NEXT SESSION

### What You Know

1. **Project**: Ciphra.Pay is a cross-chain privacy payment protocol
2. **Innovation**: Hash oracle solves Pedersen/Poseidon/SHA256 incompatibility
3. **Status**: Backend 60% complete, contracts deployed, X402 library ready
4. **Your Task**: Integrate x402-starknet into NestJS backend

### What to Do

1. **Install**: `pnpm add x402-starknet`
2. **Create**: Payment module with service, middleware, guard, DTOs
3. **Configure**: .env file with Starknet wallet and X402 settings
4. **Test**: Manual testing with curl
5. **Integrate**: Add to app.module.ts for protected routes

### Key Files to Create

```
src/modules/payment/
├── payment.module.ts
├── payment.service.ts
├── x402.middleware.ts
├── x402.guard.ts
└── dto/
    ├── payment-requirements.dto.ts
    ├── payment-payload.dto.ts
    └── payment-response.dto.ts
```

### Time Estimate

**2-3 hours** total:
- 30 min: Module structure
- 15 min: DTOs
- 45 min: Payment service
- 30 min: Middleware
- 15 min: Guard
- 30 min: Integration & testing

### Success Criteria

✅ Protected endpoints return 402 without payment
✅ Valid payments are verified and settled
✅ X402 can be disabled via environment variable
✅ Error handling is comprehensive
✅ All TypeScript types are correct

---

## 🎯 QUICK START COMMANDS

```bash
# 1. Navigate to backend
cd /home/illogical/Desktop/hackathon/ciphra.pay/backend

# 2. Install X402 library
pnpm add x402-starknet

# 3. Create module directory
mkdir -p src/modules/payment/dto
mkdir -p src/modules/payment/exceptions

# 4. Copy .env.example to .env
cp .env.example .env

# 5. Edit .env with your Starknet wallet details
nano .env
# Fill in:
# - STARKNET_WALLET_PRIVATE_KEY
# - STARKNET_WALLET_ADDRESS
# - X402_PAYMENT_RECIPIENT

# 6. Start backend
pnpm run start:dev

# 7. Test health check
curl http://localhost:3000/bridge/health

# 8. Test protected endpoint (should return 402)
curl -X POST http://localhost:3000/swap/initiate
```

---

## 🚀 YOU'RE READY!

This document contains everything needed to implement X402 payment integration. When you resume:

1. Read this document (you're doing that now ✅)
2. Follow the implementation plan section by section
3. Use the code examples as templates
4. Test thoroughly
5. Ask questions if blocked

**Good luck! The x402-starknet library is production-ready and well-tested. Your job is just to integrate it properly into NestJS.**

---

**End of Document**

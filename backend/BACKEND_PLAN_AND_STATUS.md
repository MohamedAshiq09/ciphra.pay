# 📊 Ciphra.Pay Backend: Status & Roadmap

## 🛑 Current Status: 60% Complete

The backend core is built and functional, but requires configuration to run.

### ✅ Completed Modules (Ready for Demo)
| Module | Status | Description |
|--------|--------|-------------|
| **Config Module** | ✅ Done | Environment variable management & validation |
| **Hash Oracle** | ✅ Done | SHA256, Poseidon, Pedersen cross-chain conversion |
| **Aztec Service** | ✅ Done | PXE connection, contract monitoring, event emission |
| **Starknet Service** | ✅ Done | RPC connection, event listening structure |
| **Swap Coordinator** | ✅ Done | **"The Brain"** - Orchestrates cross-chain swaps via events |
| **Bridge API** | ✅ Done | REST endpoints for health, stats, and status |

### ⏳ Pending / In-Progress
| Module | Status | Priority |
|--------|--------|----------|
| **X402 Payment** | ❌ Not Started | High (Unique Value Prop) |
| **Database** | ❌ Not Started | Medium (Using in-memory for hackathon) |
| **Production Deploy** | ❌ Not Started | Low (Local dev is fine for demo) |

### 🚨 Immediate Blocker
*   **Missing `.env` file**: The backend crashes on startup because `AZTEC_CONTRACT_ADDRESS` is not defined.

---

## 🗺️ Roadmap

### Phase 1: Immediate Fixes (30 mins)
1.  **Create `.env` file**: Populate with Aztec and Starknet contract addresses.
2.  **Restart Backend**: Ensure it starts without errors.
3.  **Test Endpoints**: Verify `/bridge/health` and `/swap` are responding.

### Phase 2: Hackathon Features (2-3 Hours)
1.  **Implement X402 Payment Structure**: Create the module and middleware (even if mocked).
2.  **Integrate Middleware**: Protect specific routes (e.g., `/swap` initiation).
3.  **End-to-End Test**: Simulate a full swap flow with payment.

### Phase 3: Production (Post-Hackathon)
1.  **Database Integration**: Replace in-memory maps with PostgreSQL/TypeORM.
2.  **Security**: Rate limiting, API keys.
3.  **Monitoring**: Prometheus metrics, Sentry logging.

---

## 💳 X402 Payment Module Structure

Here is the recommended file structure to integrate the X402 payment protocol into the existing NestJS backend.

**Directory:** `backend/src/modules/payment/`

```text
src/
└── modules/
    └── payment/
        ├── dto/
        │   └── payment.dto.ts       # Data Transfer Objects for payment requests/verification
        ├── payment.module.ts        # NestJS Module definition
        ├── payment.service.ts       # Logic for interacting with X402 SDK (verify, create request)
        └── x402.middleware.ts       # Middleware to intercept requests and check 402 status
```

### File Details

#### 1. `payment.module.ts`
Registers the service and exports it for use in other modules (like `AppModule`).

#### 2. `payment.service.ts`
*   **Dependencies**: `x402-starknet` SDK.
*   **Methods**:
    *   `createPaymentRequest(amount)`: Generates a payment request for the user.
    *   `verifyPayment(proof)`: Validates the payment proof submitted by the user.

#### 3. `x402.middleware.ts`
*   **Role**: Intercepts HTTP requests to protected routes.
*   **Logic**:
    *   Checks for `X-Payment-Proof` header.
    *   If missing: Returns `402 Payment Required` with details from `payment.service.createPaymentRequest`.
    *   If present: Calls `payment.service.verifyPayment`. If valid, passes request to controller; otherwise throws `403 Forbidden`.

#### 4. `dto/payment.dto.ts`
*   Defines the structure of the payment proof and request bodies to ensure type safety.

---

## 📝 Next Steps for You

1.  **Copy `.env.example` to `.env`** and fill in your contract addresses.
2.  **Run `pnpm run start:dev`** to confirm the backend starts.
3.  **Scaffold the Payment Module** using the structure above.

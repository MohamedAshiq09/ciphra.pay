# 🔧 Manual Starknet Contract Interaction Guide

## 🎯 What You Need to Do in ArgentX

The test script gave you these details:
- **Contract**: `0x11309470c5e1b3cfa615303b7710ea8d4069894c54963087e5ebcdc7af82104`
- **Function**: `initiate_swap`
- **Hash Lock**: `7346e394325b87a903e06c9f7dcdc02632397affcacb8fe14db0dfcc4430c95c`

## 📱 Step-by-Step ArgentX Instructions

### 1. **Open ArgentX Wallet**
- Make sure you're on **Starknet Sepolia Testnet**
- Check you have some ETH for gas fees

### 2. **Go to Contract Interaction**
- In ArgentX, look for "Contract" or "DApp" section
- Or use Starknet explorer: https://sepolia.starkscan.co/

### 3. **Enter Contract Details**
```
Contract Address: 0x11309470c5e1b3cfa615303b7710ea8d4069894c54963087e5ebcdc7af82104
Function: initiate_swap
```

### 4. **Function Parameters**
You need to call `initiate_swap` with these parameters:
```
- swap_id: "swap_1764743057063_znwam2" (from your test)
- recipient: 0x04bAEAE1872c93c283C9E660364FAb37B22A5BA5276d176DAF363d5B1d91E78c
- hash_lock: 0x7346e394325b87a903e06c9f7dcdc02632397affcacb8fe14db0dfcc4430c95c
- time_lock: 86400 (24 hours in seconds)
- amount: 100000000000000000 (0.1 ETH in wei)
- token_address: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7 (ETH)
- target_chain: "mina"
- target_swap_id: "mina_1764743057063"
```

## 🚀 **EASIER OPTION: Use the Real Test Script**

Instead of manual interaction, run this:
```bash
node test-scripts/real-starknet-to-mina.js
```

This script will:
- ✅ Create the swap for you
- ✅ Call the contract automatically
- ✅ Handle all the complex parameters
- ✅ Show you the results

## 🔧 **Why No Approval in ArgentX?**

The test script was just **simulating** the flow - it wasn't actually calling your wallet. To see real approvals:

1. **Use the real test**: `node test-scripts/real-starknet-to-mina.js`
2. **Or manually interact** with the contract using the parameters above
3. **Or use Starknet explorer** to call the contract directly

## 💡 **For Production Use**

In a real app, you would:
1. Connect your ArgentX wallet to the frontend
2. Frontend calls the backend API to create swap
3. Frontend shows you the contract call parameters
4. You approve the transaction in ArgentX
5. Backend detects the transaction and completes the swap

## 🎯 **Next Steps**

Try the real test script:
```bash
node test-scripts/real-starknet-to-mina.js
```

This will show you how the full flow works without needing manual wallet interaction!
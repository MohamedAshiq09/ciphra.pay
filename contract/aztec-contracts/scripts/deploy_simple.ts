/**
 * Simple deploy script for PrivateAtomicSwap on Aztec Sandbox
 */
import { createPXEClient, waitForPXE, Fr } from "@aztec/aztec.js";
import { getInitialTestAccountsWallets } from "@aztec/accounts/testing";
import { PrivateAtomicSwapContract } from "../src/artifacts/PrivateAtomicSwap.js";

async function main() {
    console.log("🚀 Deploying PrivateAtomicSwap contract to Aztec Sandbox...\n");

    // Connect to PXE
    const pxeUrl = process.env.PXE_URL || "http://localhost:8080";
    console.log(`📡 Connecting to PXE at ${pxeUrl}...`);
    
    const pxe = createPXEClient(pxeUrl);
    await waitForPXE(pxe);
    console.log("✅ Connected to PXE\n");

    // Get node info
    const nodeInfo = await pxe.getNodeInfo();
    console.log(`📊 Node Version: ${nodeInfo.nodeVersion}`);
    console.log(`📊 L1 Chain ID: ${nodeInfo.l1ChainId}`);
    console.log();

    // Get test accounts
    console.log("👤 Getting test wallets...");
    const wallets = await getInitialTestAccountsWallets(pxe);
    
    if (wallets.length === 0) {
        throw new Error("No test wallets found! Make sure sandbox is running.");
    }
    
    const wallet = wallets[0];
    console.log(`✅ Using wallet: ${wallet.getAddress().toString()}`);
    console.log();

    // Deploy contract
    const owner = wallet.getAddress();
    const feeRecipient = wallet.getAddress();
    const initialFeePercentage = 30; // 0.3%

    console.log("📝 Deployment Parameters:");
    console.log(`   Owner: ${owner.toString()}`);
    console.log(`   Fee Recipient: ${feeRecipient.toString()}`);
    console.log(`   Fee: ${initialFeePercentage} basis points (0.3%)`);
    console.log();

    console.log("⏳ Deploying contract (this may take a few minutes with proving)...");
    
    try {
        const contract = await PrivateAtomicSwapContract.deploy(
            wallet,
            owner,
            feeRecipient,
            initialFeePercentage
        )
        .send()
        .deployed();

        console.log();
        console.log("✅ Contract deployed successfully!");
        console.log(`📍 Contract Address: ${contract.address.toString()}`);
        console.log();

        // Verify
        console.log("🔍 Verifying deployment...");
        const feePercentage = await contract.methods.get_fee_percentage().simulate();
        console.log(`   Fee Percentage: ${feePercentage} basis points`);
        console.log();

        console.log("🎉 Deployment Complete!");
        console.log();
        console.log("📋 Update your backend .env with:");
        console.log(`   AZTEC_CONTRACT_ADDRESS=${contract.address.toString()}`);

        return contract.address.toString();
    } catch (error: any) {
        console.error("❌ Deployment failed:", error.message);
        throw error;
    }
}

main()
    .then((address) => {
        console.log("\n✅ Done! Contract address:", address);
        process.exit(0);
    })
    .catch((err) => {
        console.error("\n❌ Error:", err);
        process.exit(1);
    });

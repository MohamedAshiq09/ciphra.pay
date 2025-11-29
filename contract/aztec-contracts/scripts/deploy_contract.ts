import { getInitialTestAccountsWallets } from "@aztec/accounts/testing";
import { createPXEService } from "@aztec/pxe/server";
import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { getPXEServiceConfig } from "@aztec/pxe/config";
import { PrivateAtomicSwapContract } from "../src/artifacts/PrivateAtomicSwap.js";
import type { AztecAddress, PXE, AztecNode } from "@aztec/aztec.js";
import type { AccountWallet } from "@aztec/aztec.js/wallet";

/**
 * Deploy PrivateAtomicSwap V3 contract to Aztec
 * Works with both sandbox and testnet (set PXE_URL env var)
 */
async function main(): Promise<string> {
    console.log("🚀 Deploying PrivateAtomicSwap V3 contract...\n");

    try {
        // Connect to Aztec Node
        const nodeUrl: string = process.env.PXE_URL || "http://localhost:8080";
        console.log(`📡 Connecting to Aztec Node at ${nodeUrl}...`);

        const node: AztecNode = createAztecNodeClient(nodeUrl);

        // Create PXE
        console.log("⚙️  Setting up PXE...");
        const config = getPXEServiceConfig();
        const pxe: PXE = await createPXEService(node, config);

        console.log("✅ Connected to PXE\n");

        // Get test account (pre-funded with Fee Juice on sandbox)
        console.log("👤 Getting test account...");
        const wallets: AccountWallet[] = await getInitialTestAccountsWallets(pxe);
        const wallet: AccountWallet = wallets[0];

        console.log("✅ Using account:", wallet.getAddress().toString());
        console.log();

        // Contract constructor parameters
        const owner: AztecAddress = wallet.getAddress();
        const feeRecipient: AztecAddress = wallet.getAddress();
        const initialFeePercentage: number = 30; // 0.3% (30 basis points)

        console.log("📝 Deployment Parameters:");
        console.log("   Owner:", owner.toString());
        console.log("   Fee Recipient:", feeRecipient.toString());
        console.log("   Initial Fee:", initialFeePercentage, "basis points (0.3%)");
        console.log();

        // Deploy contract
        console.log("⏳ Deploying PrivateAtomicSwap V3...");
        console.log("   (This may take a few minutes with proving...)");

        const contract = await PrivateAtomicSwapContract.deploy(
            wallet,
            owner,
            feeRecipient,
            initialFeePercentage
        )
        .send({ from: wallet.getAddress() })
        .deployed();

        console.log();
        console.log("✅ Contract deployed successfully!");
        console.log("📍 Contract Address:", contract.address.toString());
        console.log();

        // Verify deployment
        console.log("🔍 Verifying deployment...");
        const feePercentage = await contract.methods.get_fee_percentage().simulate();
        const totalSwaps = await contract.methods.get_total_swaps().simulate();

        console.log("   Fee Percentage:", feePercentage.toString(), "basis points");
        console.log("   Total Swaps:", totalSwaps.toString());
        console.log();

        console.log("🎉 Deployment Complete!");
        console.log();
        console.log("📋 Next Steps:");
        console.log("   1. Save contract address:", contract.address.toString());
        console.log("   2. Update your backend with this address");
        console.log("   3. Test with initiate_private_swap");
        console.log();

        return contract.address.toString();
    } catch (error: any) {
        console.error("❌ Deployment failed:", error.message);
        if (error.stack) {
            console.error("\nStack trace:", error.stack);
        }
        throw error;
    }
}

main()
    .then((address: string) => {
        console.log("✅ Success! Contract at:", address);
        process.exit(0);
    })
    .catch((error: Error) => {
        console.error("❌ Error:", error.message);
        process.exit(1);
    });

import { createPXEClient, waitForPXE } from "@aztec/aztec.js";
import { PrivateAtomicSwapContract } from "../src/artifacts/PrivateAtomicSwap.js";
import { AztecAddress } from "@aztec/aztec.js";

/**
 * Deploy PrivateAtomicSwap contract to Aztec Testnet
 * Uses the wallet account created via aztec-wallet CLI
 */
async function main() {
    console.log("🚀 Deploying PrivateAtomicSwap to Aztec Testnet...\n");

    try {
        // Connect to testnet PXE (local wallet)
        const pxeUrl = "http://localhost:8080"; // Your local PXE with testnet account
        console.log(`📡 Connecting to local PXE at ${pxeUrl}...`);
        const pxe = createPXEClient(pxeUrl);
        await waitForPXE(pxe);
        console.log("✅ Connected to PXE\n");

        // Your testnet account address from the CLI output
        const deployerAddress = AztecAddress.fromString(
            "0x254cea0ca9879c7738830349b86f74ad274bd89eae89a12382d7f35eb6afe1ab"
        );

        console.log("👤 Deployer address:", deployerAddress.toString());
        console.log("   (Using account created via aztec-wallet CLI)\n");

        // Get the registered account from PXE
        const accounts = await pxe.getRegisteredAccounts();
        console.log(`📋 Found ${accounts.length} registered accounts`);
        
        const deployerAccount = accounts.find(acc => 
            acc.address.toString() === deployerAddress.toString()
        );

        if (!deployerAccount) {
            throw new Error("Deployer account not found in PXE. Make sure you ran 'aztec-wallet create-account'");
        }

        console.log("✅ Found deployer account\n");

        // Contract parameters
        const owner = deployerAddress;

        console.log("📝 Contract Parameters:");
        console.log("   Owner:", owner.toString());
        console.log("   Network: Aztec Testnet");
        console.log("   Contract: PrivateAtomicSwap\n");

        // Note: Deployment on testnet requires a wallet instance
        // You'll need to use aztec-wallet CLI for deployment or implement wallet loading
        console.log("⚠️  For testnet deployment, use aztec-wallet CLI:");
        console.log("\n📝 Deployment Steps:");
        console.log("1. Compile contract: yarn compile");
        console.log("2. Generate artifacts: yarn codegen");
        console.log("3. Deploy via CLI:");
        console.log("\n   aztec-wallet deploy \\");
        console.log("     --node-url https://aztec-testnet-fullnode.zkv.xyz \\");
        console.log("     --from my-wallet \\");
        console.log("     --alias atomic-swap \\");
        console.log("     target/aztec_contracts-PrivateAtomicSwap.json \\");
        console.log("     --args <OWNER_ADDRESS>\n");
        
        console.log("💡 Replace <OWNER_ADDRESS> with:", owner.toString());
        console.log("\n🔗 After deployment, save the contract address for your backend!\n");

    } catch (error) {
        console.error("❌ Error:", error);
        throw error;
    }
}

main()
    .then(() => {
        console.log("✅ Instructions displayed");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Error:", error.message);
        process.exit(1);
    });

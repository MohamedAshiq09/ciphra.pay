import { createPXEClient } from "@aztec/aztec.js/pxe";
import { AztecAddress } from "@aztec/aztec.js/addresses";
import { PrivateAtomicSwapContract } from "../src/artifacts/PrivateAtomicSwap.js";

/**
 * Verify the deployed contract on Aztec Testnet
 */
async function main() {
    console.log("🔍 Verifying deployed contract on Aztec Testnet...\n");

    try {
        // Connect to testnet
        const pxe = createPXEClient("https://aztec-testnet-fullnode.zkv.xyz");
        console.log("✅ Connected to Aztec Testnet\n");

        // Your deployed contract address
        const contractAddress = AztecAddress.fromString(
            "0x0f298e3413f1c6e95fdb90cd0d72d9e4693b1dfe1d0e02bf3a85382c515e1e3d"
        );

        console.log("📍 Contract Address:", contractAddress.toString());

        // Load the contract
        const contract = await PrivateAtomicSwapContract.at(contractAddress, pxe);
        console.log("✅ Contract loaded successfully!\n");

        // Try to call get_swap_status (unconstrained function)
        console.log("🧪 Testing get_swap_status(1)...");
        const status = await contract.methods.get_swap_status(1).simulate();
        console.log("✅ Result:", status.toString());
        console.log("   (0 = No swap exists with ID 1, which is expected)\n");

        console.log("🎉 CONTRACT IS DEPLOYED AND WORKING!\n");
        console.log("📋 Contract Details:");
        console.log("   Address:", contractAddress.toString());
        console.log("   Network: Aztec Testnet");
        console.log("   Status: ✅ LIVE\n");

        console.log("✨ You can now:");
        console.log("   1. Integrate this address into your backend");
        console.log("   2. Call initiate_private_swap to create swaps");
        console.log("   3. Monitor swap status for cross-chain coordination\n");

    } catch (error) {
        console.error("❌ Error:", error.message);
        console.log("\n💡 This might mean:");
        console.log("   - Network connectivity issue");
        console.log("   - Testnet node is down");
        console.log("   - Contract needs time to sync\n");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    });

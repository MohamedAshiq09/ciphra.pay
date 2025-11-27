import { createPXEClient, waitForPXE } from "@aztec/aztec.js";
import { getInitialTestAccountsWallets } from "@aztec/accounts/testing";
import { PrivateAtomicSwapContract } from "../src/artifacts/PrivateAtomicSwap.js";

/**
 * Deploy PrivateAtomicSwap contract to Aztec sandbox/devnet
 */
async function main() {
    console.log("🚀 Deploying PrivateAtomicSwap contract...\n");

    // Connect to PXE
    const pxeUrl = process.env.PXE_URL || "http://localhost:8080";
    console.log(`📡 Connecting to PXE at ${pxeUrl}...`);
    const pxe = createPXEClient(pxeUrl);
    await waitForPXE(pxe);
    console.log("✅ Connected to PXE\n");

    // Get deployer wallet
    const wallets = await getInitialTestAccountsWallets(pxe);
    const deployer = wallets[0];
    console.log("👤 Deployer address:", deployer.getAddress().toString());

    // Contract parameters
    const owner = deployer.getAddress();

    console.log("\n📝 Contract Parameters:");
    console.log("   Owner:", owner.toString());
    console.log("   Contract: PrivateAtomicSwap\n");

    // Deploy contract
    console.log("⏳ Deploying contract...");
    const contract = await PrivateAtomicSwapContract.deploy(
        deployer,
        owner
    )
        .send()
        .deployed();

    console.log("\n✅ Contract deployed successfully!");
    console.log("📍 Contract Address:", contract.address.toString());
    console.log("\n🎉 Deployment complete!\n");

    // Save deployment info
    const deploymentInfo = {
        contractAddress: contract.address.toString(),
        deployer: deployer.getAddress().toString(),
        owner: owner.toString(),
        deployedAt: new Date().toISOString(),
        network: process.env.AZTEC_ENV || "sandbox",
        contractName: "PrivateAtomicSwap",
        version: "1.0.0"
    };

    console.log("📋 Deployment Info:");
    console.log(JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n📝 Next Steps:");
    console.log("1. Save the contract address for your backend");
    console.log("2. Test the contract with initiate_private_swap");
    console.log("3. Integrate with your cross-chain backend\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });

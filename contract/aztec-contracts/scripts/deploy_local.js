import { createPXEClient, waitForPXE } from "@aztec/aztec.js";
import { getInitialTestAccountsWallets } from "@aztec/accounts/testing";
import { PrivateAtomicSwapContract } from "../src/artifacts/PrivateAtomicSwap.js";

async function main() {
    console.log("🚀 Deploying to LOCAL sandbox...\n");

    const pxe = createPXEClient("http://localhost:8080");
    await waitForPXE(pxe);
    console.log("✅ Connected to local sandbox\n");

    const wallets = await getInitialTestAccountsWallets(pxe);
    const deployer = wallets[0];
    console.log("👤 Deployer:", deployer.getAddress().toString());

    console.log("\n⏳ Deploying contract...");
    const contract = await PrivateAtomicSwapContract.deploy(
        deployer,
        deployer.getAddress()
    ).send().deployed();

    console.log("\n✅ DEPLOYED!");
    console.log("📍 Address:", contract.address.toString());

    // TEST IT
    console.log("\n🧪 Testing get_swap_status(1)...");
    const status = await contract.methods.get_swap_status(1).simulate();
    console.log("✅ Result:", status.toString(), "(0 = no swap, as expected)");

    console.log("\n🎉 CONTRACT WORKS!\n");
}

main().catch(console.error);

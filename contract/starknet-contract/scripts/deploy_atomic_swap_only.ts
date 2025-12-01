/**
 * Deploy only the fixed AtomicSwap contract
 * Run with: npx ts-node scripts/deploy_atomic_swap_only.ts
 */
import * as dotenv from "dotenv";
dotenv.config();

import { Account, RpcProvider, Contract, CallData, json } from "starknet";
import * as fs from "fs";
import * as path from "path";

// Configuration
const RPC_URL = "https://starknet-sepolia.g.alchemy.com/v2/TI9jXk5bEpPAnw6QwoziO";
const DEPLOYER_ADDRESS = "0x04bAEAE1872c93c283C9E660364FAb37B22A5BA5276d176DAF363d5B1d91E78c";
// Private key will be taken from env or prompted
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";

async function main() {
    console.log("\n========================================");
    console.log("  AtomicSwap Contract Deployment");
    console.log("========================================\n");

    if (!PRIVATE_KEY) {
        console.error("❌ Error: DEPLOYER_PRIVATE_KEY not set");
        console.log("Please run with: DEPLOYER_PRIVATE_KEY=your_key npx ts-node scripts/deploy_atomic_swap_only.ts");
        process.exit(1);
    }

    // Initialize provider
    console.log("🔌 Connecting to Starknet Sepolia...");
    const provider = new RpcProvider({ nodeUrl: RPC_URL });
    
    // Create account
    const account = new Account(provider, DEPLOYER_ADDRESS, PRIVATE_KEY);
    console.log(`📍 Deployer: ${DEPLOYER_ADDRESS}`);

    // Check balance
    try {
        const balance = await provider.getBalance(DEPLOYER_ADDRESS);
        console.log(`💰 Balance: ${BigInt(balance) / BigInt(10**18)} ETH`);
    } catch (e) {
        console.log("⚠️  Could not fetch balance");
    }

    // Read compiled contract
    console.log("\n📂 Loading compiled contract...");
    const contractPath = path.join(__dirname, "../target/dev/ciphra_pay_AtomicSwap.contract_class.json");
    const compiledContractPath = path.join(__dirname, "../target/dev/ciphra_pay_AtomicSwap.compiled_contract_class.json");
    
    if (!fs.existsSync(contractPath)) {
        console.error(`❌ Contract class not found at: ${contractPath}`);
        console.log("Make sure you ran 'scarb build' first!");
        process.exit(1);
    }

    const contractClass = JSON.parse(fs.readFileSync(contractPath, "utf-8"));
    
    let compiledContract = null;
    if (fs.existsSync(compiledContractPath)) {
        compiledContract = JSON.parse(fs.readFileSync(compiledContractPath, "utf-8"));
        console.log("✅ Found compiled contract class (CASM)");
    } else {
        console.log("⚠️  No compiled contract class found - declare might fail on some networks");
    }

    // Declare contract
    console.log("\n🚀 Declaring contract...");
    try {
        const declarePayload: any = {
            contract: contractClass,
        };
        
        if (compiledContract) {
            declarePayload.casm = compiledContract;
        }

        const declareResponse = await account.declare(declarePayload);
        console.log(`📝 Declaration TX: ${declareResponse.transaction_hash}`);
        console.log(`📋 Class Hash: ${declareResponse.class_hash}`);
        
        console.log("⏳ Waiting for declaration confirmation...");
        await provider.waitForTransaction(declareResponse.transaction_hash);
        console.log("✅ Contract declared successfully!");

        // Deploy contract
        console.log("\n🏗️  Deploying contract...");
        const deployResponse = await account.deployContract({
            classHash: declareResponse.class_hash,
            constructorCalldata: [], // AtomicSwap has no constructor args
        });
        
        console.log(`📝 Deploy TX: ${deployResponse.transaction_hash}`);
        console.log(`📍 Contract Address: ${deployResponse.contract_address}`);
        
        console.log("⏳ Waiting for deployment confirmation...");
        await provider.waitForTransaction(deployResponse.transaction_hash);
        console.log("✅ Contract deployed successfully!");

        // Update deployments.json
        console.log("\n💾 Updating deployments.json...");
        const deploymentsPath = path.join(__dirname, "../deployments.json");
        let deployments: any = { contracts: [] };
        
        if (fs.existsSync(deploymentsPath)) {
            deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
        }

        // Update or add AtomicSwap entry
        const atomicSwapIndex = deployments.contracts.findIndex((c: any) => c.contractName === "AtomicSwap");
        const newEntry = {
            contractName: "AtomicSwap",
            classHash: declareResponse.class_hash,
            contractAddress: deployResponse.contract_address,
            transactionHash: deployResponse.transaction_hash,
            deployedAt: new Date().toISOString(),
            version: "v1-fixed"
        };

        if (atomicSwapIndex >= 0) {
            deployments.contracts[atomicSwapIndex] = newEntry;
        } else {
            deployments.contracts.push(newEntry);
        }

        deployments.timestamp = new Date().toISOString();
        fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
        console.log("✅ deployments.json updated");

        // Summary
        console.log("\n========================================");
        console.log("  DEPLOYMENT COMPLETE! 🎉");
        console.log("========================================");
        console.log(`Contract Address: ${deployResponse.contract_address}`);
        console.log(`Class Hash: ${declareResponse.class_hash}`);
        console.log("\nNext steps:");
        console.log("1. Update backend .env with new STARKNET_SWAP_CONTRACT_ADDRESS");
        console.log("2. Copy new ABI to backend/src/contracts/AtomicSwap.json");
        console.log("3. Test the on-chain swap!");

    } catch (error: any) {
        if (error.message?.includes("already declared")) {
            console.log("⚠️  Contract already declared, deploying with existing class hash...");
            // Try to get the class hash from the error or use existing
            const existingDeployments = JSON.parse(fs.readFileSync(path.join(__dirname, "../deployments.json"), "utf-8"));
            const existingClassHash = existingDeployments.contracts.find((c: any) => c.contractName === "AtomicSwap")?.classHash;
            
            if (existingClassHash) {
                console.log(`Using existing class hash: ${existingClassHash}`);
                // Note: For a fixed contract, the class hash will be DIFFERENT
                // So this case likely won't help us
            }
        }
        console.error("❌ Deployment failed:", error.message || error);
        process.exit(1);
    }
}

main().catch(console.error);

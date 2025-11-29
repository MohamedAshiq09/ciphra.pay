import { Account, RpcProvider, hash } from "starknet";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

interface DeploymentResult {
    contractName: string;
    classHash: string;
    contractAddress: string;
    transactionHash: string;
}

class StarknetDeployer {
    private provider: RpcProvider;
    private account: Account;
    private deploymentResults: DeploymentResult[] = [];

    constructor() {
        // ---- PROVIDER ----
        this.provider = new RpcProvider({
            nodeUrl: process.env.STARKNET_RPC_URL!,
        });

        // ---- ACCOUNT ----
        const privateKey = process.env.DEPLOYER_PRIVATE_KEY!;
        const accountAddress = process.env.DEPLOYER_ADDRESS!;

        if (!privateKey || !accountAddress) {
            throw new Error("Please set DEPLOYER_PRIVATE_KEY and DEPLOYER_ADDRESS in .env");
        }

        // Starknet.js v8 → Object-based constructor
        this.account = new Account({
            provider: this.provider,
            address: accountAddress,
            signer: privateKey,
        });
    }

    // --------------------------------------------------
    // Read Scarb build output
    // --------------------------------------------------
    private readContract(contractName: string) {
        const base = `ciphra_pay_${contractName.toLowerCase()}`;

        const sierraPath = path.join(__dirname, `../target/dev/${base}.contract_class.json`);
        const casmPath = path.join(__dirname, `../target/dev/${base}.compiled_contract_class.json`);

        if (!fs.existsSync(sierraPath) || !fs.existsSync(casmPath)) {
            console.log(`❌ Contract files not found for "${contractName}"`);
            console.log("Looking in:", path.join(__dirname, "../target/dev"));
            throw new Error("Run: scarb build");
        }

        return {
            sierra: JSON.parse(fs.readFileSync(sierraPath, "utf8")),
            casm: JSON.parse(fs.readFileSync(casmPath, "utf8"))
        };
    }

    // --------------------------------------------------
    // Declare Contract
    // --------------------------------------------------
    private async declareContract(contractName: string) {
        console.log(`\n📌 Declaring ${contractName}...`);

        const { sierra, casm } = this.readContract(contractName);

        try {
            const declareResp = await this.account.declare({
                contract: sierra,
                casm: casm
            });

            console.log(`✅ Declared: ${contractName}`);
            console.log(`   Class Hash: ${declareResp.class_hash}`);
            console.log(`   Tx Hash:     ${declareResp.transaction_hash}`);

            await this.provider.waitForTransaction(declareResp.transaction_hash);

            return declareResp.class_hash;
        } catch (e: any) {
            if (e.message.includes("is already declared")) {
                console.log(`⚠️ Already declared: ${contractName}`);
                const classHash = hash.computeContractClassHash(sierra);
                console.log(`   Using class hash: ${classHash}`);
                return classHash;
            }
            throw e;
        }
    }

    // --------------------------------------------------
    // Deploy Contract
    // --------------------------------------------------
    private async deployContract(
        contractName: string,
        classHash: string,
        constructorCalldata: any[] = []
    ) {
        console.log(`\n🚀 Deploying ${contractName}...`);

        const deployResp = await this.account.deployContract({
            classHash,
            constructorCalldata
        });

        console.log(`✅ Deployed: ${contractName}`);
        console.log(`   Address: ${deployResp.contract_address}`);
        console.log(`   Tx Hash: ${deployResp.transaction_hash}`);

        await this.provider.waitForTransaction(deployResp.transaction_hash);

        this.deploymentResults.push({
            contractName,
            classHash,
            contractAddress: deployResp.contract_address,
            transactionHash: deployResp.transaction_hash
        });

        return deployResp.contract_address;
    }

    // --------------------------------------------------
    // Deploy all contracts
    // --------------------------------------------------
    async deployAll() {
        console.log("\n================================================");
        console.log("🚀 Starting Starknet Deployment");
        console.log("================================================");

        console.log("Deployer:", this.account.address);
        console.log("Network:", process.env.STARKNET_RPC_URL);
        console.log("================================================\n");

        // ------- AtomicSwap (Basic Version) -------
        const atomicHash = await this.declareContract("AtomicSwap");
        const atomicAddr = await this.deployContract("AtomicSwap", atomicHash, [
            this.account.address
        ]);

        // ------- AtomicSwapV2 (NEW ENHANCED VERSION) -------
        console.log("\n🎯 Deploying Enhanced AtomicSwapV2...");
        const atomicV2Hash = await this.declareContract("AtomicSwapV2");
        const atomicV2Addr = await this.deployContract("AtomicSwapV2", atomicV2Hash, [
            this.account.address,  // owner
            this.account.address   // fee_recipient (you can change this if needed)
        ]);

        // ------- Escrow -------
        const escrowHash = await this.declareContract("Escrow");
        const escrowAddr = await this.deployContract("Escrow", escrowHash, [
            this.account.address
        ]);

        // ------- BridgeConnector -------
        const bridgeHash = await this.declareContract("BridgeConnector");
        const bridgeAddr = await this.deployContract("BridgeConnector", bridgeHash, [
            this.account.address
        ]);

        // ------- P2PTransfer -------
        const p2pHash = await this.declareContract("P2PTransfer");
        const p2pAddr = await this.deployContract("P2PTransfer", p2pHash, [
            this.account.address
        ]);

        // Save output
        this.saveDeploymentResults();

        console.log("\n================================================");
        console.log("🎉 Deployment Complete!");
        console.log("================================================");
        console.log("AtomicSwap (Basic): ", atomicAddr);
        console.log("AtomicSwapV2 (NEW): ", atomicV2Addr);  // NEW!
        console.log("Escrow:             ", escrowAddr);
        console.log("Bridge Connector:   ", bridgeAddr);
        console.log("P2P Transfer:       ", p2pAddr);
        console.log("================================================");

        return {
            atomicSwap: atomicAddr,
            atomicSwapV2: atomicV2Addr,  // NEW!
            escrow: escrowAddr,
            bridgeConnector: bridgeAddr,
            p2pTransfer: p2pAddr
        };
    }

    // Save deployment output
    private saveDeploymentResults() {
        const out = path.join(__dirname, "../deployments.json");

        fs.writeFileSync(
            out,
            JSON.stringify({
                network: process.env.STARKNET_RPC_URL,
                deployer: this.account.address,
                timestamp: new Date().toISOString(),
                contracts: this.deploymentResults
            }, null, 2)
        );

        console.log(`\n💾 Saved to deployments.json`);
    }
}

// --------------------------------------------------
// MAIN EXECUTION
// --------------------------------------------------
async function main() {
    const deployer = new StarknetDeployer();
    await deployer.deployAll();
}

main().catch(err => {
    console.error("❌ Deployment failed:", err);
    process.exit(1);
});
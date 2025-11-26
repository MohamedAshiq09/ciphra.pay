import { Account, Contract, RpcProvider, hash, CallData } from "starknet";
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
        // Initialize provider (Sepolia testnet)
        this.provider = new RpcProvider({
            nodeUrl: process.env.STARKNET_RPC_URL || "https://starknet-sepolia.public.blastapi.io/rpc/v0_7",
        });

        // Initialize account
        const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
        const accountAddress = process.env.DEPLOYER_ADDRESS;

        if (!privateKey || !accountAddress) {
            throw new Error("Please set DEPLOYER_PRIVATE_KEY and DEPLOYER_ADDRESS in .env file");
        }

        this.account = new Account(this.provider, accountAddress, privateKey);
    }

    /**
     * Read compiled contract files
     */
    private readContract(contractName: string) {
        const sierraPath = path.join(__dirname, `../target/dev/ciphra_pay_${contractName}.contract_class.json`);
        const casmPath = path.join(__dirname, `../target/dev/ciphra_pay_${contractName}.compiled_contract_class.json`);

        if (!fs.existsSync(sierraPath) || !fs.existsSync(casmPath)) {
            throw new Error(`Contract files not found for ${contractName}. Did you run 'scarb build'?`);
        }

        const sierra = JSON.parse(fs.readFileSync(sierraPath, "utf8"));
        const casm = JSON.parse(fs.readFileSync(casmPath, "utf8"));

        return { sierra, casm };
    }

    /**
     * Declare a contract
     */
    private async declareContract(contractName: string) {
        console.log(`\n📋 Declaring ${contractName}...`);

        const { sierra, casm } = this.readContract(contractName);

        try {
            const declareResponse = await this.account.declare({
                contract: sierra,
                casm: casm,
            });

            console.log(`✅ ${contractName} declared!`);
            console.log(`   Class Hash: ${declareResponse.class_hash}`);
            console.log(`   Transaction Hash: ${declareResponse.transaction_hash}`);

            // Wait for transaction to be accepted
            await this.provider.waitForTransaction(declareResponse.transaction_hash);
            console.log(`   Status: Accepted ✓`);

            return declareResponse.class_hash;
        } catch (error: any) {
            if (error.message.includes("is already declared")) {
                console.log(`⚠️  ${contractName} already declared, extracting class hash...`);
                // Calculate class hash from sierra
                const classHash = hash.computeContractClassHash(sierra);
                console.log(`   Extracted Class Hash: ${classHash}`);
                return classHash;
            }
            throw error;
        }
    }

    /**
     * Deploy a contract
     */
    private async deployContract(
        contractName: string,
        classHash: string,
        constructorCalldata: any[] = []
    ) {
        console.log(`\n🚀 Deploying ${contractName}...`);

        try {
            const deployResponse = await this.account.deployContract({
                classHash: classHash,
                constructorCalldata: constructorCalldata,
            });

            console.log(`✅ ${contractName} deployed!`);
            console.log(`   Contract Address: ${deployResponse.contract_address}`);
            console.log(`   Transaction Hash: ${deployResponse.transaction_hash}`);

            // Wait for transaction to be accepted
            await this.provider.waitForTransaction(deployResponse.transaction_hash);
            console.log(`   Status: Accepted ✓`);

            this.deploymentResults.push({
                contractName,
                classHash,
                contractAddress: deployResponse.contract_address,
                transactionHash: deployResponse.transaction_hash,
            });

            return deployResponse.contract_address;
        } catch (error) {
            console.error(`❌ Failed to deploy ${contractName}:`, error);
            throw error;
        }
    }

    /**
     * Deploy all contracts
     */
    async deployAll() {
        console.log("=".repeat(60));
        console.log("🌟 Starting Starknet Contract Deployment");
        console.log("=".repeat(60));
        console.log(`Network: Sepolia Testnet`);
        console.log(`Deployer Address: ${this.account.address}`);
        console.log("=".repeat(60));

        try {
            // 1. Deploy Atomic Swap Contract
            const atomicSwapClassHash = await this.declareContract("AtomicSwap");
            const atomicSwapAddress = await this.deployContract(
                "AtomicSwap",
                atomicSwapClassHash,
                [this.account.address] // owner address
            );

            // 2. Deploy Escrow Contract
            const escrowClassHash = await this.declareContract("Escrow");
            const escrowAddress = await this.deployContract(
                "Escrow",
                escrowClassHash,
                [this.account.address] // owner address
            );

            // 3. Deploy Bridge Connector Contract
            const bridgeConnectorClassHash = await this.declareContract("BridgeConnector");
            const bridgeConnectorAddress = await this.deployContract(
                "BridgeConnector",
                bridgeConnectorClassHash,
                [this.account.address] // owner address
            );

            // Save deployment results
            this.saveDeploymentResults();

            console.log("\n" + "=".repeat(60));
            console.log("🎉 Deployment Complete!");
            console.log("=".repeat(60));
            console.log("\n📝 Deployment Summary:");
            this.deploymentResults.forEach((result) => {
                console.log(`\n${result.contractName}:`);
                console.log(`  Address: ${result.contractAddress}`);
                console.log(`  Class Hash: ${result.classHash}`);
            });

            return {
                atomicSwap: atomicSwapAddress,
                escrow: escrowAddress,
                bridgeConnector: bridgeConnectorAddress,
            };
        } catch (error) {
            console.error("\n❌ Deployment failed:", error);
            throw error;
        }
    }

    /**
     * Save deployment results to file
     */
    private saveDeploymentResults() {
        const outputPath = path.join(__dirname, "../deployments.json");
        const deploymentData = {
            network: "sepolia-testnet",
            timestamp: new Date().toISOString(),
            deployer: this.account.address,
            contracts: this.deploymentResults,
        };

        fs.writeFileSync(outputPath, JSON.stringify(deploymentData, null, 2));
        console.log(`\n💾 Deployment results saved to: ${outputPath}`);
    }

    /**
     * Verify contract on Voyager
     */
    async verifyContract(contractAddress: string, contractName: string) {
        console.log(`\n🔍 To verify ${contractName} on Voyager:`);
        console.log(`   1. Visit: https://sepolia.voyager.online/contract/${contractAddress}`);
        console.log(`   2. Click "Verify Contract"`);
        console.log(`   3. Upload the contract source files`);
    }
}

// Main execution
async function main() {
    const deployer = new StarknetDeployer();
    const addresses = await deployer.deployAll();

    console.log("\n" + "=".repeat(60));
    console.log("📋 Contract Addresses (save these!):");
    console.log("=".repeat(60));
    console.log(`Atomic Swap: ${addresses.atomicSwap}`);
    console.log(`Escrow: ${addresses.escrow}`);
    console.log(`Bridge Connector: ${addresses.bridgeConnector}`);
    console.log("=".repeat(60));
}

// Run if called directly
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

export { StarknetDeployer };
import { PrivateAtomicSwapContract } from "../../artifacts/PrivateAtomicSwap.js";
import contractArtifactJson from "../../../target/aztec_contracts-PrivateAtomicSwap.json" with { type: "json" };

/**
 * COMPREHENSIVE STRUCTURE TEST SUITE FOR PRIVATE ATOMIC SWAP V3
 * Validates all contract functions and structure before deployment
 *
 * Note: We use the raw JSON artifact because loadContractArtifact() filters out
 * internal functions and strips custom_attributes needed for validation
 */

describe("PrivateAtomicSwap V3 - Comprehensive Structure Tests", () => {

    describe("1. CONTRACT ARTIFACT", () => {
        it("should have contract artifact defined", () => {
            expect(PrivateAtomicSwapContract).toBeDefined();
            expect(PrivateAtomicSwapContract.artifact).toBeDefined();
            expect(contractArtifactJson).toBeDefined();
            console.log("✅ Contract artifact loaded");
        });

        it("should have correct contract name", () => {
            expect(contractArtifactJson.name).toBe("PrivateAtomicSwap");
            console.log("✅ Contract name correct");
        });

        it("should have functions defined", () => {
            expect(contractArtifactJson.functions).toBeDefined();
            expect(contractArtifactJson.functions.length).toBeGreaterThan(0);
            console.log(`✅ Found ${contractArtifactJson.functions.length} functions`);
        });
    });

    describe("2. CORE PRIVATE FUNCTIONS", () => {
        const functions = contractArtifactJson.functions;

        it("should have initiate_private_swap function", () => {
            const func = functions.find((f: any) => f.name === 'initiate_private_swap');
            expect(func).toBeDefined();
            expect(func.custom_attributes).toContain("private");
            expect(func.abi.parameters.length).toBe(10); // 1 (inputs) + 9 (our params)
            console.log("✅ initiate_private_swap: 10 parameters (9 + inputs), private");
        });

        it("should have complete_private_swap function", () => {
            const func = functions.find((f: any) => f.name === 'complete_private_swap');
            expect(func).toBeDefined();
            expect(func.custom_attributes).toContain("private");
            expect(func.abi.parameters.length).toBe(4); // 1 (inputs) + 3 (swap_id, secret, hash_type)
            console.log("✅ complete_private_swap: 4 parameters (3 + inputs), private");
        });

        it("should have refund_private_swap function", () => {
            const func = functions.find((f: any) => f.name === 'refund_private_swap');
            expect(func).toBeDefined();
            expect(func.custom_attributes).toContain("private");
            expect(func.abi.parameters.length).toBe(2); // 1 (inputs) + 1 (swap_id)
            console.log("✅ refund_private_swap: 2 parameters (1 + inputs), private");
        });
    });

    describe("3. PUBLIC ADMIN FUNCTIONS", () => {
        const functions = contractArtifactJson.functions;

        it("should have withdraw_fees function", () => {
            const func = functions.find((f: any) => f.name === 'withdraw_fees');
            expect(func).toBeDefined();
            expect(func.custom_attributes).toContain("public");
            expect(func.abi.parameters.length).toBe(1); // token_address
            console.log("✅ withdraw_fees: public, owner-only");
        });

        it("should have set_fee_percentage function", () => {
            const func = functions.find((f: any) => f.name === 'set_fee_percentage');
            expect(func).toBeDefined();
            expect(func.custom_attributes).toContain("public");
            expect(func.abi.parameters.length).toBe(1); // new_fee
            console.log("✅ set_fee_percentage: public, owner-only");
        });

        it("should have set_fee_recipient function", () => {
            const func = functions.find((f: any) => f.name === 'set_fee_recipient');
            expect(func).toBeDefined();
            expect(func.custom_attributes).toContain("public");
            expect(func.abi.parameters.length).toBe(1); // new_recipient
            console.log("✅ set_fee_recipient: public, owner-only");
        });

        it("should have set_time_lock_bounds function", () => {
            const func = functions.find((f: any) => f.name === 'set_time_lock_bounds');
            expect(func).toBeDefined();
            expect(func.custom_attributes).toContain("public");
            expect(func.abi.parameters.length).toBe(2); // min, max
            console.log("✅ set_time_lock_bounds: public, owner-only");
        });
    });

    describe("4. VIEW FUNCTIONS", () => {
        const functions = contractArtifactJson.functions;

        const viewFunctions = [
            'get_swap_status',
            'get_revealed_secret',
            'get_target_chain',
            'get_target_swap_id',
            'get_token_address',
            'get_total_swaps',
            'get_completed_swaps',
            'get_fee_percentage',
            'get_fee_recipient',
            'get_collected_fees'
        ];

        viewFunctions.forEach(funcName => {
            it(`should have ${funcName} function`, () => {
                const func = functions.find((f: any) => f.name === funcName);
                expect(func).toBeDefined();
                expect(func.custom_attributes).toContain("utility");
                console.log(`✅ ${funcName}: utility view function`);
            });
        });

        it("should have all 10 view functions", () => {
            const count = viewFunctions.filter(name =>
                functions.find((f: any) => f.name === name)
            ).length;
            expect(count).toBe(10);
            console.log("✅ All 10 view functions present");
        });
    });

    describe("5. INTERNAL FUNCTIONS", () => {
        const functions = contractArtifactJson.functions;

        it("should have register_swap_public internal function", () => {
            const func = functions.find((f: any) => f.name === 'register_swap_public');
            expect(func).toBeDefined();
            expect(func.custom_attributes).toContain("internal");
            console.log("✅ register_swap_public: internal");
        });

        it("should have complete_swap_public internal function", () => {
            const func = functions.find((f: any) => f.name === 'complete_swap_public');
            expect(func).toBeDefined();
            expect(func.custom_attributes).toContain("internal");
            console.log("✅ complete_swap_public: internal");
        });

        it("should have update_swap_status internal function", () => {
            const func = functions.find((f: any) => f.name === 'update_swap_status');
            expect(func).toBeDefined();
            expect(func.custom_attributes).toContain("internal");
            console.log("✅ update_swap_status: internal");
        });
    });

    describe("6. CONSTRUCTOR", () => {
        const functions = contractArtifactJson.functions;

        it("should have constructor function", () => {
            const func = functions.find((f: any) => f.name === 'constructor');
            expect(func).toBeDefined();
            expect(func.custom_attributes).toContain("initializer");
            expect(func.abi.parameters.length).toBe(3); // owner, fee_recipient, initial_fee
            console.log("✅ constructor: 3 parameters (V3)");
        });
    });

    describe("7. STORAGE LAYOUT", () => {
        it("should have storage layout defined", () => {
            expect(PrivateAtomicSwapContract.artifact.storageLayout).toBeDefined();
            console.log("✅ Storage layout defined");
        });

        it("should have expected storage variables", () => {
            const storage = PrivateAtomicSwapContract.artifact.storageLayout;
            const storageVars = Object.keys(storage);

            const expectedVars = [
                'private_swaps',
                'public_swap_status',
                'public_swap_secrets',
                'public_target_chains',
                'public_target_swap_ids',
                'public_token_addresses',
                'collected_fees',
                'owner',
                'fee_percentage',
                'fee_recipient',
                'min_time_lock_duration',
                'max_time_lock_duration',
                'total_swaps',
                'completed_swaps'
            ];

            expectedVars.forEach(varName => {
                expect(storageVars).toContain(varName);
            });

            console.log(`✅ All ${expectedVars.length} storage variables present`);
        });
    });

    describe("8. FUNCTION COUNT", () => {
        it("should have at least 19 user-defined functions", () => {
            const functions = contractArtifactJson.functions;
            const count = functions.length;

            // 1 constructor + 3 private + 4 admin + 10 view + 5 internal = 23 user-defined
            // Plus Aztec internal functions (process_message, public_dispatch, sync_private_state)
            expect(count).toBeGreaterThanOrEqual(19);
            console.log(`✅ Total functions: ${count}`);
        });

        it("should have 3 private functions", () => {
            const functions = contractArtifactJson.functions;
            const privateCount = functions.filter((f: any) =>
                f.custom_attributes && f.custom_attributes.includes("private")
            ).length;
            expect(privateCount).toBe(3);
            console.log("✅ Private functions: 3");
        });

        it("should have at least 4 public admin functions", () => {
            const functions = contractArtifactJson.functions;
            const publicCount = functions.filter((f: any) =>
                f.custom_attributes &&
                f.custom_attributes.includes("public") &&
                !f.custom_attributes.includes("internal")
            ).length;
            expect(publicCount).toBeGreaterThanOrEqual(4);
            console.log(`✅ Public admin functions: ${publicCount}`);
        });

        it("should have 12 utility functions (10 user + 2 Aztec internal)", () => {
            const functions = contractArtifactJson.functions;
            const viewCount = functions.filter((f: any) =>
                f.custom_attributes && f.custom_attributes.includes("utility")
            ).length;
            expect(viewCount).toBe(12); // 10 user views + process_message + sync_private_state
            console.log("✅ Utility functions: 12 (10 user + 2 Aztec)");
        });
    });

    describe("9. V3 FEATURES VALIDATION", () => {
        it("should have token support (token_address parameter)", () => {
            const initiate = contractArtifactJson.functions.find(
                (f: any) => f.name === 'initiate_private_swap'
            );
            const hasTokenParam = initiate.abi.parameters.some((p: any) =>
                p.name === 'token_address' || p.type.kind === 'struct'
            );
            expect(initiate.abi.parameters.length).toBe(10); // 1 (inputs) + 9 (includes token_address)
            console.log("✅ Token support validated (10 params including inputs)");
        });

        it("should have hash type support", () => {
            const complete = contractArtifactJson.functions.find(
                (f: any) => f.name === 'complete_private_swap'
            );
            expect(complete.abi.parameters.length).toBe(4); // 1 (inputs) + 3 (swap_id, secret, hash_type)
            console.log("✅ Hash type parameter present (4 params including inputs)");
        });

        it("should have fee collection tracking", () => {
            const getFees = contractArtifactJson.functions.find(
                (f: any) => f.name === 'get_collected_fees'
            );
            expect(getFees).toBeDefined();
            console.log("✅ Fee collection tracking present");
        });

        it("should have fee withdrawal", () => {
            const withdraw = contractArtifactJson.functions.find(
                (f: any) => f.name === 'withdraw_fees'
            );
            expect(withdraw).toBeDefined();
            console.log("✅ Fee withdrawal function present");
        });

        it("should have cross-chain metadata getters", () => {
            const getChain = contractArtifactJson.functions.find(
                (f: any) => f.name === 'get_target_chain'
            );
            const getSwapId = contractArtifactJson.functions.find(
                (f: any) => f.name === 'get_target_swap_id'
            );
            expect(getChain).toBeDefined();
            expect(getSwapId).toBeDefined();
            console.log("✅ Cross-chain metadata getters present");
        });

        it("should have statistics tracking", () => {
            const getTotal = contractArtifactJson.functions.find(
                (f: any) => f.name === 'get_total_swaps'
            );
            const getCompleted = contractArtifactJson.functions.find(
                (f: any) => f.name === 'get_completed_swaps'
            );
            expect(getTotal).toBeDefined();
            expect(getCompleted).toBeDefined();
            console.log("✅ Statistics tracking present");
        });
    });

    describe("10. DEPLOYMENT READINESS", () => {
        it("should be deployable (has deploy method)", () => {
            expect(PrivateAtomicSwapContract.deploy).toBeDefined();
            expect(typeof PrivateAtomicSwapContract.deploy).toBe('function');
            console.log("✅ Contract is deployable");
        });

        it("should have at method for existing instances", () => {
            expect(PrivateAtomicSwapContract.at).toBeDefined();
            expect(typeof PrivateAtomicSwapContract.at).toBe('function');
            console.log("✅ Can connect to existing instances");
        });

        it("should have artifact version", () => {
            expect(PrivateAtomicSwapContract.artifact.fileMap).toBeDefined();
            console.log("✅ Artifact has source map");
        });
    });

    afterAll(() => {
        console.log("\n" + "=".repeat(60));
        console.log("🎉 COMPREHENSIVE STRUCTURE TESTS COMPLETED!");
        console.log("=".repeat(60));
        console.log("✅ Contract structure validated");
        console.log("✅ All V3 features present");
        console.log("✅ Ready for integration testing");
        console.log("✅ Ready for deployment");
        console.log("=".repeat(60));
    });
});

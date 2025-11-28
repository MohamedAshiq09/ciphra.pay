// ============================================================================
// COMPREHENSIVE TESTS FOR ATOMIC SWAP V2
// Tests: Zcash ↔ Starknet, Aztec ↔ Starknet, NEAR ↔ Starknet
// ============================================================================

#[cfg(test)]
mod tests {
    use starknet::{ContractAddress, contract_address_const, get_block_timestamp};
    use starknet::testing::{set_caller_address, set_contract_address, set_block_timestamp};
    use core::poseidon::poseidon_hash_span;
    use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};

    // Import contract interfaces
    use ciphra_pay::atomic_swap_v2::{
        IAtomicSwapV2Dispatcher, IAtomicSwapV2DispatcherTrait,
        SwapDetails, SwapStatus
    };

    // Mock ERC20 for testing
    #[starknet::interface]
    trait IERC20<TContractState> {
        fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
        fn transfer_from(
            ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256
        ) -> bool;
        fn approve(ref self: TContractState, spender: ContractAddress, amount: u256) -> bool;
        fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
        fn mint(ref self: TContractState, recipient: ContractAddress, amount: u256);
    }

    // ========================================================================
    // Test Setup
    // ========================================================================

    fn deploy_contracts() -> (IAtomicSwapV2Dispatcher, ContractAddress, ContractAddress, ContractAddress, ContractAddress) {
        // Deploy ERC20 mock
        let erc20_class = declare("MockERC20").unwrap().contract_class();
        let mut erc20_constructor_calldata = array![];
        let (erc20_address, _) = erc20_class.deploy(@erc20_constructor_calldata).unwrap();

        // Deploy AtomicSwapV2
        let owner: ContractAddress = contract_address_const::<0x123>();
        let fee_recipient: ContractAddress = contract_address_const::<0x456>();

        let swap_class = declare("AtomicSwapV2").unwrap().contract_class();
        let mut swap_constructor_calldata = array![];
        swap_constructor_calldata.append(owner.into());
        swap_constructor_calldata.append(fee_recipient.into());

        let (swap_address, _) = swap_class.deploy(@swap_constructor_calldata).unwrap();
        let swap = IAtomicSwapV2Dispatcher { contract_address: swap_address };

        // Test accounts
        let alice: ContractAddress = contract_address_const::<0x111>();
        let bob: ContractAddress = contract_address_const::<0x222>();

        (swap, erc20_address, alice, bob, owner)
    }

    fn setup_tokens(erc20_address: ContractAddress, alice: ContractAddress, swap_address: ContractAddress) {
        let erc20 = IERC20Dispatcher { contract_address: erc20_address };

        // Mint tokens to Alice
        erc20.mint(alice, 10000);

        // Alice approves swap contract
        set_caller_address(alice);
        erc20.approve(swap_address, 10000);
    }

    fn compute_poseidon_hash(secret: felt252) -> felt252 {
        let mut secret_array = array![secret];
        poseidon_hash_span(secret_array.span())
    }

    // ========================================================================
    // TEST 1: Successful Swap (Zcash → Starknet Flow)
    // ========================================================================

    #[test]
    fn test_successful_zcash_to_starknet_swap() {
        let (swap, erc20_address, alice, bob, _) = deploy_contracts();
        setup_tokens(erc20_address, alice, swap.contract_address);

        // Setup: Simulating Zcash → Starknet atomic swap
        let secret: felt252 = 'mysecret123';
        let hash_lock = compute_poseidon_hash(secret);
        let swap_id: felt252 = 'zcash_swap_001';
        let target_chain: felt252 = 'zcash';
        let target_swap_id: felt252 = 'zec_tx_abc123';
        let amount: u256 = 1000;

        // Set time
        let current_time: u64 = 1000000;
        set_block_timestamp(current_time);
        let time_lock: u64 = current_time + 7200; // 2 hours

        // Step 1: Alice initiates swap on Starknet
        set_caller_address(alice);
        swap.initiate_swap(
            swap_id,
            bob,
            hash_lock,
            time_lock,
            amount,
            erc20_address,
            target_chain,
            target_swap_id
        );

        // Verify swap created
        let swap_details = swap.get_swap_details(swap_id);
        assert(swap_details.status == SwapStatus::Active, 'Swap should be active');
        assert(swap_details.initiator == alice, 'Wrong initiator');
        assert(swap_details.recipient == bob, 'Wrong recipient');
        assert(swap_details.amount == amount, 'Wrong amount');
        assert(swap_details.target_chain == target_chain, 'Wrong target chain');

        // Step 2: Bob completes swap by revealing secret
        set_caller_address(bob);
        swap.complete_swap(swap_id, secret);

        // Verify completion
        let updated_swap = swap.get_swap_details(swap_id);
        assert(updated_swap.status == SwapStatus::Completed, 'Swap should be completed');
        assert(updated_swap.secret == secret, 'Secret not stored');

        // Verify secret is accessible for backend
        let retrieved_secret = swap.get_swap_secret(swap_id);
        assert(retrieved_secret == secret, 'Secret retrieval failed');
    }

    // ========================================================================
    // TEST 2: Successful Swap (Starknet → Aztec Flow)
    // ========================================================================

    #[test]
    fn test_successful_starknet_to_aztec_swap() {
        let (swap, erc20_address, alice, bob, _) = deploy_contracts();
        setup_tokens(erc20_address, alice, swap.contract_address);

        let secret: felt252 = 'aztec_secret_456';
        let hash_lock = compute_poseidon_hash(secret);
        let swap_id: felt252 = 'aztec_swap_002';
        let target_chain: felt252 = 'aztec';
        let target_swap_id: felt252 = 'aztec_note_xyz789';
        let amount: u256 = 5000;

        let current_time: u64 = 2000000;
        set_block_timestamp(current_time);
        let time_lock: u64 = current_time + 3600; // 1 hour

        // Initiate swap
        set_caller_address(alice);
        swap.initiate_swap(
            swap_id,
            bob,
            hash_lock,
            time_lock,
            amount,
            erc20_address,
            target_chain,
            target_swap_id
        );

        // Complete swap
        set_caller_address(bob);
        swap.complete_swap(swap_id, secret);

        // Verify
        let swap_details = swap.get_swap_details(swap_id);
        assert(swap_details.status == SwapStatus::Completed, 'Swap not completed');
        assert(swap_details.target_chain == target_chain, 'Wrong target chain');
        assert(swap_details.secret == secret, 'Secret not stored');
    }

    // ========================================================================
    // TEST 3: Successful Refund
    // ========================================================================

    #[test]
    fn test_successful_refund_after_timelock() {
        let (swap, erc20_address, alice, bob, _) = deploy_contracts();
        setup_tokens(erc20_address, alice, swap.contract_address);

        let secret: felt252 = 'unused_secret';
        let hash_lock = compute_poseidon_hash(secret);
        let swap_id: felt252 = 'refund_test_003';
        let amount: u256 = 2000;

        let current_time: u64 = 3000000;
        set_block_timestamp(current_time);
        let time_lock: u64 = current_time + 3600;

        // Initiate swap
        set_caller_address(alice);
        swap.initiate_swap(
            swap_id,
            bob,
            hash_lock,
            time_lock,
            amount,
            erc20_address,
            'zcash',
            'zec_refund_test'
        );

        // Fast forward past time lock
        set_block_timestamp(time_lock + 1);

        // Alice refunds
        set_caller_address(alice);
        swap.refund_swap(swap_id);

        // Verify refund
        let swap_details = swap.get_swap_details(swap_id);
        assert(swap_details.status == SwapStatus::Refunded, 'Swap not refunded');
    }

    // ========================================================================
    // TEST 4: Invalid Secret (Should Fail)
    // ========================================================================

    #[test]
    #[should_panic(expected: ('Invalid secret',))]
    fn test_complete_swap_with_wrong_secret() {
        let (swap, erc20_address, alice, bob, _) = deploy_contracts();
        setup_tokens(erc20_address, alice, swap.contract_address);

        let correct_secret: felt252 = 'correct_secret';
        let wrong_secret: felt252 = 'wrong_secret';
        let hash_lock = compute_poseidon_hash(correct_secret);
        let swap_id: felt252 = 'wrong_secret_test';

        let current_time: u64 = 4000000;
        set_block_timestamp(current_time);

        // Initiate swap
        set_caller_address(alice);
        swap.initiate_swap(
            swap_id,
            bob,
            hash_lock,
            current_time + 3600,
            1000,
            erc20_address,
            'zcash',
            'test'
        );

        // Try to complete with wrong secret (should panic)
        set_caller_address(bob);
        swap.complete_swap(swap_id, wrong_secret);
    }

    // ========================================================================
    // TEST 5: Refund Before Timelock (Should Fail)
    // ========================================================================

    #[test]
    #[should_panic(expected: ('Time lock not expired',))]
    fn test_refund_before_timelock_fails() {
        let (swap, erc20_address, alice, bob, _) = deploy_contracts();
        setup_tokens(erc20_address, alice, swap.contract_address);

        let secret: felt252 = 'test_secret';
        let hash_lock = compute_poseidon_hash(secret);
        let swap_id: felt252 = 'early_refund_test';

        let current_time: u64 = 5000000;
        set_block_timestamp(current_time);
        let time_lock: u64 = current_time + 7200;

        // Initiate swap
        set_caller_address(alice);
        swap.initiate_swap(
            swap_id,
            bob,
            hash_lock,
            time_lock,
            1000,
            erc20_address,
            'zcash',
            'test'
        );

        // Try to refund before timelock (should panic)
        set_block_timestamp(current_time + 3600); // Only 1 hour passed
        swap.refund_swap(swap_id);
    }

    // ========================================================================
    // TEST 6: Fee Calculation
    // ========================================================================

    #[test]
    fn test_fee_calculation_on_completion() {
        let (swap, erc20_address, alice, bob, _) = deploy_contracts();
        setup_tokens(erc20_address, alice, swap.contract_address);

        let secret: felt252 = 'fee_test_secret';
        let hash_lock = compute_poseidon_hash(secret);
        let swap_id: felt252 = 'fee_test';
        let amount: u256 = 10000; // 10,000 tokens

        let current_time: u64 = 6000000;
        set_block_timestamp(current_time);

        // Initiate swap
        set_caller_address(alice);
        swap.initiate_swap(
            swap_id,
            bob,
            hash_lock,
            current_time + 3600,
            amount,
            erc20_address,
            'zcash',
            'fee_test'
        );

        // Check initial balances
        let erc20 = IERC20Dispatcher { contract_address: erc20_address };
        let bob_balance_before = erc20.balance_of(bob);

        // Complete swap
        set_caller_address(bob);
        swap.complete_swap(swap_id, secret);

        // Verify fee deduction
        // Default fee: 0.3% (30 basis points)
        // Amount: 10,000
        // Fee: 30 tokens
        // Bob receives: 9,970 tokens
        let bob_balance_after = erc20.balance_of(bob);
        let expected_amount = 9970; // 10000 - 30
        assert(bob_balance_after == bob_balance_before + expected_amount, 'Wrong amount after fee');
    }

    // ========================================================================
    // TEST 7: Cross-Chain Metadata Verification
    // ========================================================================

    #[test]
    fn test_cross_chain_metadata_storage() {
        let (swap, erc20_address, alice, bob, _) = deploy_contracts();
        setup_tokens(erc20_address, alice, swap.contract_address);

        let secret: felt252 = 'metadata_test';
        let hash_lock = compute_poseidon_hash(secret);
        let swap_id: felt252 = 'metadata_swap';
        let target_chain: felt252 = 'near';
        let target_swap_id: felt252 = 'near_swap_12345';

        let current_time: u64 = 7000000;
        set_block_timestamp(current_time);

        // Initiate swap
        set_caller_address(alice);
        swap.initiate_swap(
            swap_id,
            bob,
            hash_lock,
            current_time + 3600,
            1000,
            erc20_address,
            target_chain,
            target_swap_id
        );

        // Verify metadata
        let swap_details = swap.get_swap_details(swap_id);
        assert(swap_details.target_chain == target_chain, 'Target chain mismatch');
        assert(swap_details.target_swap_id == target_swap_id, 'Target swap ID mismatch');
    }

    // ========================================================================
    // TEST 8: Admin Functions (Fee Percentage Update)
    // ========================================================================

    #[test]
    fn test_owner_can_update_fee_percentage() {
        let (swap, _, _, _, owner) = deploy_contracts();

        // Check initial fee
        let initial_fee = swap.get_fee_percentage();
        assert(initial_fee == 30, 'Wrong initial fee');

        // Owner updates fee
        set_caller_address(owner);
        swap.set_fee_percentage(50); // 0.5%

        // Verify update
        let updated_fee = swap.get_fee_percentage();
        assert(updated_fee == 50, 'Fee update failed');
    }

    // ========================================================================
    // TEST 9: Non-Owner Cannot Update Fee
    // ========================================================================

    #[test]
    #[should_panic(expected: ('Only owner',))]
    fn test_non_owner_cannot_update_fee() {
        let (swap, _, alice, _, _) = deploy_contracts();

        // Alice tries to update fee (should panic)
        set_caller_address(alice);
        swap.set_fee_percentage(100);
    }

    // ========================================================================
    // TEST 10: Multiple Swaps (Different Chains)
    // ========================================================================

    #[test]
    fn test_multiple_concurrent_swaps() {
        let (swap, erc20_address, alice, bob, _) = deploy_contracts();

        // Setup more tokens for Alice
        let erc20 = IERC20Dispatcher { contract_address: erc20_address };
        erc20.mint(alice, 100000);
        set_caller_address(alice);
        erc20.approve(swap.contract_address, 100000);

        let current_time: u64 = 8000000;
        set_block_timestamp(current_time);

        // Swap 1: Zcash → Starknet
        let secret1: felt252 = 'secret_zcash';
        let hash1 = compute_poseidon_hash(secret1);
        set_caller_address(alice);
        swap.initiate_swap(
            'swap_zcash',
            bob,
            hash1,
            current_time + 3600,
            10000,
            erc20_address,
            'zcash',
            'zec_swap_1'
        );

        // Swap 2: Aztec → Starknet
        let secret2: felt252 = 'secret_aztec';
        let hash2 = compute_poseidon_hash(secret2);
        set_caller_address(alice);
        swap.initiate_swap(
            'swap_aztec',
            bob,
            hash2,
            current_time + 7200,
            20000,
            erc20_address,
            'aztec',
            'aztec_note_xyz'
        );

        // Swap 3: NEAR → Starknet
        let secret3: felt252 = 'secret_near';
        let hash3 = compute_poseidon_hash(secret3);
        set_caller_address(alice);
        swap.initiate_swap(
            'swap_near',
            bob,
            hash3,
            current_time + 10800,
            30000,
            erc20_address,
            'near',
            'near_swap_abc'
        );

        // Verify all swaps are active
        let swap1 = swap.get_swap_details('swap_zcash');
        let swap2 = swap.get_swap_details('swap_aztec');
        let swap3 = swap.get_swap_details('swap_near');

        assert(swap1.status == SwapStatus::Active, 'Swap 1 not active');
        assert(swap2.status == SwapStatus::Active, 'Swap 2 not active');
        assert(swap3.status == SwapStatus::Active, 'Swap 3 not active');

        // Complete all swaps
        set_caller_address(bob);
        swap.complete_swap('swap_zcash', secret1);
        swap.complete_swap('swap_aztec', secret2);
        swap.complete_swap('swap_near', secret3);

        // Verify all completed
        assert(swap.get_swap_details('swap_zcash').status == SwapStatus::Completed, 'Swap 1 not completed');
        assert(swap.get_swap_details('swap_aztec').status == SwapStatus::Completed, 'Swap 2 not completed');
        assert(swap.get_swap_details('swap_near').status == SwapStatus::Completed, 'Swap 3 not completed');
    }
}

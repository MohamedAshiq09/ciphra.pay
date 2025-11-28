// ============================================================================
// STARKNET ATOMIC SWAP CONTRACT V2
// Enhanced for Cross-Chain Swaps: Zcash ↔ Starknet, Aztec ↔ Starknet, NEAR ↔ Starknet
// ============================================================================

use starknet::ContractAddress;
use starknet::get_caller_address;
use starknet::get_block_timestamp;
use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};

// ============================================================================
// ERC20 Interface
// ============================================================================

#[starknet::interface]
pub trait IERC20<TContractState> {
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer_from(
        ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256
    ) -> bool;
    fn approve(ref self: TContractState, spender: ContractAddress, amount: u256) -> bool;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    fn allowance(self: @TContractState, owner: ContractAddress, spender: ContractAddress) -> u256;
}

// ============================================================================
// Atomic Swap Interface
// ============================================================================

#[starknet::interface]
pub trait IAtomicSwapV2<TContractState> {
    // Core swap functions
    fn initiate_swap(
        ref self: TContractState,
        swap_id: felt252,
        recipient: ContractAddress,
        hash_lock: felt252,
        time_lock: u64,
        amount: u256,
        token_address: ContractAddress,
        target_chain: felt252,
        target_swap_id: felt252
    );

    fn complete_swap(
        ref self: TContractState,
        swap_id: felt252,
        secret: felt252
    );

    fn refund_swap(
        ref self: TContractState,
        swap_id: felt252
    );

    // View functions
    fn get_swap_details(
        self: @TContractState,
        swap_id: felt252
    ) -> SwapDetails;

    fn get_swap_secret(
        self: @TContractState,
        swap_id: felt252
    ) -> felt252;

    fn get_fee_percentage(
        self: @TContractState
    ) -> u256;

    // Admin functions
    fn set_fee_percentage(
        ref self: TContractState,
        new_fee: u256
    );

    fn set_fee_recipient(
        ref self: TContractState,
        new_recipient: ContractAddress
    );

    fn withdraw_fees(
        ref self: TContractState,
        token_address: ContractAddress
    );
}

// ============================================================================
// Data Structures
// ============================================================================

#[derive(Drop, Serde, starknet::Store, Copy)]
pub struct SwapDetails {
    pub initiator: ContractAddress,
    pub recipient: ContractAddress,
    pub amount: u256,
    pub token_address: ContractAddress,
    pub hash_lock: felt252,
    pub time_lock: u64,
    pub status: SwapStatus,
    pub secret: felt252, // Stores revealed secret (0 if not revealed)
    pub target_chain: felt252, // "zcash", "aztec", "near"
    pub target_swap_id: felt252, // Linked swap ID on other chain
    pub created_at: u64,
}

#[derive(Drop, Serde, starknet::Store, PartialEq, Copy)]
pub enum SwapStatus {
    Empty,
    Active,
    Completed,
    Refunded,
}

// ============================================================================
// Main Contract
// ============================================================================

#[starknet::contract]
mod AtomicSwapV2 {
    use super::{
        SwapDetails, SwapStatus, IAtomicSwapV2, IERC20, IERC20Dispatcher, IERC20DispatcherTrait
    };
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp, get_contract_address};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};
    use core::poseidon::poseidon_hash_span;

    // ========================================================================
    // Storage
    // ========================================================================

    #[storage]
    struct Storage {
        swaps: Map<felt252, SwapDetails>,
        owner: ContractAddress,
        fee_percentage: u256, // Basis points (30 = 0.3%)
        fee_recipient: ContractAddress,
        collected_fees: Map<ContractAddress, u256>,
        min_time_lock_duration: u64, // 1 hour minimum
        max_time_lock_duration: u64, // 48 hours maximum
    }

    // ========================================================================
    // Events
    // ========================================================================

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        SwapInitiated: SwapInitiated,
        SwapCompleted: SwapCompleted,
        SwapRefunded: SwapRefunded,
        FeeCollected: FeeCollected,
    }

    #[derive(Drop, starknet::Event)]
    struct SwapInitiated {
        #[key]
        swap_id: felt252,
        initiator: ContractAddress,
        recipient: ContractAddress,
        amount: u256,
        token_address: ContractAddress,
        hash_lock: felt252,
        time_lock: u64,
        target_chain: felt252,
        target_swap_id: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct SwapCompleted {
        #[key]
        swap_id: felt252,
        recipient: ContractAddress,
        secret: felt252, // CRITICAL: Backend monitors this!
        amount_transferred: u256,
        fee_collected: u256,
        target_chain: felt252,
        target_swap_id: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct SwapRefunded {
        #[key]
        swap_id: felt252,
        initiator: ContractAddress,
        amount: u256,
        target_chain: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct FeeCollected {
        token_address: ContractAddress,
        amount: u256,
        recipient: ContractAddress,
    }

    // ========================================================================
    // Constructor
    // ========================================================================

    #[constructor]
    fn constructor(
        ref self: ContractState,
        owner: ContractAddress,
        fee_recipient: ContractAddress
    ) {
        self.owner.write(owner);
        self.fee_recipient.write(fee_recipient);
        self.fee_percentage.write(30); // 0.3% default
        self.min_time_lock_duration.write(3600); // 1 hour
        self.max_time_lock_duration.write(172800); // 48 hours
    }

    // ========================================================================
    // Implementation
    // ========================================================================

    #[abi(embed_v0)]
    impl AtomicSwapV2Impl of IAtomicSwapV2<ContractState> {

        // ====================================================================
        // Initiate Swap
        // ====================================================================

        fn initiate_swap(
            ref self: ContractState,
            swap_id: felt252,
            recipient: ContractAddress,
            hash_lock: felt252,
            time_lock: u64,
            amount: u256,
            token_address: ContractAddress,
            target_chain: felt252,
            target_swap_id: felt252
        ) {
            let caller = get_caller_address();
            let current_time = get_block_timestamp();
            let contract_address = get_contract_address();

            // Validations
            let existing_swap = self.swaps.read(swap_id);
            assert(existing_swap.status == SwapStatus::Empty, 'Swap already exists');
            assert(amount > 0, 'Amount must be positive');
            assert(time_lock > current_time, 'Time lock must be future');

            // Validate time lock duration
            let duration = time_lock - current_time;
            let min_duration = self.min_time_lock_duration.read();
            let max_duration = self.max_time_lock_duration.read();
            assert(duration >= min_duration, 'Duration too short');
            assert(duration <= max_duration, 'Duration too long');

            // Transfer tokens from initiator to contract (escrow)
            let token = IERC20Dispatcher { contract_address: token_address };
            let transfer_success = token.transfer_from(caller, contract_address, amount);
            assert(transfer_success, 'Token transfer failed');

            // Store swap details
            let swap_details = SwapDetails {
                initiator: caller,
                recipient,
                amount,
                token_address,
                hash_lock,
                time_lock,
                status: SwapStatus::Active,
                secret: 0, // Not revealed yet
                target_chain,
                target_swap_id,
                created_at: current_time,
            };

            self.swaps.write(swap_id, swap_details);

            // Emit event for backend monitoring
            self.emit(SwapInitiated {
                swap_id,
                initiator: caller,
                recipient,
                amount,
                token_address,
                hash_lock,
                time_lock,
                target_chain,
                target_swap_id,
            });
        }

        // ====================================================================
        // Complete Swap (Reveal Secret)
        // ====================================================================

        fn complete_swap(
            ref self: ContractState,
            swap_id: felt252,
            secret: felt252
        ) {
            let mut swap = self.swaps.read(swap_id);

            // Validations
            assert(swap.status == SwapStatus::Active, 'Swap not active');

            // Verify secret using Poseidon hash
            let mut secret_array = array![secret];
            let computed_hash = poseidon_hash_span(secret_array.span());
            assert(computed_hash == swap.hash_lock, 'Invalid secret');

            // Check time lock not expired
            let current_time = get_block_timestamp();
            assert(current_time <= swap.time_lock, 'Time lock expired');

            // Calculate fee
            let fee_percentage = self.fee_percentage.read();
            let fee = (swap.amount * fee_percentage) / 10000;
            let amount_to_recipient = swap.amount - fee;

            // Transfer tokens to recipient
            let token = IERC20Dispatcher { contract_address: swap.token_address };
            let transfer_success = token.transfer(swap.recipient, amount_to_recipient);
            assert(transfer_success, 'Transfer to recipient failed');

            // Transfer fee to fee recipient
            if fee > 0 {
                let fee_recipient = self.fee_recipient.read();
                let fee_transfer = token.transfer(fee_recipient, fee);
                assert(fee_transfer, 'Fee transfer failed');

                // Track collected fees
                let current_fees = self.collected_fees.read(swap.token_address);
                self.collected_fees.write(swap.token_address, current_fees + fee);
            }

            // Update swap status and store secret
            swap.status = SwapStatus::Completed;
            swap.secret = secret; // STORE SECRET FOR BACKEND
            self.swaps.write(swap_id, swap);

            // Emit event with revealed secret (CRITICAL for backend!)
            self.emit(SwapCompleted {
                swap_id,
                recipient: swap.recipient,
                secret, // Backend monitors this to complete Zcash side!
                amount_transferred: amount_to_recipient,
                fee_collected: fee,
                target_chain: swap.target_chain,
                target_swap_id: swap.target_swap_id,
            });
        }

        // ====================================================================
        // Refund Swap
        // ====================================================================

        fn refund_swap(
            ref self: ContractState,
            swap_id: felt252
        ) {
            let mut swap = self.swaps.read(swap_id);
            let caller = get_caller_address();

            // Validations
            assert(swap.status == SwapStatus::Active, 'Swap not active');
            assert(caller == swap.initiator, 'Only initiator can refund');

            // Check time lock expired
            let current_time = get_block_timestamp();
            assert(current_time > swap.time_lock, 'Time lock not expired');

            // Transfer tokens back to initiator (no fee for refunds)
            let token = IERC20Dispatcher { contract_address: swap.token_address };
            let transfer_success = token.transfer(swap.initiator, swap.amount);
            assert(transfer_success, 'Refund transfer failed');

            // Update swap status
            swap.status = SwapStatus::Refunded;
            self.swaps.write(swap_id, swap);

            // Emit event
            self.emit(SwapRefunded {
                swap_id,
                initiator: swap.initiator,
                amount: swap.amount,
                target_chain: swap.target_chain,
            });
        }

        // ====================================================================
        // View Functions
        // ====================================================================

        fn get_swap_details(
            self: @ContractState,
            swap_id: felt252
        ) -> SwapDetails {
            self.swaps.read(swap_id)
        }

        fn get_swap_secret(
            self: @ContractState,
            swap_id: felt252
        ) -> felt252 {
            let swap = self.swaps.read(swap_id);
            swap.secret
        }

        fn get_fee_percentage(
            self: @ContractState
        ) -> u256 {
            self.fee_percentage.read()
        }

        // ====================================================================
        // Admin Functions
        // ====================================================================

        fn set_fee_percentage(
            ref self: ContractState,
            new_fee: u256
        ) {
            let caller = get_caller_address();
            let owner = self.owner.read();
            assert(caller == owner, 'Only owner');
            assert(new_fee <= 1000, 'Fee too high (max 10%)');

            self.fee_percentage.write(new_fee);
        }

        fn set_fee_recipient(
            ref self: ContractState,
            new_recipient: ContractAddress
        ) {
            let caller = get_caller_address();
            let owner = self.owner.read();
            assert(caller == owner, 'Only owner');

            self.fee_recipient.write(new_recipient);
        }

        fn withdraw_fees(
            ref self: ContractState,
            token_address: ContractAddress
        ) {
            let caller = get_caller_address();
            let fee_recipient = self.fee_recipient.read();
            assert(caller == fee_recipient, 'Only fee recipient');

            let fees = self.collected_fees.read(token_address);
            assert(fees > 0, 'No fees to withdraw');

            let token = IERC20Dispatcher { contract_address: token_address };
            let transfer_success = token.transfer(fee_recipient, fees);
            assert(transfer_success, 'Fee withdrawal failed');

            self.collected_fees.write(token_address, 0);

            self.emit(FeeCollected {
                token_address,
                amount: fees,
                recipient: fee_recipient,
            });
        }
    }
}

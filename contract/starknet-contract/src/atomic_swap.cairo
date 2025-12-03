use starknet::ContractAddress;
use starknet::get_caller_address;
use starknet::get_block_timestamp;
use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};

#[starknet::interface]
pub trait IAtomicSwap<TContractState> {
    fn initiate_swap(
        ref self: TContractState,
        swap_id: felt252,
        recipient: ContractAddress,
        hash_lock: felt252,
        time_lock: u64,
        amount: u256
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
    
    fn get_swap_details(
        self: @TContractState,
        swap_id: felt252
    ) -> SwapDetails;
}

#[derive(Drop, Serde, starknet::Store, Copy)]
pub struct SwapDetails {
    pub initiator: ContractAddress,
    pub recipient: ContractAddress,
    pub amount: u256,
    pub hash_lock: felt252,
    pub time_lock: u64,
    pub status: SwapStatus,
}

#[derive(Drop, Serde, starknet::Store, PartialEq, Copy)]
pub enum SwapStatus {
    Empty,
    Active,
    Completed,
    Refunded,
}

#[starknet::contract]
mod AtomicSwap {
    use super::{SwapDetails, SwapStatus, IAtomicSwap};
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};
    use core::poseidon::poseidon_hash_span;

    #[storage]
    struct Storage {
        swaps: Map<felt252, SwapDetails>,
        swap_exists: Map<felt252, bool>,  // Track swap existence separately
        owner: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        SwapInitiated: SwapInitiated,
        SwapCompleted: SwapCompleted,
        SwapRefunded: SwapRefunded,
    }

    #[derive(Drop, starknet::Event)]
    struct SwapInitiated {
        #[key]
        swap_id: felt252,
        initiator: ContractAddress,
        recipient: ContractAddress,
        amount: u256,
        time_lock: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct SwapCompleted {
        #[key]
        swap_id: felt252,
        recipient: ContractAddress,
        secret: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct SwapRefunded {
        #[key]
        swap_id: felt252,
        initiator: ContractAddress,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
    }

    #[abi(embed_v0)]
    impl AtomicSwapImpl of IAtomicSwap<ContractState> {
        fn initiate_swap(
            ref self: ContractState,
            swap_id: felt252,
            recipient: ContractAddress,
            hash_lock: felt252,
            time_lock: u64,
            amount: u256
        ) {
            let caller = get_caller_address();
            let current_time = get_block_timestamp();
            
            // Check existence using the separate bool map (safe - bool defaults to false)
            let exists = self.swap_exists.read(swap_id);
            assert(!exists, 'Swap already exists');
            assert(time_lock > current_time, 'Time lock must be future');
            assert(amount > 0, 'Amount must be positive');
            
            let swap_details = SwapDetails {
                initiator: caller,
                recipient,
                amount,
                hash_lock,
                time_lock,
                status: SwapStatus::Active,
            };
            
            // Mark as existing first, then write details
            self.swap_exists.write(swap_id, true);
            self.swaps.write(swap_id, swap_details);
            
            self.emit(SwapInitiated {
                swap_id,
                initiator: caller,
                recipient,
                amount,
                time_lock,
            });
        }

        fn complete_swap(
            ref self: ContractState,
            swap_id: felt252,
            secret: felt252
        ) {
            // Check existence first (safe - bool defaults to false)
            let exists = self.swap_exists.read(swap_id);
            assert(exists, 'Swap does not exist');
            
            let swap = self.swaps.read(swap_id);
            
            assert(swap.status == SwapStatus::Active, 'Swap not active');
            
            let mut secret_array = array![secret];
            let computed_hash = poseidon_hash_span(secret_array.span());
            assert(computed_hash == swap.hash_lock, 'Invalid secret');
            
            let current_time = get_block_timestamp();
            assert(current_time <= swap.time_lock, 'Time lock expired');
            
            let updated_swap = SwapDetails {
                initiator: swap.initiator,
                recipient: swap.recipient,
                amount: swap.amount,
                hash_lock: swap.hash_lock,
                time_lock: swap.time_lock,
                status: SwapStatus::Completed,
            };
            self.swaps.write(swap_id, updated_swap);
            
            self.emit(SwapCompleted {
                swap_id,
                recipient: swap.recipient,
                secret,
            });
        }

        fn refund_swap(
            ref self: ContractState,
            swap_id: felt252
        ) {
            // Check existence first (safe - bool defaults to false)
            let exists = self.swap_exists.read(swap_id);
            assert(exists, 'Swap does not exist');
            
            let swap = self.swaps.read(swap_id);
            let caller = get_caller_address();
            
            assert(swap.status == SwapStatus::Active, 'Swap not active');
            assert(caller == swap.initiator, 'Only initiator can refund');
            
            let current_time = get_block_timestamp();
            assert(current_time > swap.time_lock, 'Time lock not expired');
            
            let updated_swap = SwapDetails {
                initiator: swap.initiator,
                recipient: swap.recipient,
                amount: swap.amount,
                hash_lock: swap.hash_lock,
                time_lock: swap.time_lock,
                status: SwapStatus::Refunded,
            };
            self.swaps.write(swap_id, updated_swap);
            
            self.emit(SwapRefunded {
                swap_id,
                initiator: swap.initiator,
            });
        }

        fn get_swap_details(
            self: @ContractState,
            swap_id: felt252
        ) -> SwapDetails {
            // Check existence first (safe - bool defaults to false)
            let exists = self.swap_exists.read(swap_id);
            assert(exists, 'Swap does not exist');
            
            self.swaps.read(swap_id)
        }
    }
}
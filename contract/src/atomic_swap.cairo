use starknet::ContractAddress;
use starknet::get_caller_address;
use starknet::get_block_timestamp;
use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};

#[starknet::interface]
trait IAtomicSwap<TContractState> {
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

#[derive(Drop, Serde, starknet::Store)]
struct SwapDetails {
    initiator: ContractAddress,
    recipient: ContractAddress,
    amount: u256,
    hash_lock: felt252,
    time_lock: u64,
    status: SwapStatus,
}

#[derive(Drop, Serde, starknet::Store, PartialEq)]
enum SwapStatus {
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
            
            // Validate swap doesn't exist
            let existing_swap = self.swaps.read(swap_id);
            assert(existing_swap.status == SwapStatus::Empty, 'Swap already exists');
            
            // Validate time lock is in the future
            assert(time_lock > current_time, 'Time lock must be future');
            
            // Store swap details
            let swap_details = SwapDetails {
                initiator: caller,
                recipient,
                amount,
                hash_lock,
                time_lock,
                status: SwapStatus::Active,
            };
            
            self.swaps.write(swap_id, swap_details);
            
            // Emit event
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
            let swap = self.swaps.read(swap_id);
            
            // Validate swap is active
            assert(swap.status == SwapStatus::Active, 'Swap not active');
            
            // Validate secret matches hash lock
            let mut secret_array = array![secret];
            let computed_hash = poseidon_hash_span(secret_array.span());
            assert(computed_hash == swap.hash_lock, 'Invalid secret');
            
            // Validate time lock hasn't expired
            let current_time = get_block_timestamp();
            assert(current_time <= swap.time_lock, 'Time lock expired');
            
            // Update swap status
            let updated_swap = SwapDetails {
                initiator: swap.initiator,
                recipient: swap.recipient,
                amount: swap.amount,
                hash_lock: swap.hash_lock,
                time_lock: swap.time_lock,
                status: SwapStatus::Completed,
            };
            self.swaps.write(swap_id, updated_swap);
            
            // Emit event
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
            let swap = self.swaps.read(swap_id);
            let caller = get_caller_address();
            
            // Validate swap is active
            assert(swap.status == SwapStatus::Active, 'Swap not active');
            
            // Validate caller is initiator
            assert(caller == swap.initiator, 'Only initiator can refund');
            
            // Validate time lock has expired
            let current_time = get_block_timestamp();
            assert(current_time > swap.time_lock, 'Time lock not expired');
            
            // Update swap status
            let updated_swap = SwapDetails {
                initiator: swap.initiator,
                recipient: swap.recipient,
                amount: swap.amount,
                hash_lock: swap.hash_lock,
                time_lock: swap.time_lock,
                status: SwapStatus::Refunded,
            };
            self.swaps.write(swap_id, updated_swap);
            
            // Emit event
            self.emit(SwapRefunded {
                swap_id,
                initiator: swap.initiator,
            });
        }

        fn get_swap_details(
            self: @ContractState,
            swap_id: felt252
        ) -> SwapDetails {
            self.swaps.read(swap_id)
        }
    }
}

use starknet::ContractAddress;
use starknet::get_caller_address;
use starknet::get_block_timestamp;
use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};

#[starknet::interface]
trait IBridgeConnector<TContractState> {
    fn register_bridge(
        ref self: TContractState,
        chain_id: felt252,
        bridge_address: felt252
    );
    
    fn lock_for_bridge(
        ref self: TContractState,
        transfer_id: felt252,
        amount: u256,
        destination_chain: felt252,
        recipient: felt252
    );
    
    fn unlock_from_bridge(
        ref self: TContractState,
        transfer_id: felt252,
        proof: felt252
    );
    
    fn get_transfer_details(
        self: @TContractState,
        transfer_id: felt252
    ) -> TransferDetails;
    
    fn is_bridge_registered(
        self: @TContractState,
        chain_id: felt252
    ) -> bool;
}

#[derive(Drop, Serde, starknet::Store)]
struct TransferDetails {
    sender: ContractAddress,
    amount: u256,
    destination_chain: felt252,
    recipient: felt252,
    status: TransferStatus,
    timestamp: u64,
}

#[derive(Drop, Serde, starknet::Store, PartialEq)]
enum TransferStatus {
    Empty,
    Locked,
    Unlocked,
    Reverted,
}

#[starknet::contract]
mod BridgeConnector {
    use super::{TransferDetails, TransferStatus, IBridgeConnector};
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};

    #[storage]
    struct Storage {
        transfers: Map<felt252, TransferDetails>,
        registered_bridges: Map<felt252, felt252>,
        bridge_registered: Map<felt252, bool>,
        owner: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        BridgeRegistered: BridgeRegistered,
        TokensLocked: TokensLocked,
        TokensUnlocked: TokensUnlocked,
        TransferReverted: TransferReverted,
    }

    #[derive(Drop, starknet::Event)]
    struct BridgeRegistered {
        #[key]
        chain_id: felt252,
        bridge_address: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct TokensLocked {
        #[key]
        transfer_id: felt252,
        sender: ContractAddress,
        amount: u256,
        destination_chain: felt252,
        recipient: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct TokensUnlocked {
        #[key]
        transfer_id: felt252,
        recipient: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct TransferReverted {
        #[key]
        transfer_id: felt252,
        sender: ContractAddress,
        amount: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
    }

    #[abi(embed_v0)]
    impl BridgeConnectorImpl of IBridgeConnector<ContractState> {
        fn register_bridge(
            ref self: ContractState,
            chain_id: felt252,
            bridge_address: felt252
        ) {
            let caller = get_caller_address();
            
            // Only owner can register bridges
            assert(caller == self.owner.read(), 'Only owner can register');
            
            // Store bridge information
            self.registered_bridges.write(chain_id, bridge_address);
            self.bridge_registered.write(chain_id, true);
            
            // Emit event
            self.emit(BridgeRegistered {
                chain_id,
                bridge_address,
            });
        }

        fn lock_for_bridge(
            ref self: ContractState,
            transfer_id: felt252,
            amount: u256,
            destination_chain: felt252,
            recipient: felt252
        ) {
            let caller = get_caller_address();
            let current_time = get_block_timestamp();
            
            // Validate transfer doesn't exist
            let existing_transfer = self.transfers.read(transfer_id);
            assert(existing_transfer.status == TransferStatus::Empty, 'Transfer already exists');
            
            // Validate destination bridge is registered
            assert(self.bridge_registered.read(destination_chain), 'Bridge not registered');
            
            // Validate amount is greater than zero
            assert(amount > 0, 'Amount must be positive');
            
            // Store transfer details
            let transfer_details = TransferDetails {
                sender: caller,
                amount,
                destination_chain,
                recipient,
                status: TransferStatus::Locked,
                timestamp: current_time,
            };
            
            self.transfers.write(transfer_id, transfer_details);
            
            // Emit event
            self.emit(TokensLocked {
                transfer_id,
                sender: caller,
                amount,
                destination_chain,
                recipient,
            });
        }

        fn unlock_from_bridge(
            ref self: ContractState,
            transfer_id: felt252,
            proof: felt252
        ) {
            let transfer = self.transfers.read(transfer_id);
            
            // Validate transfer is locked
            assert(transfer.status == TransferStatus::Locked, 'Transfer not locked');
            
            // In production, verify the proof from the source chain
            // For now, we'll do a simple check
            assert(proof != 0, 'Invalid proof');
            
            // Convert felt252 recipient to ContractAddress
            let recipient_address: ContractAddress = transfer.recipient.try_into().unwrap();
            
            // Update transfer status
            let updated_transfer = TransferDetails {
                sender: transfer.sender,
                amount: transfer.amount,
                destination_chain: transfer.destination_chain,
                recipient: transfer.recipient,
                status: TransferStatus::Unlocked,
                timestamp: transfer.timestamp,
            };
            self.transfers.write(transfer_id, updated_transfer);
            
            // Emit event
            self.emit(TokensUnlocked {
                transfer_id,
                recipient: recipient_address,
                amount: transfer.amount,
            });
        }

        fn get_transfer_details(
            self: @ContractState,
            transfer_id: felt252
        ) -> TransferDetails {
            self.transfers.read(transfer_id)
        }

        fn is_bridge_registered(
            self: @ContractState,
            chain_id: felt252
        ) -> bool {
            self.bridge_registered.read(chain_id)
        }
    }
}
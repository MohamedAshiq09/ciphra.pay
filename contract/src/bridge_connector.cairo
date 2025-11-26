use starknet::ContractAddress;

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
        token_address: ContractAddress,
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

#[derive(Drop, Copy, Serde, starknet::Store)]
struct TransferDetails {
    sender: ContractAddress,
    token_address: ContractAddress,
    amount: u256,
    destination_chain: felt252,
    recipient: felt252,
    status: TransferStatus,
    timestamp: u64,
}

#[derive(Drop, Copy, Serde, starknet::Store, PartialEq)]
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
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess,
        StoragePointerReadAccess, StoragePointerWriteAccess
    };
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use openzeppelin::access::ownable::OwnableComponent;

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    #[abi(embed_v0)]
    impl OwnableImpl = OwnableComponent::OwnableImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        transfers: Map<felt252, TransferDetails>,
        registered_bridges: Map<felt252, felt252>, // chain_id => bridge_address
        bridge_registered: Map<felt252, bool>,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        BridgeRegistered: BridgeRegistered,
        TokensLocked: TokensLocked,
        TokensUnlocked: TokensUnlocked,
        TransferReverted: TransferReverted,
        #[flat]
        OwnableEvent: OwnableComponent::Event,
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
        self.ownable.initializer(owner);
    }

    #[abi(embed_v0)]
    impl BridgeConnectorImpl of IBridgeConnector<ContractState> {
        fn register_bridge(
            ref self: ContractState,
            chain_id: felt252,
            bridge_address: felt252
        ) {
            // Only owner can register bridges
            self.ownable.assert_only_owner();
            
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
            token_address: ContractAddress,
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
            
            // Transfer tokens from sender to contract
            let token = IERC20Dispatcher { contract_address: token_address };
            let contract_address = starknet::get_contract_address();
            token.transfer_from(caller, contract_address, amount);
            
            // Store transfer details
            let transfer_details = TransferDetails {
                sender: caller,
                token_address,
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
            let mut transfer = self.transfers.read(transfer_id);
            
            // Validate transfer is locked
            assert(transfer.status == TransferStatus::Locked, 'Transfer not locked');
            
            // In production, verify the proof from the source chain
            // For now, we'll do a simple check (this should be more sophisticated)
            assert(proof != 0, 'Invalid proof');
            
            // Convert felt252 recipient to ContractAddress
            // Note: This is a simplified conversion - in production, handle this more carefully
            let recipient_address: ContractAddress = transfer.recipient.try_into().unwrap();
            
            // Transfer tokens to recipient
            let token = IERC20Dispatcher { contract_address: transfer.token_address };
            token.transfer(recipient_address, transfer.amount);
            
            // Update transfer status
            transfer.status = TransferStatus::Unlocked;
            self.transfers.write(transfer_id, transfer);
            
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

    // Internal functions
    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn revert_transfer(
            ref self: ContractState,
            transfer_id: felt252
        ) {
            let mut transfer = self.transfers.read(transfer_id);
            
            // Validate transfer is locked
            assert(transfer.status == TransferStatus::Locked, 'Transfer not locked');
            
            // Transfer tokens back to sender
            let token = IERC20Dispatcher { contract_address: transfer.token_address };
            token.transfer(transfer.sender, transfer.amount);
            
            // Update transfer status
            transfer.status = TransferStatus::Reverted;
            self.transfers.write(transfer_id, transfer);
            
            // Emit event
            self.emit(TransferReverted {
                transfer_id,
                sender: transfer.sender,
                amount: transfer.amount,
            });
        }
    }
}

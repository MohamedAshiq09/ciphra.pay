use starknet::ContractAddress;

#[starknet::interface]
trait IEscrow<TContractState> {
    fn create_escrow(
        ref self: TContractState,
        escrow_id: felt252,
        beneficiary: ContractAddress,
        token_address: ContractAddress,
        amount: u256,
        release_time: u64
    );
    
    fn release_escrow(
        ref self: TContractState,
        escrow_id: felt252
    );
    
    fn cancel_escrow(
        ref self: TContractState,
        escrow_id: felt252
    );
    
    fn get_escrow_details(
        self: @TContractState,
        escrow_id: felt252
    ) -> EscrowDetails;
}

#[derive(Drop, Copy, Serde, starknet::Store)]
struct EscrowDetails {
    depositor: ContractAddress,
    beneficiary: ContractAddress,
    token_address: ContractAddress,
    amount: u256,
    release_time: u64,
    status: EscrowStatus,
}

#[derive(Drop, Copy, Serde, starknet::Store, PartialEq)]
enum EscrowStatus {
    Empty,
    Active,
    Released,
    Cancelled,
}

#[starknet::contract]
mod Escrow {
    use super::{EscrowDetails, EscrowStatus, IEscrow};
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess,
        StoragePointerReadAccess, StoragePointerWriteAccess
    };
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};

    #[storage]
    struct Storage {
        escrows: Map<felt252, EscrowDetails>,
        owner: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        EscrowCreated: EscrowCreated,
        EscrowReleased: EscrowReleased,
        EscrowCancelled: EscrowCancelled,
    }

    #[derive(Drop, starknet::Event)]
    struct EscrowCreated {
        #[key]
        escrow_id: felt252,
        depositor: ContractAddress,
        beneficiary: ContractAddress,
        amount: u256,
        release_time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct EscrowReleased {
        #[key]
        escrow_id: felt252,
        beneficiary: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct EscrowCancelled {
        #[key]
        escrow_id: felt252,
        depositor: ContractAddress,
        amount: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
    }

    #[abi(embed_v0)]
    impl EscrowImpl of IEscrow<ContractState> {
        fn create_escrow(
            ref self: ContractState,
            escrow_id: felt252,
            beneficiary: ContractAddress,
            token_address: ContractAddress,
            amount: u256,
            release_time: u64
        ) {
            let caller = get_caller_address();
            let current_time = get_block_timestamp();
            
            // Validate escrow doesn't exist
            let existing_escrow = self.escrows.read(escrow_id);
            assert(existing_escrow.status == EscrowStatus::Empty, 'Escrow already exists');
            
            // Validate release time is in the future
            assert(release_time > current_time, 'Release time must be future');
            
            // Validate amount is greater than zero
            assert(amount > 0, 'Amount must be positive');
            
            // Transfer tokens from depositor to contract
            let token = IERC20Dispatcher { contract_address: token_address };
            let contract_address = starknet::get_contract_address();
            token.transfer_from(caller, contract_address, amount);
            
            // Store escrow details
            let escrow_details = EscrowDetails {
                depositor: caller,
                beneficiary,
                token_address,
                amount,
                release_time,
                status: EscrowStatus::Active,
            };
            
            self.escrows.write(escrow_id, escrow_details);
            
            // Emit event
            self.emit(EscrowCreated {
                escrow_id,
                depositor: caller,
                beneficiary,
                amount,
                release_time,
            });
        }

        fn release_escrow(
            ref self: ContractState,
            escrow_id: felt252
        ) {
            let mut escrow = self.escrows.read(escrow_id);
            let current_time = get_block_timestamp();
            
            // Validate escrow is active
            assert(escrow.status == EscrowStatus::Active, 'Escrow not active');
            
            // Validate release time has passed
            assert(current_time >= escrow.release_time, 'Release time not reached');
            
            // Transfer tokens to beneficiary
            let token = IERC20Dispatcher { contract_address: escrow.token_address };
            token.transfer(escrow.beneficiary, escrow.amount);
            
            // Update escrow status
            escrow.status = EscrowStatus::Released;
            self.escrows.write(escrow_id, escrow);
            
            // Emit event
            self.emit(EscrowReleased {
                escrow_id,
                beneficiary: escrow.beneficiary,
                amount: escrow.amount,
            });
        }

        fn cancel_escrow(
            ref self: ContractState,
            escrow_id: felt252
        ) {
            let mut escrow = self.escrows.read(escrow_id);
            let caller = get_caller_address();
            let current_time = get_block_timestamp();
            
            // Validate escrow is active
            assert(escrow.status == EscrowStatus::Active, 'Escrow not active');
            
            // Validate caller is depositor
            assert(caller == escrow.depositor, 'Only depositor can cancel');
            
            // Validate release time has passed (can only cancel after expiry)
            assert(current_time >= escrow.release_time, 'Cannot cancel before expiry');
            
            // Transfer tokens back to depositor
            let token = IERC20Dispatcher { contract_address: escrow.token_address };
            token.transfer(escrow.depositor, escrow.amount);
            
            // Update escrow status
            escrow.status = EscrowStatus::Cancelled;
            self.escrows.write(escrow_id, escrow);
            
            // Emit event
            self.emit(EscrowCancelled {
                escrow_id,
                depositor: escrow.depositor,
                amount: escrow.amount,
            });
        }

        fn get_escrow_details(
            self: @ContractState,
            escrow_id: felt252
        ) -> EscrowDetails {
            self.escrows.read(escrow_id)
        }
    }
}

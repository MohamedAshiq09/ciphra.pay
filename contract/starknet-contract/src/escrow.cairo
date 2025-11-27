use starknet::ContractAddress;
use starknet::get_caller_address;
use starknet::get_block_timestamp;
use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};

#[starknet::interface]
pub trait IEscrow<TContractState> {
    fn create_escrow(
        ref self: TContractState,
        escrow_id: felt252,
        beneficiary: ContractAddress,
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

#[derive(Drop, Serde, starknet::Store, Copy)]
pub struct EscrowDetails {
    pub depositor: ContractAddress,
    pub beneficiary: ContractAddress,
    pub amount: u256,
    pub release_time: u64,
    pub status: EscrowStatus,
}

#[derive(Drop, Serde, starknet::Store, PartialEq, Copy)]
pub enum EscrowStatus {
    Empty,
    Active,
    Released,
    Cancelled,
}

#[starknet::contract]
mod Escrow {
    use super::{EscrowDetails, EscrowStatus, IEscrow};
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};

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
            amount: u256,
            release_time: u64
        ) {
            let caller = get_caller_address();
            let current_time = get_block_timestamp();
            
            let existing_escrow = self.escrows.read(escrow_id);
            assert(existing_escrow.status == EscrowStatus::Empty, 'Escrow already exists');
            assert(release_time > current_time, 'Release time must be future');
            assert(amount > 0, 'Amount must be positive');
            
            let escrow_details = EscrowDetails {
                depositor: caller,
                beneficiary,
                amount,
                release_time,
                status: EscrowStatus::Active,
            };
            
            self.escrows.write(escrow_id, escrow_details);
            
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
            let escrow = self.escrows.read(escrow_id);
            let current_time = get_block_timestamp();
            
            assert(escrow.status == EscrowStatus::Active, 'Escrow not active');
            assert(current_time >= escrow.release_time, 'Release time not reached');
            
            let updated_escrow = EscrowDetails {
                depositor: escrow.depositor,
                beneficiary: escrow.beneficiary,
                amount: escrow.amount,
                release_time: escrow.release_time,
                status: EscrowStatus::Released,
            };
            self.escrows.write(escrow_id, updated_escrow);
            
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
            let escrow = self.escrows.read(escrow_id);
            let caller = get_caller_address();
            let current_time = get_block_timestamp();
            
            assert(escrow.status == EscrowStatus::Active, 'Escrow not active');
            assert(caller == escrow.depositor, 'Only depositor can cancel');
            assert(current_time >= escrow.release_time, 'Cannot cancel before expiry');
            
            let updated_escrow = EscrowDetails {
                depositor: escrow.depositor,
                beneficiary: escrow.beneficiary,
                amount: escrow.amount,
                release_time: escrow.release_time,
                status: EscrowStatus::Cancelled,
            };
            self.escrows.write(escrow_id, updated_escrow);
            
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
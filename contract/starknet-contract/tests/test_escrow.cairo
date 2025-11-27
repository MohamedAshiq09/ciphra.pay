use starknet::ContractAddress;
use starknet::contract_address_const;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};
use ciphra_pay::escrow::{IEscrowDispatcher, IEscrowDispatcherTrait, EscrowStatus};

fn deploy_contract() -> (IEscrowDispatcher, ContractAddress) {
    let owner = contract_address_const::<0x123>();
    let contract = declare("Escrow").unwrap().contract_class();
    let (contract_address, _) = contract.deploy(@array![owner.into()]).unwrap();
    
    (IEscrowDispatcher { contract_address }, owner)
}

#[test]
fn test_create_escrow() {
    let (dispatcher, owner) = deploy_contract();
    
    let escrow_id = 'escrow_1';
    let beneficiary = contract_address_const::<0x456>();
    let amount = 100_u256;
    let release_time = 9999999999_u64; // Far future
    
    dispatcher.create_escrow(
        escrow_id,
        beneficiary,
        amount,
        release_time
    );
    
    let escrow = dispatcher.get_escrow_details(escrow_id);
    assert(escrow.depositor == owner, 'Wrong depositor');
    assert(escrow.beneficiary == beneficiary, 'Wrong beneficiary');
    assert(escrow.amount == amount, 'Wrong amount');
    assert(escrow.status == EscrowStatus::Active, 'Should be active');
    assert(escrow.release_time == release_time, 'Wrong release time');
}

#[test]
fn test_get_empty_escrow() {
    let (dispatcher, _owner) = deploy_contract();
    
    let escrow = dispatcher.get_escrow_details('nonexistent');
    assert(escrow.status == EscrowStatus::Empty, 'Should be empty');
    assert(escrow.amount == 0_u256, 'Amount should be 0');
}

#[test]
#[should_panic(expected: ('Escrow already exists',))]
fn test_duplicate_escrow_id() {
    let (dispatcher, _owner) = deploy_contract();
    
    let escrow_id = 'escrow_2';
    let beneficiary = contract_address_const::<0x456>();
    let amount = 100_u256;
    let release_time = 9999999999_u64;
    
    // First creation
    dispatcher.create_escrow(
        escrow_id,
        beneficiary,
        amount,
        release_time
    );
    
    // Try to create again - should panic
    dispatcher.create_escrow(
        escrow_id,
        beneficiary,
        amount,
        release_time
    );
}

#[test]
#[should_panic(expected: ('Release time must be future',))]
fn test_invalid_release_time() {
    let (dispatcher, _owner) = deploy_contract();
    
    let escrow_id = 'escrow_3';
    let beneficiary = contract_address_const::<0x456>();
    let amount = 100_u256;
    let release_time = 0_u64; // Past time
    
    // Should panic - release time in past
    dispatcher.create_escrow(
        escrow_id,
        beneficiary,
        amount,
        release_time
    );
}

#[test]
#[should_panic(expected: ('Amount must be positive',))]
fn test_zero_amount_escrow() {
    let (dispatcher, _owner) = deploy_contract();
    
    let escrow_id = 'escrow_4';
    let beneficiary = contract_address_const::<0x456>();
    let amount = 0_u256; // Zero amount
    let release_time = 9999999999_u64;
    
    // Should panic - amount is zero
    dispatcher.create_escrow(
        escrow_id,
        beneficiary,
        amount,
        release_time
    );
}

#[test]
fn test_multiple_escrows() {
    let (dispatcher, owner) = deploy_contract();
    
    let beneficiary = contract_address_const::<0x456>();
    let amount = 100_u256;
    let release_time = 9999999999_u64;
    
    // Create multiple escrows
    dispatcher.create_escrow('escrow_5', beneficiary, amount, release_time);
    dispatcher.create_escrow('escrow_6', beneficiary, amount * 2, release_time);
    dispatcher.create_escrow('escrow_7', beneficiary, amount * 3, release_time);
    
    // Verify all exist
    let escrow1 = dispatcher.get_escrow_details('escrow_5');
    let escrow2 = dispatcher.get_escrow_details('escrow_6');
    let escrow3 = dispatcher.get_escrow_details('escrow_7');
    
    assert(escrow1.depositor == owner, 'Wrong depositor 1');
    assert(escrow2.depositor == owner, 'Wrong depositor 2');
    assert(escrow3.depositor == owner, 'Wrong depositor 3');
    
    assert(escrow1.amount == amount, 'Wrong amount 1');
    assert(escrow2.amount == amount * 2, 'Wrong amount 2');
    assert(escrow3.amount == amount * 3, 'Wrong amount 3');
}
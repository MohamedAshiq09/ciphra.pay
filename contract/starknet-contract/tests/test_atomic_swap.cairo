use starknet::ContractAddress;
use starknet::contract_address_const;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};
use ciphra_pay::atomic_swap::{IAtomicSwapDispatcher, IAtomicSwapDispatcherTrait, SwapStatus};
use core::poseidon::poseidon_hash_span;

fn deploy_contract() -> (IAtomicSwapDispatcher, ContractAddress) {
    let owner = contract_address_const::<0x123>();
    let contract = declare("AtomicSwap").unwrap().contract_class();
    let (contract_address, _) = contract.deploy(@array![owner.into()]).unwrap();
    
    (IAtomicSwapDispatcher { contract_address }, owner)
}

#[test]
fn test_initiate_swap() {
    let (dispatcher, owner) = deploy_contract();
    
    let swap_id = 'swap_1';
    let recipient = contract_address_const::<0x456>();
    let secret = 'my_secret';
    let mut secret_array = array![secret];
    let hash_lock = poseidon_hash_span(secret_array.span());
    let time_lock = 2000_u64;
    let amount = 100_u256;
    
    dispatcher.initiate_swap(
        swap_id,
        recipient,
        hash_lock,
        time_lock,
        amount
    );
    
    let swap = dispatcher.get_swap_details(swap_id);
    assert(swap.initiator == owner, 'Wrong initiator');
    assert(swap.recipient == recipient, 'Wrong recipient');
    assert(swap.amount == amount, 'Wrong amount');
    assert(swap.status == SwapStatus::Active, 'Should be active');
}

#[test]
fn test_complete_swap() {
    let (dispatcher, _owner) = deploy_contract();
    
    let swap_id = 'swap_2';
    let recipient = contract_address_const::<0x456>();
    let secret = 'my_secret';
    let mut secret_array = array![secret];
    let hash_lock = poseidon_hash_span(secret_array.span());
    let time_lock = 9999999999_u64; // Far future
    let amount = 100_u256;
    
    dispatcher.initiate_swap(
        swap_id,
        recipient,
        hash_lock,
        time_lock,
        amount
    );
    
    dispatcher.complete_swap(swap_id, secret);
    
    let swap = dispatcher.get_swap_details(swap_id);
    assert(swap.status == SwapStatus::Completed, 'Not completed');
}

#[test]
#[should_panic(expected: ('Invalid secret',))]
fn test_complete_swap_wrong_secret() {
    let (dispatcher, _owner) = deploy_contract();
    
    let swap_id = 'swap_3';
    let recipient = contract_address_const::<0x456>();
    let secret = 'my_secret';
    let mut secret_array = array![secret];
    let hash_lock = poseidon_hash_span(secret_array.span());
    let time_lock = 9999999999_u64;
    let amount = 100_u256;
    
    dispatcher.initiate_swap(
        swap_id,
        recipient,
        hash_lock,
        time_lock,
        amount
    );
    
    // Try with wrong secret - should panic
    dispatcher.complete_swap(swap_id, 'wrong_secret');
}

#[test]
fn test_get_empty_swap() {
    let (dispatcher, _owner) = deploy_contract();
    
    let swap = dispatcher.get_swap_details('nonexistent');
    assert(swap.status == SwapStatus::Empty, 'Should be empty');
}

#[test]
#[should_panic(expected: ('Swap already exists',))]
fn test_duplicate_swap_id() {
    let (dispatcher, _owner) = deploy_contract();
    
    let swap_id = 'swap_4';
    let recipient = contract_address_const::<0x456>();
    let secret = 'my_secret';
    let mut secret_array = array![secret];
    let hash_lock = poseidon_hash_span(secret_array.span());
    let time_lock = 2000_u64;
    let amount = 100_u256;
    
    // First initiation
    dispatcher.initiate_swap(
        swap_id,
        recipient,
        hash_lock,
        time_lock,
        amount
    );
    
    // Try to initiate again with same ID - should panic
    dispatcher.initiate_swap(
        swap_id,
        recipient,
        hash_lock,
        time_lock,
        amount
    );
}

#[test]
#[should_panic(expected: ('Time lock must be future',))]
fn test_invalid_time_lock() {
    let (dispatcher, _owner) = deploy_contract();
    
    let swap_id = 'swap_5';
    let recipient = contract_address_const::<0x456>();
    let secret = 'my_secret';
    let mut secret_array = array![secret];
    let hash_lock = poseidon_hash_span(secret_array.span());
    let time_lock = 0_u64; // Past time
    let amount = 100_u256;
    
    // Should panic - time lock in past
    dispatcher.initiate_swap(
        swap_id,
        recipient,
        hash_lock,
        time_lock,
        amount
    );
}
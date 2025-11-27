use starknet::ContractAddress;
use starknet::contract_address_const;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};
use ciphra_pay::bridge_connector::{IBridgeConnectorDispatcher, IBridgeConnectorDispatcherTrait, TransferStatus};

fn deploy_contract() -> (IBridgeConnectorDispatcher, ContractAddress) {
    let owner = contract_address_const::<0x123>();
    let contract = declare("BridgeConnector").unwrap().contract_class();
    let (contract_address, _) = contract.deploy(@array![owner.into()]).unwrap();
    
    (IBridgeConnectorDispatcher { contract_address }, owner)
}

#[test]
fn test_register_bridge() {
    let (dispatcher, _owner) = deploy_contract();
    
    let chain_id = 'near';
    let bridge_address = 'near_bridge_addr';
    
    dispatcher.register_bridge(chain_id, bridge_address);
    
    assert(dispatcher.is_bridge_registered(chain_id), 'Bridge not registered');
}

#[test]
fn test_bridge_not_registered_initially() {
    let (dispatcher, _owner) = deploy_contract();
    
    let chain_id = 'aztec';
    assert(!dispatcher.is_bridge_registered(chain_id), 'Should not be registered');
}

#[test]
fn test_lock_for_bridge() {
    let (dispatcher, _owner) = deploy_contract();
    
    // Register bridge first
    let chain_id = 'near';
    let bridge_address = 'near_bridge_addr';
    dispatcher.register_bridge(chain_id, bridge_address);
    
    // Lock tokens
    let transfer_id = 'transfer_1';
    let amount = 100_u256;
    let recipient = 'near_recipient';
    
    dispatcher.lock_for_bridge(
        transfer_id,
        amount,
        chain_id,
        recipient
    );
    
    let transfer = dispatcher.get_transfer_details(transfer_id);
    assert(transfer.amount == amount, 'Wrong amount');
    assert(transfer.status == TransferStatus::Locked, 'Not locked');
    assert(transfer.destination_chain == chain_id, 'Wrong chain');
    assert(transfer.recipient == recipient, 'Wrong recipient');
}

#[test]
#[should_panic(expected: ('Bridge not registered',))]
fn test_lock_unregistered_bridge() {
    let (dispatcher, _owner) = deploy_contract();
    
    // Try to lock without registering bridge - should panic
    let transfer_id = 'transfer_2';
    let amount = 100_u256;
    let chain_id = 'unregistered_chain';
    let recipient = 'recipient';
    
    dispatcher.lock_for_bridge(
        transfer_id,
        amount,
        chain_id,
        recipient
    );
}

#[test]
fn test_multiple_bridge_registrations() {
    let (dispatcher, _owner) = deploy_contract();
    
    // Register multiple bridges
    dispatcher.register_bridge('near', 'near_bridge');
    dispatcher.register_bridge('aztec', 'aztec_bridge');
    dispatcher.register_bridge('zcash', 'zcash_bridge');
    
    // Verify all registered
    assert(dispatcher.is_bridge_registered('near'), 'NEAR not registered');
    assert(dispatcher.is_bridge_registered('aztec'), 'Aztec not registered');
    assert(dispatcher.is_bridge_registered('zcash'), 'Zcash not registered');
}

#[test]
fn test_get_empty_transfer() {
    let (dispatcher, _owner) = deploy_contract();
    
    let transfer = dispatcher.get_transfer_details('nonexistent');
    assert(transfer.status == TransferStatus::Empty, 'Should be empty');
    assert(transfer.amount == 0_u256, 'Amount should be 0');
}
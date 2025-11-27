use starknet::ContractAddress;
use starknet::contract_address_const;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};
use ciphra_pay::p2p_transfer::{IP2PTransferDispatcher, IP2PTransferDispatcherTrait};

fn deploy_contract() -> (IP2PTransferDispatcher, ContractAddress) {
    let owner = contract_address_const::<0x123>();
    let contract = declare("P2PTransfer").unwrap().contract_class();
    let (contract_address, _) = contract.deploy(@array![owner.into()]).unwrap();
    
    (IP2PTransferDispatcher { contract_address }, owner)
}

#[test]
fn test_get_shielded_note_empty() {
    let (dispatcher, _owner) = deploy_contract();
    
    let note_id = 'note_1';
    let note = dispatcher.get_shielded_note(note_id);
    
    // Empty note should have note_id = 0
    assert(note.note_id == 0, 'Should be empty initially');
    assert(note.amount == 0_u256, 'Amount should be 0');
    assert(!note.spent, 'Should not be spent');
}

#[test]
fn test_nullifier_not_used_initially() {
    let (dispatcher, _owner) = deploy_contract();
    
    let nullifier = 'test_nullifier';
    let is_used = dispatcher.is_nullifier_used(nullifier);
    
    assert(!is_used, 'Nullifier should not be used');
}

#[test]
fn test_get_transfer_empty() {
    let (dispatcher, _owner) = deploy_contract();
    
    let transfer_id = 'transfer_1';
    let transfer = dispatcher.get_transfer(transfer_id);
    
    // Empty transfer should have transfer_id = 0
    assert(transfer.transfer_id == 0, 'Should be empty');
    assert(transfer.amount == 0_u256, 'Amount should be 0');
}

#[test]
fn test_multiple_nullifier_checks() {
    let (dispatcher, _owner) = deploy_contract();
    
    // Check multiple nullifiers
    assert(!dispatcher.is_nullifier_used('null_1'), 'Nullifier 1 used');
    assert(!dispatcher.is_nullifier_used('null_2'), 'Nullifier 2 used');
    assert(!dispatcher.is_nullifier_used('null_3'), 'Nullifier 3 used');
}

#[test]
fn test_get_multiple_notes() {
    let (dispatcher, _owner) = deploy_contract();
    
    // Check multiple non-existent notes
    let note1 = dispatcher.get_shielded_note('note_1');
    let note2 = dispatcher.get_shielded_note('note_2');
    let note3 = dispatcher.get_shielded_note('note_3');
    
    assert(note1.note_id == 0, 'Note 1 should be empty');
    assert(note2.note_id == 0, 'Note 2 should be empty');
    assert(note3.note_id == 0, 'Note 3 should be empty');
}

#[test]
fn test_get_multiple_transfers() {
    let (dispatcher, _owner) = deploy_contract();
    
    // Check multiple non-existent transfers
    let transfer1 = dispatcher.get_transfer('tx_1');
    let transfer2 = dispatcher.get_transfer('tx_2');
    
    assert(transfer1.transfer_id == 0, 'Transfer 1 should be empty');
    assert(transfer2.transfer_id == 0, 'Transfer 2 should be empty');
}
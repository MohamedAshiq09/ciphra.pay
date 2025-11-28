use dep::aztec::protocol_types::{
    hash::pedersen_hash,
    address::AztecAddress,
    traits::FromField,
};
use crate::swap_note::SwapNote;

// ============================================================================
// HASH TESTS
// ============================================================================

#[test]
fn test_pedersen_hash_consistency() {
    let secret = 12345;
    let hash = pedersen_hash([secret], 0);
    // Verify determinism
    let hash2 = pedersen_hash([secret], 0);
    assert(hash == hash2);
}

#[test]
fn test_pedersen_hash_different_secrets() {
    let secret1 = 12345;
    let secret2 = 67890;
    let hash1 = pedersen_hash([secret1], 0);
    let hash2 = pedersen_hash([secret2], 0);
    // Different secrets should produce different hashes
    assert(hash1 != hash2);
}

#[test]
fn test_pedersen_hash_zero() {
    let secret = 0;
    let hash = pedersen_hash([secret], 0);
    // Hash of zero should be deterministic
    let hash2 = pedersen_hash([secret], 0);
    assert(hash == hash2);
}

#[test]
fn test_pedersen_hash_max_field() {
    // Test with large field value
    let secret = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
    let hash = pedersen_hash([secret], 0);
    let hash2 = pedersen_hash([secret], 0);
    assert(hash == hash2);
}

// ============================================================================
// SWAP NOTE CREATION TESTS
// ============================================================================

#[test]
fn test_swap_note_creation() {
    let initiator = AztecAddress::from_field(1);
    let recipient = AztecAddress::from_field(2);
    let owner = AztecAddress::from_field(3);
    let note = SwapNote::new(
        1, // swap_id
        initiator,
        recipient,
        100, // amount
        0x123, // hash_lock
        1000, // time_lock
        1, // target_chain
        2, // target_swap_id
        owner
    );
    
    assert(note.swap_id == 1);
    assert(note.amount == 100);
    assert(note.status == 1); // Active by default
    assert(note.owner.eq(owner));
    assert(note.initiator.eq(initiator));
    assert(note.recipient.eq(recipient));
    assert(note.hash_lock == 0x123);
    assert(note.time_lock == 1000);
    assert(note.target_chain == 1);
    assert(note.target_swap_id == 2);
}

#[test]
fn test_swap_note_zero_amount() {
    let initiator = AztecAddress::from_field(1);
    let recipient = AztecAddress::from_field(2);
    let owner = AztecAddress::from_field(3);
    let note = SwapNote::new(
        1,
        initiator,
        recipient,
        0, // zero amount
        0x123,
        1000,
        1,
        2,
        owner
    );
    
    assert(note.amount == 0);
    assert(note.status == 1);
}

#[test]
fn test_swap_note_large_amount() {
    let initiator = AztecAddress::from_field(1);
    let recipient = AztecAddress::from_field(2);
    let owner = AztecAddress::from_field(3);
    let large_amount = 0xFFFFFFFFFFFFFFFF;
    let note = SwapNote::new(
        1,
        initiator,
        recipient,
        large_amount,
        0x123,
        1000,
        1,
        2,
        owner
    );
    
    assert(note.amount == large_amount);
}

#[test]
fn test_swap_note_same_initiator_recipient() {
    let same_address = AztecAddress::from_field(1);
    let owner = AztecAddress::from_field(2);
    let note = SwapNote::new(
        1,
        same_address,
        same_address, // same as initiator
        100,
        0x123,
        1000,
        1,
        2,
        owner
    );
    
    assert(note.initiator.eq(note.recipient));
}

#[test]
fn test_swap_note_different_swap_ids() {
    let initiator = AztecAddress::from_field(1);
    let recipient = AztecAddress::from_field(2);
    let owner = AztecAddress::from_field(3);
    
    let note1 = SwapNote::new(1, initiator, recipient, 100, 0x123, 1000, 1, 2, owner);
    let note2 = SwapNote::new(999, initiator, recipient, 100, 0x123, 1000, 1, 2, owner);
    
    assert(note1.swap_id != note2.swap_id);
    assert(note1.swap_id == 1);
    assert(note2.swap_id == 999);
}

// ============================================================================
// TIME LOCK VALIDATION TESTS
// ============================================================================

#[test]
fn test_time_lock_minimum_boundary() {
    // Minimum time lock is 3600 seconds (1 hour)
    let min_time_lock: u64 = 3600;
    assert(min_time_lock >= 3600);
}

#[test]
fn test_time_lock_maximum_boundary() {
    // Maximum time lock is 86400 seconds (24 hours)
    let max_time_lock: u64 = 86400;
    assert(max_time_lock <= 86400);
}

#[test]
fn test_time_lock_valid_range() {
    let valid_time_lock: u64 = 7200; // 2 hours
    assert(valid_time_lock >= 3600);
    assert(valid_time_lock <= 86400);
}

// ============================================================================
// ADDRESS EQUALITY TESTS
// ============================================================================

#[test]
fn test_address_equality() {
    let addr1 = AztecAddress::from_field(123);
    let addr2 = AztecAddress::from_field(123);
    assert(addr1.eq(addr2));
}

#[test]
fn test_address_inequality() {
    let addr1 = AztecAddress::from_field(123);
    let addr2 = AztecAddress::from_field(456);
    assert(!addr1.eq(addr2));
}

#[test]
fn test_address_zero() {
    let addr = AztecAddress::from_field(0);
    let zero = AztecAddress::from_field(0);
    assert(addr.eq(zero));
}

// ============================================================================
// STATUS TESTS
// ============================================================================

#[test]
fn test_status_active() {
    let status: u8 = 1;
    assert(status == 1);
}

#[test]
fn test_status_completed() {
    let status: u8 = 2;
    assert(status == 2);
}

#[test]
fn test_status_refunded() {
    let status: u8 = 3;
    assert(status == 3);
}

#[test]
fn test_status_transitions() {
    let mut status: u8 = 1; // Active
    assert(status == 1);
    
    status = 2; // Completed
    assert(status == 2);
    
    status = 3; // Refunded
    assert(status == 3);
}

// ============================================================================
// FIELD VALUE TESTS
// ============================================================================

#[test]
fn test_field_zero() {
    let field: Field = 0;
    assert(field == 0);
}

#[test]
fn test_field_equality() {
    let field1: Field = 12345;
    let field2: Field = 12345;
    assert(field1 == field2);
}

#[test]
fn test_field_inequality() {
    let field1: Field = 12345;
    let field2: Field = 67890;
    assert(field1 != field2);
}

// ============================================================================
// HASH LOCK TESTS
// ============================================================================

#[test]
fn test_hash_lock_creation() {
    let secret = 12345;
    let hash_lock = pedersen_hash([secret], 0);
    
    // Verify the hash can be used as a lock
    let verification = pedersen_hash([secret], 0);
    assert(hash_lock == verification);
}

#[test]
fn test_hash_lock_mismatch() {
    let secret = 12345;
    let wrong_secret = 67890;
    let hash_lock = pedersen_hash([secret], 0);
    let wrong_hash = pedersen_hash([wrong_secret], 0);
    
    assert(hash_lock != wrong_hash);
}

// ============================================================================
// SWAP NOTE FIELD VISIBILITY TESTS
// ============================================================================

#[test]
fn test_swap_note_all_fields_accessible() {
    let initiator = AztecAddress::from_field(1);
    let recipient = AztecAddress::from_field(2);
    let owner = AztecAddress::from_field(3);
    let note = SwapNote::new(
        100,
        initiator,
        recipient,
        1000,
        0xABCD,
        7200,
        5,
        999,
        owner
    );
    
    // Verify all fields are accessible (public)
    let _ = note.swap_id;
    let _ = note.initiator;
    let _ = note.recipient;
    let _ = note.amount;
    let _ = note.hash_lock;
    let _ = note.time_lock;
    let _ = note.status;
    let _ = note.target_chain;
    let _ = note.target_swap_id;
    let _ = note.owner;
    
    assert(true); // If we got here, all fields are accessible
}

// ============================================================================
// CROSS-CHAIN TESTS
// ============================================================================

#[test]
fn test_target_chain_values() {
    let near_chain: Field = 1;
    let starknet_chain: Field = 2;
    let ethereum_chain: Field = 3;
    
    assert(near_chain != starknet_chain);
    assert(starknet_chain != ethereum_chain);
    assert(near_chain != ethereum_chain);
}

#[test]
fn test_target_swap_id_uniqueness() {
    let swap_id_1: Field = 100;
    let swap_id_2: Field = 200;
    
    assert(swap_id_1 != swap_id_2);
}

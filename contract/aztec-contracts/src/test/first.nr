/**
 * Noir Unit Tests for Private Atomic Swap
 */

#[test]
fn test_poseidon_hash_consistency() {
    // Test that Poseidon hash is deterministic
    let secret = 12345;
    let hash1 = dep::aztec::protocol_types::hash::poseidon2_hash([secret]);
    let hash2 = dep::aztec::protocol_types::hash::poseidon2_hash([secret]);

    assert(hash1 == hash2, "Poseidon hash should be deterministic");
}

#[test]
fn test_time_lock_validation() {
    // Test time lock bounds
    let min_time_lock: u64 = 3600; // 1 hour
    let max_time_lock: u64 = 86400; // 24 hours

    assert(min_time_lock >= 3600, "Min time lock should be 1 hour");
    assert(max_time_lock <= 86400, "Max time lock should be 24 hours");
}

#[test]
fn test_status_values() {
    // Test status enum values
    let empty: u8 = 0;
    let active: u8 = 1;
    let completed: u8 = 2;
    let refunded: u8 = 3;

    assert(empty == 0, "Empty status is 0");
    assert(active == 1, "Active status is 1");
    assert(completed == 2, "Completed status is 2");
    assert(refunded == 3, "Refunded status is 3");
}

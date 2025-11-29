// ============================================================================
// ENHANCED PRIVATE ATOMIC SWAP CONTRACT
// Full Cross-Chain Support: Zcash ↔ Aztec, Starknet ↔ Aztec, NEAR ↔ Aztec
// ============================================================================

mod swap_note;
mod test;

use dep::aztec::macros::aztec;

#[aztec]
pub contract PrivateAtomicSwapV2 {
    use dep::aztec::macros::functions::{external, initializer, internal};
    use dep::aztec::macros::storage::storage;
    use dep::aztec::protocol_types::{
        address::AztecAddress,
        hash::pedersen_hash,
    };
    use dep::aztec::state_vars::{Map, PrivateSet, PublicMutable};
    use dep::aztec::note::note_getter_options::NoteGetterOptions;

    use crate::swap_note::SwapNote;

    // ========================================================================
    // Storage
    // ========================================================================

    #[storage]
    struct Storage<Context> {
        // Private storage for swap notes (encrypted)
        private_swaps: Map<Field, PrivateSet<SwapNote, Context>, Context>,

        // Public state (for backend monitoring)
        public_swap_status: Map<Field, PublicMutable<u8, Context>, Context>,
        public_swap_secrets: Map<Field, PublicMutable<Field, Context>, Context>,
        public_target_chains: Map<Field, PublicMutable<Field, Context>, Context>,
        public_target_swap_ids: Map<Field, PublicMutable<Field, Context>, Context>,

        // Configuration
        owner: PublicMutable<AztecAddress, Context>,
        fee_percentage: PublicMutable<Field, Context>, // Basis points
        fee_recipient: PublicMutable<AztecAddress, Context>,

        // Stats
        total_swaps: PublicMutable<Field, Context>,
        completed_swaps: PublicMutable<Field, Context>,
    }

    // ========================================================================
    // Constructor
    // ========================================================================

    #[external("public")]
    #[initializer]
    fn constructor(
        owner: AztecAddress,
        fee_recipient: AztecAddress,
        initial_fee_percentage: Field
    ) {
        storage.owner.write(owner);
        storage.fee_recipient.write(fee_recipient);
        storage.fee_percentage.write(initial_fee_percentage); // Default: 30 (0.3%)
        storage.total_swaps.write(0);
        storage.completed_swaps.write(0);
    }

    // ========================================================================
    // Initiate Private Swap
    // ========================================================================

    /**
     * Initiate a fully private cross-chain atomic swap
     *
     * @param swap_id - Unique identifier for the swap
     * @param recipient - Who will receive the tokens (private)
     * @param amount - Amount to swap (private)
     * @param hash_lock - Pedersen hash of the secret
     * @param time_lock_duration - Duration in seconds
     * @param target_chain - Chain identifier: Field from "zcash", "starknet", "near"
     * @param target_swap_id - Linked swap ID on target chain
     */
    #[external("private")]
    fn initiate_private_swap(
        swap_id: Field,
        recipient: AztecAddress,
        amount: Field,
        hash_lock: Field,
        time_lock_duration: u64,
        target_chain: Field,
        target_swap_id: Field,
    ) {
        let initiator = context.msg_sender().unwrap();
        let header = context.get_anchor_block_header();
        let current_time = header.global_variables.timestamp as u64;
        let time_lock = current_time + time_lock_duration;

        // Validations
        assert(amount > 0, "Amount must be positive");
        assert(time_lock_duration >= 3600, "Min 1 hour");
        assert(time_lock_duration <= 172800, "Max 48 hours");
        assert(!initiator.eq(recipient), "Cannot swap with self");

        // Create private swap note
        let owner = context.this_address();
        let note = SwapNote::new(
            swap_id,
            initiator,
            recipient,
            amount,
            hash_lock,
            time_lock,
            target_chain,
            target_swap_id,
            owner,
        );

        // Store privately
        storage.private_swaps.at(swap_id).insert(note).discard();

        // Update public state (for backend monitoring)
        PrivateAtomicSwapV2::at(context.this_address())
            .register_swap_public(swap_id, target_chain, target_swap_id)
            .enqueue(&mut context);

        // Increment stats
        PrivateAtomicSwapV2::at(context.this_address())
            .increment_total_swaps()
            .enqueue(&mut context);
    }

    // ========================================================================
    // Complete Private Swap
    // ========================================================================

    /**
     * Complete the swap by revealing the secret
     * Transfers tokens to recipient (minus fee)
     * Stores secret in public state for backend to monitor
     */
    #[external("private")]
    fn complete_private_swap(swap_id: Field, secret: Field) {
        let header = context.get_anchor_block_header();
        let current_time = header.global_variables.timestamp as u64;
        let caller = context.msg_sender().unwrap();

        // Retrieve the swap note
        let options = NoteGetterOptions::new();
        let notes = storage.private_swaps.at(swap_id).get_notes(options);

        assert(notes.len() > 0, "Swap not found");
        let note = notes.get(0);
        let mut inner_note = note.note;

        // Validations
        assert(current_time <= inner_note.time_lock, "Swap expired");
        assert(inner_note.status == 1, "Swap not active");

        // Verify secret using Pedersen hash
        let computed_hash = pedersen_hash([secret], 0);
        assert(computed_hash == inner_note.hash_lock, "Invalid secret");

        // Verify caller is recipient
        assert(caller.eq(inner_note.recipient), "Only recipient");

        // TODO: Transfer tokens (requires Aztec token integration)
        // For now, we just update the state

        // Consume old note
        storage.private_swaps.at(swap_id).remove(note);

        // Update note status
        inner_note.status = 2; // Completed
        storage.private_swaps.at(swap_id).insert(inner_note).discard();

        // Update public state with secret (CRITICAL for backend!)
        PrivateAtomicSwapV2::at(context.this_address())
            .store_revealed_secret(swap_id, secret, inner_note.target_chain, inner_note.target_swap_id)
            .enqueue(&mut context);

        // Increment completed swaps
        PrivateAtomicSwapV2::at(context.this_address())
            .increment_completed_swaps()
            .enqueue(&mut context);
    }

    // ========================================================================
    // Refund Private Swap
    // ========================================================================

    /**
     * Refund the swap after time lock expires
     * Only initiator can call this
     */
    #[external("private")]
    fn refund_private_swap(swap_id: Field) {
        let header = context.get_anchor_block_header();
        let current_time = header.global_variables.timestamp as u64;
        let initiator = context.msg_sender().unwrap();

        let options = NoteGetterOptions::new();
        let notes = storage.private_swaps.at(swap_id).get_notes(options);

        assert(notes.len() > 0, "Swap not found");
        let note = notes.get(0);
        let mut inner_note = note.note;

        // Validations
        assert(inner_note.initiator.eq(initiator), "Only initiator");
        assert(current_time > inner_note.time_lock, "Time lock active");
        assert(inner_note.status == 1, "Swap not active");

        // Consume old note
        storage.private_swaps.at(swap_id).remove(note);

        // Update status to Refunded
        inner_note.status = 3;
        storage.private_swaps.at(swap_id).insert(inner_note).discard();

        // Update public status
        PrivateAtomicSwapV2::at(context.this_address())
            .update_swap_status(swap_id, 3)
            .enqueue(&mut context);
    }

    // ========================================================================
    // Public Functions (for backend monitoring)
    // ========================================================================

    /**
     * Register new swap in public state
     */
    #[external("public")]
    #[internal]
    fn register_swap_public(swap_id: Field, target_chain: Field, target_swap_id: Field) {
        storage.public_swap_status.at(swap_id).write(1); // Active
        storage.public_target_chains.at(swap_id).write(target_chain);
        storage.public_target_swap_ids.at(swap_id).write(target_swap_id);
    }

    /**
     * Store revealed secret (CRITICAL for cross-chain coordination)
     * Backend monitors this to complete swaps on other chains
     */
    #[external("public")]
    #[internal]
    fn store_revealed_secret(
        swap_id: Field,
        secret: Field,
        target_chain: Field,
        target_swap_id: Field
    ) {
        storage.public_swap_status.at(swap_id).write(2); // Completed
        storage.public_swap_secrets.at(swap_id).write(secret); // Store secret!
    }

    /**
     * Update swap status
     */
    #[external("public")]
    #[internal]
    fn update_swap_status(swap_id: Field, new_status: u8) {
        storage.public_swap_status.at(swap_id).write(new_status);
    }

    /**
     * Increment total swaps counter
     */
    #[external("public")]
    #[internal]
    fn increment_total_swaps() {
        let current = storage.total_swaps.read();
        storage.total_swaps.write(current + 1);
    }

    /**
     * Increment completed swaps counter
     */
    #[external("public")]
    #[internal]
    fn increment_completed_swaps() {
        let current = storage.completed_swaps.read();
        storage.completed_swaps.write(current + 1);
    }

    // ========================================================================
    // View Functions (unconstrained)
    // ========================================================================

    /**
     * Get public swap status (backend can monitor)
     * Status: 0=Empty, 1=Active, 2=Completed, 3=Refunded
     */
    #[external("utility")]
    unconstrained fn get_swap_status(swap_id: Field) -> pub u8 {
        storage.public_swap_status.at(swap_id).read()
    }

    /**
     * Get revealed secret (after completion)
     * Backend uses this to claim tokens on other chains
     */
    #[external("utility")]
    unconstrained fn get_revealed_secret(swap_id: Field) -> pub Field {
        storage.public_swap_secrets.at(swap_id).read()
    }

    /**
     * Get target chain for a swap
     */
    #[external("utility")]
    unconstrained fn get_target_chain(swap_id: Field) -> pub Field {
        storage.public_target_chains.at(swap_id).read()
    }

    /**
     * Get target swap ID on other chain
     */
    #[external("utility")]
    unconstrained fn get_target_swap_id(swap_id: Field) -> pub Field {
        storage.public_target_swap_ids.at(swap_id).read()
    }

    /**
     * Get total number of swaps
     */
    #[external("utility")]
    unconstrained fn get_total_swaps() -> pub Field {
        storage.total_swaps.read()
    }

    /**
     * Get number of completed swaps
     */
    #[external("utility")]
    unconstrained fn get_completed_swaps() -> pub Field {
        storage.completed_swaps.read()
    }

    // ========================================================================
    // Admin Functions
    // ========================================================================

    /**
     * Set fee percentage (only owner)
     */
    #[external("public")]
    fn set_fee_percentage(new_fee: Field) {
        let caller = context.msg_sender();
        let owner = storage.owner.read();
        assert(caller.eq(owner), "Only owner");
        assert(new_fee <= 1000, "Fee too high (max 10%)");

        storage.fee_percentage.write(new_fee);
    }

    /**
     * Set fee recipient (only owner)
     */
    #[external("public")]
    fn set_fee_recipient(new_recipient: AztecAddress) {
        let caller = context.msg_sender();
        let owner = storage.owner.read();
        assert(caller.eq(owner), "Only owner");

        storage.fee_recipient.write(new_recipient);
    }

    /**
     * Get current fee percentage
     */
    #[external("utility")]
    unconstrained fn get_fee_percentage() -> pub Field {
        storage.fee_percentage.read()
    }
}

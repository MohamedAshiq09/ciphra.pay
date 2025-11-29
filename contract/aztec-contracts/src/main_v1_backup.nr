mod swap_note;
mod test;

use dep::aztec::macros::aztec;

#[aztec]
pub contract PrivateAtomicSwap {
    use dep::aztec::macros::functions::{external, initializer, internal};
    use dep::aztec::macros::storage::storage;
    use dep::aztec::protocol_types::{
        address::AztecAddress,
        hash::pedersen_hash,
    };
    use dep::aztec::state_vars::{Map, PrivateSet, PublicMutable};
    use dep::aztec::note::note_getter_options::NoteGetterOptions;
    
    use crate::swap_note::SwapNote;

    #[storage]
    struct Storage<Context> {
        // Private storage for swap notes
        private_swaps: Map<Field, PrivateSet<SwapNote, Context>, Context>,

        // Public commitments for backend monitoring
        public_swap_commitments: Map<Field, PublicMutable<Field, Context>, Context>,
        
        // Public status tracking
        public_swap_status: Map<Field, PublicMutable<u8, Context>, Context>,
        
        owner: PublicMutable<AztecAddress, Context>,
    }

    #[external("public")]
    #[initializer]
    fn constructor(owner: AztecAddress) {
        storage.owner.write(owner);
    }

    /**
     * Initiate a private swap
     */
    #[external("private")]
    fn initiate_private_swap(
        swap_id: Field,
        recipient: AztecAddress,
        amount: Field,
        token_address: AztecAddress,
        hash_lock: Field,
        time_lock_duration: u64,
        target_chain: Field,
        target_swap_id: Field,
    ) {
        let initiator = context.msg_sender().unwrap();
        // Access timestamp from anchor block header
        let header = context.get_anchor_block_header();
        let current_time = header.global_variables.timestamp as u64;
        let time_lock = current_time + time_lock_duration;

        // Validate
        assert(time_lock_duration >= 3600, "Min 1 hour");
        assert(time_lock_duration <= 86400, "Max 24 hours");

        // Create new SwapNote
        // Set owner to this contract so it can manage the note (Escrow pattern)
        let owner = context.this_address();

        let note = SwapNote::new(
            swap_id,
            initiator,
            recipient,
            amount,
            token_address,
            hash_lock,
            time_lock,
            target_chain,
            target_swap_id,
            owner,
        );

        // Insert note into private storage and discard emission (since it's internal/escrowed)
        storage.private_swaps.at(swap_id).insert(note).discard();

        // Update public state
        PrivateAtomicSwap::at(context.this_address())
            .register_swap_commitment_internal(swap_id)
            .enqueue(&mut context);
    }

    /**
     * Complete a private swap by revealing secret
     */
    #[external("private")]
    fn complete_private_swap(swap_id: Field, secret: Field) {
        let header = context.get_anchor_block_header();
        let current_time = header.global_variables.timestamp as u64;

        // Retrieve the note
        let options = NoteGetterOptions::new();
        let notes = storage.private_swaps.at(swap_id).get_notes(options);
        
        // Get the first note (RetrievedNote)
        let note = notes.get(0);
        let mut inner_note = note.note;
        
        // Verify time lock
        assert(current_time <= inner_note.time_lock, "Swap expired");

        // Verify secret using Pedersen hash
        let computed_hash = pedersen_hash([secret], 0);
        assert(computed_hash == inner_note.hash_lock, "Invalid secret");

        // Verify caller is recipient
        let sender = context.msg_sender().unwrap();
        assert(sender.eq(inner_note.recipient), "Only recipient");

        // Verify status
        assert(inner_note.status == 1, "Swap not active");

        // Consume old note
        storage.private_swaps.at(swap_id).remove(note);

        // Create updated note
        inner_note.status = 2; // Completed
        storage.private_swaps.at(swap_id).insert(inner_note).discard();

        // Update public status
        PrivateAtomicSwap::at(context.this_address())
            .update_swap_status_internal(swap_id, 2)
            .enqueue(&mut context);
    }

    /**
     * Refund private swap
     */
    #[external("private")]
    fn refund_private_swap(swap_id: Field) {
        let header = context.get_anchor_block_header();
        let current_time = header.global_variables.timestamp as u64;
        let initiator = context.msg_sender().unwrap();

        let options = NoteGetterOptions::new();
        let notes = storage.private_swaps.at(swap_id).get_notes(options);
        let note = notes.get(0);
        let mut inner_note = note.note;

        // Verify initiator
        assert(inner_note.initiator.eq(initiator), "Only initiator");

        // Verify time lock
        assert(current_time > inner_note.time_lock, "Time lock active");

        // Verify status
        assert(inner_note.status == 1, "Swap not active");

        // Consume old note
        storage.private_swaps.at(swap_id).remove(note);

        // Update status to Refunded
        inner_note.status = 3;
        storage.private_swaps.at(swap_id).insert(inner_note).discard();

        // Update public status
        PrivateAtomicSwap::at(context.this_address())
            .update_swap_status_internal(swap_id, 3)
            .enqueue(&mut context);
    }

    /**
     * Internal public function to register commitment
     */
    #[external("public")]
    #[internal]
    fn register_swap_commitment_internal(swap_id: Field) {
        storage.public_swap_status.at(swap_id).write(1); // Active
    }

    /**
     * Internal public function to update status
     */
    #[external("public")]
    #[internal]
    fn update_swap_status_internal(swap_id: Field, new_status: u8) {
        storage.public_swap_status.at(swap_id).write(new_status);
    }

    #[external("utility")]
    unconstrained fn get_swap_status(swap_id: Field) -> pub u8 {
        storage.public_swap_status.at(swap_id).read()
    }
}

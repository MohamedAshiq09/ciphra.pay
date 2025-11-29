use dep::aztec::macros::notes::note;
use dep::aztec::protocol_types::{
    address::AztecAddress,
    traits::{Deserialize, Packable, Serialize},
};

#[derive(Deserialize, Eq, Packable, Serialize)]
#[note]
pub struct SwapNote {
    pub swap_id: Field,
    pub initiator: AztecAddress,
    pub recipient: AztecAddress,
    pub amount: Field,
    pub token_address: AztecAddress, // Token contract address
    pub hash_lock: Field,
    pub time_lock: u64,
    pub status: u8, // 1=Active, 2=Completed, 3=Refunded
    pub target_chain: Field,
    pub target_swap_id: Field,
    pub owner: AztecAddress,
}

impl SwapNote {
    pub fn new(
        swap_id: Field,
        initiator: AztecAddress,
        recipient: AztecAddress,
        amount: Field,
        token_address: AztecAddress,
        hash_lock: Field,
        time_lock: u64,
        target_chain: Field,
        target_swap_id: Field,
        owner: AztecAddress,
    ) -> Self {
        SwapNote {
            swap_id,
            initiator,
            recipient,
            amount,
            token_address,
            hash_lock,
            time_lock,
            status: 1, // Active by default
            target_chain,
            target_swap_id,
            owner,
        }
    }
}

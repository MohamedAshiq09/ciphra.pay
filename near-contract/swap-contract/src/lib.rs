use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LookupMap, UnorderedMap};
use near_sdk::json_types::U128;
use near_sdk::{env, near_bindgen, AccountId, Balance, BorshStorageKey, PanicOnDefault, Promise};
use near_sdk::serde::{Deserialize, Serialize};

#[derive(BorshSerialize, BorshStorageKey)]
pub enum StorageKey {
    Swaps,
    SwapsByInitiator,
    SwapsByParticipant,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub enum SwapStatus {
    Initiated,
    Locked,
    Completed,
    Refunded,
    Cancelled,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct AtomicSwap {
    pub swap_id: String,
    pub initiator: AccountId,
    pub participant: AccountId,
    pub amount: Balance,
    pub hash_lock: String,           // Hash of the secret
    pub time_lock: u64,              // Timestamp when refund becomes available
    pub status: SwapStatus,
    pub secret: Option<String>,      // Revealed secret for completion
    pub target_chain: String,        // e.g., "starknet", "aztec"
    pub target_address: String,      // Address on target chain
    pub created_at: u64,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct SwapContract {
    pub swaps: UnorderedMap<String, AtomicSwap>,
    pub swaps_by_initiator: LookupMap<AccountId, Vec<String>>,
    pub swaps_by_participant: LookupMap<AccountId, Vec<String>>,
    pub owner: AccountId,
    pub fee_percentage: u16,         // Fee in basis points (100 = 1%)
    pub min_time_lock: u64,          // Minimum timelock duration in seconds
    pub max_time_lock: u64,          // Maximum timelock duration in seconds
}

#[near_bindgen]
impl SwapContract {
    #[init]
    pub fn new(owner: AccountId) -> Self {
        Self {
            swaps: UnorderedMap::new(StorageKey::Swaps),
            swaps_by_initiator: LookupMap::new(StorageKey::SwapsByInitiator),
            swaps_by_participant: LookupMap::new(StorageKey::SwapsByParticipant),
            owner,
            fee_percentage: 30,      // 0.3% default fee
            min_time_lock: 3600,     // 1 hour minimum
            max_time_lock: 86400,    // 24 hours maximum
        }
    }

    // ========== SWAP INITIATION ==========
    
    #[payable]
    pub fn initiate_swap(
        &mut self,
        swap_id: String,
        participant: AccountId,
        hash_lock: String,
        time_lock_duration: u64,
        target_chain: String,
        target_address: String,
    ) -> AtomicSwap {
        let initiator = env::predecessor_account_id();
        let amount = env::attached_deposit();
        
        // Validations
        assert!(amount > 0, "Must attach NEAR tokens");
        assert!(self.swaps.get(&swap_id).is_none(), "Swap ID already exists");
        assert!(
            time_lock_duration >= self.min_time_lock && time_lock_duration <= self.max_time_lock,
            "Time lock duration out of bounds"
        );
        assert!(hash_lock.len() == 64, "Hash lock must be 64 characters (32 bytes hex)");
        
        let time_lock = env::block_timestamp() + (time_lock_duration * 1_000_000_000);
        
        let swap = AtomicSwap {
            swap_id: swap_id.clone(),
            initiator: initiator.clone(),
            participant: participant.clone(),
            amount,
            hash_lock,
            time_lock,
            status: SwapStatus::Initiated,
            secret: None,
            target_chain,
            target_address,
            created_at: env::block_timestamp(),
        };
        
        self.swaps.insert(&swap_id, &swap);
        self.add_swap_to_initiator(&initiator, &swap_id);
        self.add_swap_to_participant(&participant, &swap_id);
        
        env::log_str(&format!("Swap initiated: {}", swap_id));
        
        swap
    }

    // ========== SWAP LOCKING (Participant locks their side) ==========
    
    pub fn lock_swap(&mut self, swap_id: String) {
        let mut swap = self.swaps.get(&swap_id).expect("Swap not found");
        
        assert_eq!(
            env::predecessor_account_id(),
            swap.participant,
            "Only participant can lock"
        );
        assert!(
            matches!(swap.status, SwapStatus::Initiated),
            "Swap must be in Initiated status"
        );
        assert!(
            env::block_timestamp() < swap.time_lock,
            "Swap has expired"
        );
        
        swap.status = SwapStatus::Locked;
        self.swaps.insert(&swap_id, &swap);
        
        env::log_str(&format!("Swap locked: {}", swap_id));
    }

    // ========== SWAP COMPLETION ==========
    
    pub fn complete_swap(&mut self, swap_id: String, secret: String) -> Promise {
        let mut swap = self.swaps.get(&swap_id).expect("Swap not found");
        
        // Verify secret matches hash lock
        let secret_hash = self.hash_secret(&secret);
        assert_eq!(secret_hash, swap.hash_lock, "Invalid secret");
        
        assert!(
            matches!(swap.status, SwapStatus::Locked),
            "Swap must be locked"
        );
        assert!(
            env::block_timestamp() < swap.time_lock,
            "Swap has expired"
        );
        
        swap.secret = Some(secret.clone());
        swap.status = SwapStatus::Completed;
        self.swaps.insert(&swap_id, &swap);
        
        // Calculate fee
        let fee = (swap.amount * self.fee_percentage as u128) / 10000;
        let payout = swap.amount - fee;
        
        env::log_str(&format!(
            "Swap completed: {} | Secret revealed: {} | Payout: {}",
            swap_id, secret, payout
        ));
        
        // Transfer funds to participant (minus fee)
        Promise::new(swap.participant.clone()).transfer(payout)
    }

    // ========== REFUND (After timelock expires) ==========
    
    pub fn refund_swap(&mut self, swap_id: String) -> Promise {
        let mut swap = self.swaps.get(&swap_id).expect("Swap not found");
        
        assert_eq!(
            env::predecessor_account_id(),
            swap.initiator,
            "Only initiator can refund"
        );
        assert!(
            !matches!(swap.status, SwapStatus::Completed | SwapStatus::Refunded),
            "Cannot refund completed or already refunded swap"
        );
        assert!(
            env::block_timestamp() >= swap.time_lock,
            "Time lock has not expired yet"
        );
        
        swap.status = SwapStatus::Refunded;
        self.swaps.insert(&swap_id, &swap);
        
        env::log_str(&format!("Swap refunded: {}", swap_id));
        
        // Refund to initiator
        Promise::new(swap.initiator.clone()).transfer(swap.amount)
    }

    // ========== QUERY FUNCTIONS ==========
    
    pub fn get_swap(&self, swap_id: String) -> Option<AtomicSwap> {
        self.swaps.get(&swap_id)
    }
    
    pub fn get_swaps_by_initiator(&self, account_id: AccountId) -> Vec<AtomicSwap> {
        self.swaps_by_initiator
            .get(&account_id)
            .unwrap_or_default()
            .iter()
            .filter_map(|swap_id| self.swaps.get(swap_id))
            .collect()
    }
    
    pub fn get_swaps_by_participant(&self, account_id: AccountId) -> Vec<AtomicSwap> {
        self.swaps_by_participant
            .get(&account_id)
            .unwrap_or_default()
            .iter()
            .filter_map(|swap_id| self.swaps.get(swap_id))
            .collect()
    }

    // ========== ADMIN FUNCTIONS ==========
    
    pub fn set_fee_percentage(&mut self, fee_percentage: u16) {
        assert_eq!(env::predecessor_account_id(), self.owner, "Only owner");
        assert!(fee_percentage <= 1000, "Fee cannot exceed 10%");
        self.fee_percentage = fee_percentage;
    }

    // ========== HELPER FUNCTIONS ==========
    
    fn hash_secret(&self, secret: &str) -> String {
        let hash = env::sha256(secret.as_bytes());
        hex::encode(hash)
    }
    
    fn add_swap_to_initiator(&mut self, initiator: &AccountId, swap_id: &str) {
        let mut swaps = self.swaps_by_initiator.get(initiator).unwrap_or_default();
        swaps.push(swap_id.to_string());
        self.swaps_by_initiator.insert(initiator, &swaps);
    }
    
    fn add_swap_to_participant(&mut self, participant: &AccountId, swap_id: &str) {
        let mut swaps = self.swaps_by_participant.get(participant).unwrap_or_default();
        swaps.push(swap_id.to_string());
        self.swaps_by_participant.insert(participant, &swaps);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::{testing_env, VMContext};

    fn get_context(predecessor: AccountId) -> VMContext {
        VMContextBuilder::new()
            .predecessor_account_id(predecessor)
            .block_timestamp(1_000_000_000)
            .build()
    }

    #[test]
    fn test_initiate_swap() {
        let context = get_context(accounts(0));
        testing_env!(context);
        
        let mut contract = SwapContract::new(accounts(0));
        
        // This would need proper testing setup with attached_deposit
        // Just showing structure
    }
}
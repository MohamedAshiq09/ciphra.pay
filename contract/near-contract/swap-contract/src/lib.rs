use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LookupMap, UnorderedMap};
use near_sdk::json_types::U128;
use near_sdk::{env, near_bindgen, AccountId, BorshStorageKey, PanicOnDefault, Promise, NearToken};
use near_sdk::serde::{Deserialize, Serialize};
use schemars::JsonSchema;

#[derive(BorshSerialize, BorshStorageKey)]
pub enum StorageKey {
    Swaps,
    SwapsByInitiator,
    SwapsByParticipant,
    OracleVerifications,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, JsonSchema, PartialEq, Debug)]
#[serde(crate = "near_sdk::serde")]
pub enum HashAlgorithm {
    SHA256,
    Poseidon,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub enum SwapStatus {
    Initiated,
    Locked,
    Completed,
    Refunded,
    Cancelled,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct AtomicSwap {
    pub swap_id: String,
    pub initiator: String,
    pub participant: String,
    pub amount: String,
    pub hash_lock: String,
    pub hash_algorithm: HashAlgorithm,
    pub time_lock: u64,
    pub status: SwapStatus,
    pub secret: Option<String>,
    pub target_chain: String,
    pub target_address: String,
    pub counterparty_swap_id: Option<String>,
    pub created_at: u64,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct PoseidonVerification {
    pub swap_id: String,
    pub poseidon_hash: String,
    pub verified: bool,
    pub verified_at: Option<u64>,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct SwapContract {
    pub swaps: UnorderedMap<String, AtomicSwap>,
    pub swaps_by_initiator: LookupMap<AccountId, Vec<String>>,
    pub swaps_by_participant: LookupMap<AccountId, Vec<String>>,
    pub oracle_verifications: UnorderedMap<String, PoseidonVerification>,
    pub owner: AccountId,
    pub oracle_account: AccountId,
    pub fee_recipient: AccountId,
    pub fee_percentage: u16,
    pub min_time_lock: u64,
    pub max_time_lock: u64,
}

#[near_bindgen]
impl SwapContract {
    #[init]
    pub fn new(owner: AccountId, oracle_account: AccountId) -> Self {
        let fee_recipient = owner.clone();
        Self {
            swaps: UnorderedMap::new(StorageKey::Swaps),
            swaps_by_initiator: LookupMap::new(StorageKey::SwapsByInitiator),
            swaps_by_participant: LookupMap::new(StorageKey::SwapsByParticipant),
            oracle_verifications: UnorderedMap::new(StorageKey::OracleVerifications),
            owner,
            oracle_account,
            fee_recipient,
            fee_percentage: 30, // 0.3% default
            min_time_lock: 3600,
            max_time_lock: 86400,
        }
    }

    #[payable]
    pub fn initiate_swap(
        &mut self,
        swap_id: String,
        participant: AccountId,
        hash_lock: String,
        hash_algorithm: HashAlgorithm,
        time_lock_duration: u64,
        target_chain: String,
        target_address: String,
        counterparty_swap_id: Option<String>,
    ) -> AtomicSwap {
        let initiator = env::predecessor_account_id();
        let amount = env::attached_deposit();
        
        assert!(amount.as_yoctonear() > 0, "Must attach NEAR tokens");
        assert!(self.swaps.get(&swap_id).is_none(), "Swap ID already exists");
        assert!(
            time_lock_duration >= self.min_time_lock && time_lock_duration <= self.max_time_lock,
            "Time lock duration out of bounds"
        );
        assert!(hash_lock.len() == 64, "Hash lock must be 64 characters (32 bytes hex)");
        
        let time_lock = env::block_timestamp() + (time_lock_duration * 1_000_000_000);
        
        let swap = AtomicSwap {
            swap_id: swap_id.clone(),
            initiator: initiator.to_string(),
            participant: participant.to_string(),
            amount: amount.as_yoctonear().to_string(),
            hash_lock,
            hash_algorithm,
            time_lock,
            status: SwapStatus::Initiated,
            secret: None,
            target_chain,
            target_address,
            counterparty_swap_id,
            created_at: env::block_timestamp(),
        };
        
        self.swaps.insert(&swap_id, &swap);
        self.add_swap_to_initiator(&initiator, &swap_id);
        self.add_swap_to_participant(&participant, &swap_id);
        
        env::log_str(&format!(
            "Swap initiated: {} | Algorithm: {:?} | Counterparty: {:?}",
            swap_id, swap.hash_algorithm, swap.counterparty_swap_id
        ));
        
        swap
    }

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

    pub fn complete_swap_with_oracle_verification(&mut self, swap_id: String, secret: String) -> Promise {
        let mut swap = self.swaps.get(&swap_id).expect("Swap not found");
        
        // For Poseidon hashes, require Oracle verification
        if swap.hash_algorithm == HashAlgorithm::Poseidon {
            let verification = self.oracle_verifications.get(&swap_id)
                .expect("Oracle verification required for Poseidon");
            assert!(verification.verified, "Oracle verification not completed");
        } else {
            // For SHA256, verify locally
            let secret_hash = self.hash_secret(&secret);
            assert_eq!(secret_hash, swap.hash_lock, "Invalid secret");
        }
        
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
        
        let amount_yocto: u128 = swap.amount.parse().expect("Invalid amount");
        let fee_yocto = (amount_yocto * self.fee_percentage as u128) / 10000;
        let payout_yocto = amount_yocto - fee_yocto;
        
        env::log_str(&format!(
            "Swap completed: {} | Fee: {} | Payout: {}",
            swap_id, fee_yocto, payout_yocto
        ));
        
        // Transfer to participant
        let participant: AccountId = swap.participant.parse().expect("Invalid participant");
        let payout = NearToken::from_yoctonear(payout_yocto);
        
        // Transfer fee to fee recipient
        if fee_yocto > 0 {
            let fee = NearToken::from_yoctonear(fee_yocto);
            Promise::new(self.fee_recipient.clone()).transfer(fee);
        }
        
        Promise::new(participant).transfer(payout)
    }

    // Oracle submits Poseidon hash verification
    pub fn submit_oracle_verification(
        &mut self,
        swap_id: String,
        poseidon_hash: String,
        secret_matches: bool,
    ) {
        assert_eq!(
            env::predecessor_account_id(),
            self.oracle_account,
            "Only oracle can verify"
        );
        
        let swap = self.swaps.get(&swap_id).expect("Swap not found");
        assert_eq!(swap.hash_algorithm, HashAlgorithm::Poseidon, "Not a Poseidon swap");
        
        let verification = PoseidonVerification {
            swap_id: swap_id.clone(),
            poseidon_hash,
            verified: secret_matches,
            verified_at: Some(env::block_timestamp()),
        };
        
        self.oracle_verifications.insert(&swap_id, &verification);
        
        env::log_str(&format!(
            "Oracle verification submitted: {} | Verified: {}",
            swap_id, secret_matches
        ));
    }

    pub fn refund_swap(&mut self, swap_id: String) -> Promise {
        let mut swap = self.swaps.get(&swap_id).expect("Swap not found");
        
        let initiator: AccountId = swap.initiator.parse().expect("Invalid initiator");
        assert_eq!(
            env::predecessor_account_id(),
            initiator,
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
        
        let amount_yocto: u128 = swap.amount.parse().expect("Invalid amount");
        let refund_amount = NearToken::from_yoctonear(amount_yocto);
        Promise::new(initiator).transfer(refund_amount)
    }

    pub fn get_swap(&self, swap_id: String) -> Option<AtomicSwap> {
        self.swaps.get(&swap_id)
    }
    
    pub fn get_oracle_verification(&self, swap_id: String) -> Option<PoseidonVerification> {
        self.oracle_verifications.get(&swap_id)
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

    pub fn set_fee_percentage(&mut self, fee_percentage: u16) {
        assert_eq!(env::predecessor_account_id(), self.owner, "Only owner");
        assert!(fee_percentage <= 1000, "Fee cannot exceed 10%");
        self.fee_percentage = fee_percentage;
    }

    pub fn set_fee_recipient(&mut self, fee_recipient: AccountId) {
        assert_eq!(env::predecessor_account_id(), self.owner, "Only owner");
        self.fee_recipient = fee_recipient;
    }

    pub fn set_oracle_account(&mut self, oracle_account: AccountId) {
        assert_eq!(env::predecessor_account_id(), self.owner, "Only owner");
        self.oracle_account = oracle_account;
    }

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
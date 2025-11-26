use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::UnorderedMap;
use near_sdk::json_types::U128;
use near_sdk::{env, near_bindgen, AccountId, Balance, BorshStorageKey, PanicOnDefault, Promise};
use near_sdk::serde::{Deserialize, Serialize};

#[derive(BorshSerialize, BorshStorageKey)]
pub enum StorageKey {
    Escrows,
    ProofVerifications,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub enum EscrowStatus {
    Active,
    Completed,
    Disputed,
    Refunded,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct CrossChainProof {
    pub chain_id: String,
    pub tx_hash: String,
    pub block_number: u64,
    pub proof_data: String,      // Serialized proof
    pub verified: bool,
    pub verified_at: Option<u64>,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Escrow {
    pub escrow_id: String,
    pub depositor: AccountId,
    pub beneficiary: AccountId,
    pub amount: Balance,
    pub release_time: u64,
    pub status: EscrowStatus,
    pub cross_chain_proof: Option<CrossChainProof>,
    pub arbiter: Option<AccountId>,
    pub created_at: u64,
    pub metadata: String,         // JSON string for additional data
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct EscrowContract {
    pub escrows: UnorderedMap<String, Escrow>,
    pub proof_verifications: UnorderedMap<String, bool>,
    pub owner: AccountId,
    pub trusted_verifiers: Vec<AccountId>,
}

#[near_bindgen]
impl EscrowContract {
    #[init]
    pub fn new(owner: AccountId) -> Self {
        Self {
            escrows: UnorderedMap::new(StorageKey::Escrows),
            proof_verifications: UnorderedMap::new(StorageKey::ProofVerifications),
            owner: owner.clone(),
            trusted_verifiers: vec![owner],
        }
    }

    // ========== ESCROW CREATION ==========
    
    #[payable]
    pub fn create_escrow(
        &mut self,
        escrow_id: String,
        beneficiary: AccountId,
        release_time: u64,
        arbiter: Option<AccountId>,
        metadata: String,
    ) -> Escrow {
        let depositor = env::predecessor_account_id();
        let amount = env::attached_deposit();
        
        assert!(amount > 0, "Must attach NEAR tokens");
        assert!(self.escrows.get(&escrow_id).is_none(), "Escrow ID already exists");
        assert!(release_time > env::block_timestamp(), "Release time must be in future");
        
        let escrow = Escrow {
            escrow_id: escrow_id.clone(),
            depositor: depositor.clone(),
            beneficiary: beneficiary.clone(),
            amount,
            release_time,
            status: EscrowStatus::Active,
            cross_chain_proof: None,
            arbiter,
            created_at: env::block_timestamp(),
            metadata,
        };
        
        self.escrows.insert(&escrow_id, &escrow);
        
        env::log_str(&format!(
            "Escrow created: {} | Amount: {} | Beneficiary: {}",
            escrow_id, amount, beneficiary
        ));
        
        escrow
    }

    // ========== CROSS-CHAIN PROOF SUBMISSION ==========
    
    pub fn submit_cross_chain_proof(
        &mut self,
        escrow_id: String,
        chain_id: String,
        tx_hash: String,
        block_number: u64,
        proof_data: String,
    ) {
        let mut escrow = self.escrows.get(&escrow_id).expect("Escrow not found");
        
        assert!(
            matches!(escrow.status, EscrowStatus::Active),
            "Escrow must be active"
        );
        
        let proof = CrossChainProof {
            chain_id,
            tx_hash: tx_hash.clone(),
            block_number,
            proof_data,
            verified: false,
            verified_at: None,
        };
        
        escrow.cross_chain_proof = Some(proof);
        self.escrows.insert(&escrow_id, &escrow);
        
        env::log_str(&format!(
            "Cross-chain proof submitted for escrow: {} | TX: {}",
            escrow_id, tx_hash
        ));
    }

    // ========== PROOF VERIFICATION ==========
    
    pub fn verify_proof(&mut self, escrow_id: String) {
        let verifier = env::predecessor_account_id();
        
        assert!(
            self.trusted_verifiers.contains(&verifier) || verifier == self.owner,
            "Not authorized to verify proofs"
        );
        
        let mut escrow = self.escrows.get(&escrow_id).expect("Escrow not found");
        
        assert!(escrow.cross_chain_proof.is_some(), "No proof submitted");
        
        if let Some(mut proof) = escrow.cross_chain_proof {
            proof.verified = true;
            proof.verified_at = Some(env::block_timestamp());
            escrow.cross_chain_proof = Some(proof.clone());
            self.escrows.insert(&escrow_id, &escrow);
            
            // Store verification
            let proof_key = format!("{}:{}", proof.chain_id, proof.tx_hash);
            self.proof_verifications.insert(&proof_key, &true);
            
            env::log_str(&format!("Proof verified for escrow: {}", escrow_id));
        }
    }

    // ========== RELEASE FUNDS ==========
    
    pub fn release_funds(&mut self, escrow_id: String) -> Promise {
        let mut escrow = self.escrows.get(&escrow_id).expect("Escrow not found");
        
        let caller = env::predecessor_account_id();
        
        // Check authorization
        let is_beneficiary = caller == escrow.beneficiary;
        let is_arbiter = escrow.arbiter.as_ref().map_or(false, |a| a == &caller);
        let time_passed = env::block_timestamp() >= escrow.release_time;
        let proof_verified = escrow
            .cross_chain_proof
            .as_ref()
            .map_or(false, |p| p.verified);
        
        assert!(
            (is_beneficiary && (time_passed || proof_verified)) || is_arbiter,
            "Cannot release funds yet"
        );
        assert!(
            matches!(escrow.status, EscrowStatus::Active),
            "Escrow not active"
        );
        
        escrow.status = EscrowStatus::Completed;
        self.escrows.insert(&escrow_id, &escrow);
        
        env::log_str(&format!(
            "Funds released from escrow: {} | Amount: {}",
            escrow_id, escrow.amount
        ));
        
        Promise::new(escrow.beneficiary).transfer(escrow.amount)
    }

    // ========== REFUND ==========
    
    pub fn refund_escrow(&mut self, escrow_id: String) -> Promise {
        let mut escrow = self.escrows.get(&escrow_id).expect("Escrow not found");
        
        let caller = env::predecessor_account_id();
        
        // Only depositor or arbiter can initiate refund
        assert!(
            caller == escrow.depositor || escrow.arbiter.as_ref().map_or(false, |a| a == &caller),
            "Only depositor or arbiter can refund"
        );
        
        // Can only refund if time has passed and no verified proof
        let time_passed = env::block_timestamp() >= escrow.release_time;
        let no_verified_proof = !escrow
            .cross_chain_proof
            .as_ref()
            .map_or(false, |p| p.verified);
        
        assert!(
            time_passed && no_verified_proof,
            "Cannot refund: time not passed or proof verified"
        );
        
        escrow.status = EscrowStatus::Refunded;
        self.escrows.insert(&escrow_id, &escrow);
        
        env::log_str(&format!("Escrow refunded: {}", escrow_id));
        
        Promise::new(escrow.depositor.clone()).transfer(escrow.amount)
    }

    // ========== DISPUTE RESOLUTION ==========
    
    pub fn raise_dispute(&mut self, escrow_id: String) {
        let mut escrow = self.escrows.get(&escrow_id).expect("Escrow not found");
        
        let caller = env::predecessor_account_id();
        assert!(
            caller == escrow.depositor || caller == escrow.beneficiary,
            "Only parties can raise dispute"
        );
        
        escrow.status = EscrowStatus::Disputed;
        self.escrows.insert(&escrow_id, &escrow);
        
        env::log_str(&format!("Dispute raised for escrow: {}", escrow_id));
    }

    // ========== QUERY FUNCTIONS ==========
    
    pub fn get_escrow(&self, escrow_id: String) -> Option<Escrow> {
        self.escrows.get(&escrow_id)
    }
    
    pub fn is_proof_verified(&self, chain_id: String, tx_hash: String) -> bool {
        let proof_key = format!("{}:{}", chain_id, tx_hash);
        self.proof_verifications.get(&proof_key).unwrap_or(false)
    }

    // ========== ADMIN FUNCTIONS ==========
    
    pub fn add_trusted_verifier(&mut self, verifier: AccountId) {
        assert_eq!(env::predecessor_account_id(), self.owner, "Only owner");
        if !self.trusted_verifiers.contains(&verifier) {
            self.trusted_verifiers.push(verifier);
        }
    }
    
    pub fn remove_trusted_verifier(&mut self, verifier: AccountId) {
        assert_eq!(env::predecessor_account_id(), self.owner, "Only owner");
        self.trusted_verifiers.retain(|v| v != &verifier);
    }
}
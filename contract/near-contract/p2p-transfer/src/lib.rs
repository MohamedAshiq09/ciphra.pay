use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::collections::UnorderedMap;
use near_sdk::json_types::U128;
use near_sdk::{env, near_bindgen, AccountId, BorshStorageKey, PanicOnDefault, Promise, NearToken};
use near_sdk::serde::{Deserialize, Serialize};
use schemars::JsonSchema;

#[derive(BorshSerialize, BorshStorageKey)]
pub enum StorageKey {
    Transfers,
    UserTransfers,
    ShieldedPool,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub enum TransferType {
    Direct,
    Shielded,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub enum TransferStatus {
    Pending,
    Completed,
    Failed,
    Cancelled,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct Transfer {
    pub transfer_id: String,
    pub sender: String,
    pub recipient: String,
    pub amount: String,
    pub transfer_type: TransferType,
    pub status: TransferStatus,
    pub commitment: Option<String>, // For shielded transactions
    pub nullifier: Option<String>,  // For shielded transactions
    pub memo: String,
    pub timestamp: u64,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct ShieldedNote {
    pub note_id: String,
    pub commitment: String,
    pub amount: String,
    pub spent: bool,
    pub nullifier: Option<String>,
    pub created_at: u64,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct P2PTransferContract {
    pub transfers: UnorderedMap<String, Transfer>,
    pub user_transfers: UnorderedMap<AccountId, Vec<String>>,
    pub shielded_pool: UnorderedMap<String, ShieldedNote>,
    pub owner: AccountId,
    pub fee_percentage: u16,
    pub fee_recipient: AccountId,
}

#[near_bindgen]
impl P2PTransferContract {
    #[init]
    pub fn new(owner: AccountId) -> Self {
        let fee_recipient = owner.clone();
        Self {
            transfers: UnorderedMap::new(StorageKey::Transfers),
            user_transfers: UnorderedMap::new(StorageKey::UserTransfers),
            shielded_pool: UnorderedMap::new(StorageKey::ShieldedPool),
            owner,
            fee_percentage: 10, // 0.1% for direct transfers
            fee_recipient,
        }
    }

    // Direct P2P transfer
    #[payable]
    pub fn send_direct(
        &mut self,
        transfer_id: String,
        recipient: AccountId,
        memo: String,
    ) -> Promise {
        let sender = env::predecessor_account_id();
        let amount = env::attached_deposit();
        
        assert!(amount.as_yoctonear() > 0, "Must attach NEAR tokens");
        assert!(self.transfers.get(&transfer_id).is_none(), "Transfer ID already exists");
        
        let transfer = Transfer {
            transfer_id: transfer_id.clone(),
            sender: sender.to_string(),
            recipient: recipient.to_string(),
            amount: amount.as_yoctonear().to_string(),
            transfer_type: TransferType::Direct,
            status: TransferStatus::Completed,
            commitment: None,
            nullifier: None,
            memo,
            timestamp: env::block_timestamp(),
        };
        
        self.transfers.insert(&transfer_id, &transfer);
        self.add_user_transfer(&sender, &transfer_id);
        self.add_user_transfer(&recipient, &transfer_id);
        
        // Calculate fee
        let amount_yocto = amount.as_yoctonear();
        let fee_yocto = (amount_yocto * self.fee_percentage as u128) / 10000;
        let payout_yocto = amount_yocto - fee_yocto;
        
        env::log_str(&format!(
            "Direct transfer: {} | From: {} | To: {} | Amount: {}",
            transfer_id, sender, recipient, payout_yocto
        ));
        
        // Send fee
        if fee_yocto > 0 {
            let fee = NearToken::from_yoctonear(fee_yocto);
            Promise::new(self.fee_recipient.clone()).transfer(fee);
        }
        
        // Send to recipient
        let payout = NearToken::from_yoctonear(payout_yocto);
        Promise::new(recipient).transfer(payout)
    }

    // Shielded deposit - create commitment
    #[payable]
    pub fn shield_deposit(
        &mut self,
        note_id: String,
        commitment: String,
    ) -> ShieldedNote {
        let sender = env::predecessor_account_id();
        let amount = env::attached_deposit();
        
        assert!(amount.as_yoctonear() > 0, "Must attach NEAR tokens");
        assert!(self.shielded_pool.get(&note_id).is_none(), "Note ID already exists");
        assert!(commitment.len() == 64, "Commitment must be 64 characters");
        
        let note = ShieldedNote {
            note_id: note_id.clone(),
            commitment: commitment.clone(),
            amount: amount.as_yoctonear().to_string(),
            spent: false,
            nullifier: None,
            created_at: env::block_timestamp(),
        };
        
        self.shielded_pool.insert(&note_id, &note);
        
        env::log_str(&format!(
            "Shielded deposit: {} | Commitment: {} | Amount: {}",
            note_id, commitment, amount
        ));
        
        note
    }

    // Shielded transfer - spend commitment, create new one
    pub fn shield_transfer(
        &mut self,
        transfer_id: String,
        input_note_id: String,
        nullifier: String,
        new_commitment: String,
        recipient_commitment: String,
        proof: String, // ZK proof (simplified for hackathon)
        memo: String,
    ) -> Promise {
        assert!(self.transfers.get(&transfer_id).is_none(), "Transfer ID already exists");
        assert!(proof.len() > 0, "Proof required");
        
        // Get and verify input note
        let mut input_note = self.shielded_pool.get(&input_note_id)
            .expect("Input note not found");
        assert!(!input_note.spent, "Note already spent");
        
        // Mark as spent
        input_note.spent = true;
        input_note.nullifier = Some(nullifier.clone());
        self.shielded_pool.insert(&input_note_id, &input_note);
        
        // In production: Verify ZK proof here
        // For hackathon: Simple validation
        assert!(nullifier.len() == 64, "Invalid nullifier");
        assert!(new_commitment.len() == 64, "Invalid new commitment");
        assert!(recipient_commitment.len() == 64, "Invalid recipient commitment");
        
        let amount_yocto: u128 = input_note.amount.parse().expect("Invalid amount");
        
        // Create transfer record (sender/recipient hidden)
        let transfer = Transfer {
            transfer_id: transfer_id.clone(),
            sender: "shielded".to_string(),
            recipient: "shielded".to_string(),
            amount: amount_yocto.to_string(),
            transfer_type: TransferType::Shielded,
            status: TransferStatus::Completed,
            commitment: Some(recipient_commitment.clone()),
            nullifier: Some(nullifier.clone()),
            memo,
            timestamp: env::block_timestamp(),
        };
        
        self.transfers.insert(&transfer_id, &transfer);
        
        env::log_str(&format!(
            "Shielded transfer: {} | Nullifier: {}",
            transfer_id, nullifier
        ));
        
        Promise::new(env::current_account_id())
    }

    // Shielded withdrawal - reveal recipient
    pub fn shield_withdraw(
        &mut self,
        transfer_id: String,
        note_id: String,
        nullifier: String,
        recipient: AccountId,
        proof: String,
    ) -> Promise {
        assert!(self.transfers.get(&transfer_id).is_none(), "Transfer ID already exists");
        
        let mut note = self.shielded_pool.get(&note_id)
            .expect("Note not found");
        assert!(!note.spent, "Note already spent");
        
        // Mark as spent
        note.spent = true;
        note.nullifier = Some(nullifier.clone());
        self.shielded_pool.insert(&note_id, &note);
        
        let amount_yocto: u128 = note.amount.parse().expect("Invalid amount");
        let fee_yocto = (amount_yocto * self.fee_percentage as u128) / 10000;
        let payout_yocto = amount_yocto - fee_yocto;
        
        let transfer = Transfer {
            transfer_id: transfer_id.clone(),
            sender: "shielded".to_string(),
            recipient: recipient.to_string(),
            amount: payout_yocto.to_string(),
            transfer_type: TransferType::Shielded,
            status: TransferStatus::Completed,
            commitment: None,
            nullifier: Some(nullifier),
            memo: "Shielded withdrawal".to_string(),
            timestamp: env::block_timestamp(),
        };
        
        self.transfers.insert(&transfer_id, &transfer);
        self.add_user_transfer(&recipient, &transfer_id);
        
        env::log_str(&format!(
            "Shielded withdrawal: {} | To: {} | Amount: {}",
            transfer_id, recipient, payout_yocto
        ));
        
        // Send fee
        if fee_yocto > 0 {
            let fee = NearToken::from_yoctonear(fee_yocto);
            Promise::new(self.fee_recipient.clone()).transfer(fee);
        }
        
        let payout = NearToken::from_yoctonear(payout_yocto);
        Promise::new(recipient).transfer(payout)
    }

    pub fn get_transfer(&self, transfer_id: String) -> Option<Transfer> {
        self.transfers.get(&transfer_id)
    }

    pub fn get_user_transfers(&self, account_id: AccountId) -> Vec<Transfer> {
        self.user_transfers
            .get(&account_id)
            .unwrap_or_default()
            .iter()
            .filter_map(|transfer_id| self.transfers.get(transfer_id))
            .collect()
    }

    pub fn get_shielded_note(&self, note_id: String) -> Option<ShieldedNote> {
        self.shielded_pool.get(&note_id)
    }

    pub fn is_nullifier_used(&self, nullifier: String) -> bool {
        // Check all notes for this nullifier
        for note_id in self.shielded_pool.keys() {
            if let Some(note) = self.shielded_pool.get(&note_id) {
                if let Some(used_nullifier) = note.nullifier {
                    if used_nullifier == nullifier {
                        return true;
                    }
                }
            }
        }
        false
    }

    pub fn set_fee_percentage(&mut self, fee_percentage: u16) {
        assert_eq!(env::predecessor_account_id(), self.owner, "Only owner");
        assert!(fee_percentage <= 500, "Fee cannot exceed 5%");
        self.fee_percentage = fee_percentage;
    }

    pub fn set_fee_recipient(&mut self, fee_recipient: AccountId) {
        assert_eq!(env::predecessor_account_id(), self.owner, "Only owner");
        self.fee_recipient = fee_recipient;
    }

    fn add_user_transfer(&mut self, user: &AccountId, transfer_id: &str) {
        let mut transfers = self.user_transfers.get(user).unwrap_or_default();
        transfers.push(transfer_id.to_string());
        self.user_transfers.insert(user, &transfers);
    }
}
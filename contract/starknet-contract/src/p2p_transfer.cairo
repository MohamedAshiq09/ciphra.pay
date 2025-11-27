use starknet::ContractAddress;
use starknet::get_caller_address;
use starknet::get_block_timestamp;
use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};

#[starknet::interface]
trait IERC20<TContractState> {
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer_from(
        ref self: TContractState,
        sender: ContractAddress,
        recipient: ContractAddress,
        amount: u256
    ) -> bool;
}

#[starknet::interface]
trait IP2PTransfer<TContractState> {
    fn send_direct(
        ref self: TContractState,
        transfer_id: felt252,
        recipient: ContractAddress,
        amount: u256,
        token_address: ContractAddress,
        memo: felt252,
    );
    
    fn shield_deposit(
        ref self: TContractState,
        note_id: felt252,
        commitment: felt252,
        amount: u256,
        token_address: ContractAddress,
    );
    
    fn shield_withdraw(
        ref self: TContractState,
        transfer_id: felt252,
        note_id: felt252,
        nullifier: felt252,
        recipient: ContractAddress,
        proof: felt252,
    );
    
    fn get_transfer(self: @TContractState, transfer_id: felt252) -> TransferDetails;
    fn get_shielded_note(self: @TContractState, note_id: felt252) -> ShieldedNote;
    fn is_nullifier_used(self: @TContractState, nullifier: felt252) -> bool;
}

#[derive(Drop, Serde, starknet::Store, PartialEq, Copy)]
enum TransferType {
    Direct,
    Shielded,
}

#[derive(Drop, Serde, starknet::Store, PartialEq, Copy)]
enum TransferStatus {
    Pending,
    Completed,
    Failed,
}

#[derive(Drop, Serde, starknet::Store, Copy)]
struct TransferDetails {
    transfer_id: felt252,
    sender: ContractAddress,
    recipient: ContractAddress,
    amount: u256,
    token_address: ContractAddress,
    transfer_type: TransferType,
    status: TransferStatus,
    commitment: felt252,
    nullifier: felt252,
    memo: felt252,
    timestamp: u64,
}

#[derive(Drop, Serde, starknet::Store, Copy)]
struct ShieldedNote {
    note_id: felt252,
    commitment: felt252,
    amount: u256,
    token_address: ContractAddress,
    spent: bool,
    nullifier: felt252,
    created_at: u64,
}

#[starknet::contract]
mod P2PTransfer {
    use super::{
        TransferDetails, ShieldedNote, TransferType, TransferStatus, IP2PTransfer,
        IERC20Dispatcher, IERC20DispatcherTrait
    };
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp, get_contract_address};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};

    #[storage]
    struct Storage {
        transfers: Map<felt252, TransferDetails>,
        shielded_pool: Map<felt252, ShieldedNote>,
        used_nullifiers: Map<felt252, bool>,
        owner: ContractAddress,
        fee_percentage: u16,
        fee_recipient: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        DirectTransfer: DirectTransfer,
        ShieldedDeposit: ShieldedDeposit,
        ShieldedWithdrawal: ShieldedWithdrawal,
    }

    #[derive(Drop, starknet::Event)]
    struct DirectTransfer {
        #[key]
        transfer_id: felt252,
        sender: ContractAddress,
        recipient: ContractAddress,
        amount: u256,
        token_address: ContractAddress,
        fee_charged: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct ShieldedDeposit {
        #[key]
        note_id: felt252,
        commitment: felt252,
        amount: u256,
        token_address: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct ShieldedWithdrawal {
        #[key]
        transfer_id: felt252,
        nullifier: felt252,
        recipient: ContractAddress,
        amount: u256,
        fee_charged: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
        self.fee_percentage.write(10); // 0.1% for direct transfers
        self.fee_recipient.write(owner);
    }

    #[abi(embed_v0)]
    impl P2PTransferImpl of IP2PTransfer<ContractState> {
        fn send_direct(
            ref self: ContractState,
            transfer_id: felt252,
            recipient: ContractAddress,
            amount: u256,
            token_address: ContractAddress,
            memo: felt252,
        ) {
            let sender = get_caller_address();
            let this_contract = get_contract_address();
            let current_time = get_block_timestamp();
            
            // Validate
            let existing = self.transfers.read(transfer_id);
            assert(existing.status == TransferStatus::Pending, 'Transfer ID exists');
            assert(amount > 0, 'Amount must be positive');
            
            // Calculate fee
            let fee_percentage = self.fee_percentage.read();
            let fee_amount = (amount * fee_percentage.into()) / 10000;
            let payout_amount = amount - fee_amount;
            
            // Transfer tokens from sender to contract
            let token = IERC20Dispatcher { contract_address: token_address };
            let success = token.transfer_from(sender, this_contract, amount);
            assert(success, 'Token transfer failed');
            
            // Store transfer
            let transfer = TransferDetails {
                transfer_id,
                sender,
                recipient,
                amount: payout_amount,
                token_address,
                transfer_type: TransferType::Direct,
                status: TransferStatus::Completed,
                commitment: 0,
                nullifier: 0,
                memo,
                timestamp: current_time,
            };
            self.transfers.write(transfer_id, transfer);
            
            // Send to recipient
            let payout_success = token.transfer(recipient, payout_amount);
            assert(payout_success, 'Payout failed');
            
            // Send fee
            if fee_amount > 0 {
                let fee_recipient = self.fee_recipient.read();
                let fee_success = token.transfer(fee_recipient, fee_amount);
                assert(fee_success, 'Fee transfer failed');
            }
            
            self.emit(DirectTransfer {
                transfer_id,
                sender,
                recipient,
                amount: payout_amount,
                token_address,
                fee_charged: fee_amount,
            });
        }

        fn shield_deposit(
            ref self: ContractState,
            note_id: felt252,
            commitment: felt252,
            amount: u256,
            token_address: ContractAddress,
        ) {
            let sender = get_caller_address();
            let this_contract = get_contract_address();
            let current_time = get_block_timestamp();
            
            // Validate
            let existing = self.shielded_pool.read(note_id);
            assert(existing.note_id == 0, 'Note ID exists');
            assert(amount > 0, 'Amount must be positive');
            assert(commitment != 0, 'Invalid commitment');
            
            // Transfer tokens to contract
            let token = IERC20Dispatcher { contract_address: token_address };
            let success = token.transfer_from(sender, this_contract, amount);
            assert(success, 'Token transfer failed');
            
            // Create note
            let note = ShieldedNote {
                note_id,
                commitment,
                amount,
                token_address,
                spent: false,
                nullifier: 0,
                created_at: current_time,
            };
            self.shielded_pool.write(note_id, note);
            
            self.emit(ShieldedDeposit {
                note_id,
                commitment,
                amount,
                token_address,
            });
        }

        fn shield_withdraw(
            ref self: ContractState,
            transfer_id: felt252,
            note_id: felt252,
            nullifier: felt252,
            recipient: ContractAddress,
            proof: felt252,
        ) {
            let current_time = get_block_timestamp();
            
            // Validate nullifier not used
            assert(!self.used_nullifiers.read(nullifier), 'Nullifier already used');
            
            // Get note
            let note = self.shielded_pool.read(note_id);
            assert(note.note_id != 0, 'Note not found');
            assert(!note.spent, 'Note already spent');
            
            // In production: Verify ZK proof
            assert(proof != 0, 'Invalid proof');
            
            // Calculate fee
            let fee_percentage = self.fee_percentage.read();
            let fee_amount = (note.amount * fee_percentage.into()) / 10000;
            let payout_amount = note.amount - fee_amount;
            
            // Mark note as spent
            let updated_note = ShieldedNote {
                note_id: note.note_id,
                commitment: note.commitment,
                amount: note.amount,
                token_address: note.token_address,
                spent: true,
                nullifier: nullifier,
                created_at: note.created_at,
            };
            self.shielded_pool.write(note_id, updated_note);
            
            // Mark nullifier as used
            self.used_nullifiers.write(nullifier, true);
            
            // Create transfer record
            let transfer = TransferDetails {
                transfer_id,
                sender: starknet::contract_address_const::<0>(), // Hidden
                recipient,
                amount: payout_amount,
                token_address: note.token_address,
                transfer_type: TransferType::Shielded,
                status: TransferStatus::Completed,
                commitment: note.commitment,
                nullifier,
                memo: 0,
                timestamp: current_time,
            };
            self.transfers.write(transfer_id, transfer);
            
            // Transfer tokens
            let token = IERC20Dispatcher { contract_address: note.token_address };
            let success = token.transfer(recipient, payout_amount);
            assert(success, 'Payout failed');
            
            // Send fee
            if fee_amount > 0 {
                let fee_recipient = self.fee_recipient.read();
                let fee_success = token.transfer(fee_recipient, fee_amount);
                assert(fee_success, 'Fee transfer failed');
            }
            
            self.emit(ShieldedWithdrawal {
                transfer_id,
                nullifier,
                recipient,
                amount: payout_amount,
                fee_charged: fee_amount,
            });
        }

        fn get_transfer(self: @ContractState, transfer_id: felt252) -> TransferDetails {
            self.transfers.read(transfer_id)
        }

        fn get_shielded_note(self: @ContractState, note_id: felt252) -> ShieldedNote {
            self.shielded_pool.read(note_id)
        }

        fn is_nullifier_used(self: @ContractState, nullifier: felt252) -> bool {
            self.used_nullifiers.read(nullifier)
        }
    }
}
// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::collections::BTreeSet;

use fungible::Account;
use linera_sdk::{
    linera_base_types::{AccountOwner, DataBlobHash, WithContractAbi},
    views::{RootView, View},
    Contract, ContractRuntime,
};
use supply_chain::{Message, Product, SupplyChainAbi, Operation, TokenId};

use self::state::SupplyChainState;

pub struct SupplyChainContract {
    state: SupplyChainState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(SupplyChainContract);

impl WithContractAbi for SupplyChainContract {
    type Abi = SupplyChainAbi;
}

impl Contract for SupplyChainContract {
    type Message = Message;
    type InstantiationArgument = ();
    type Parameters = ();
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = SupplyChainState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        SupplyChainContract { state, runtime }
    }

    async fn instantiate(&mut self, _state: Self::InstantiationArgument) {
        // Validate that the application parameters were configured correctly.
        self.runtime.application_parameters();
        self.state.num_registered_products.set(0);
    }

    async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
        match operation {
            Operation::RegisterProduct {
                manufacturer,
                name,
                blob_hash,
            } => {
                self.runtime
                    .check_account_permission(manufacturer)
                    .expect("Permission for RegisterProduct operation");
                self.register_product(manufacturer, name, blob_hash).await;
            }

            Operation::TransferCustody {
                source_owner,
                token_id,
                target_account,
            } => {
                self.runtime
                    .check_account_permission(source_owner)
                    .expect("Permission for TransferCustody operation");

                let product = self.get_product(&token_id).await;
                assert_eq!(source_owner, product.owner);

                self.transfer_custody(product, target_account).await;
            }

            Operation::ClaimProduct {
                source_account,
                token_id,
                target_account,
            } => {
                self.runtime
                    .check_account_permission(source_account.owner)
                    .expect("Permission for ClaimProduct operation");

                if source_account.chain_id == self.runtime.chain_id() {
                    let product = self.get_product(&token_id).await;
                    assert_eq!(source_account.owner, product.owner);

                    self.transfer_custody(product, target_account).await;
                } else {
                    self.remote_claim_product(source_account, token_id, target_account)
                }
            }

            Operation::UpdateStatus {
                token_id,
                new_status,
                location,
                notes,
            } => {
                let mut product = self.get_product(&token_id).await;
                // TODO: Add proper permission checks later
                // self.runtime
                //     .check_account_permission(product.owner)
                //     .expect("Permission for UpdateStatus operation");

                self.update_product_status(&mut product, new_status, location, notes).await;
            }

            Operation::AddCheckpoint {
                token_id,
                location,
                status,
                notes,
            } => {
                let mut product = self.get_product(&token_id).await;
                // TODO: Add proper permission checks later
                // self.runtime
                //     .check_account_permission(product.owner)
                //     .expect("Permission for AddCheckpoint operation");

                self.add_checkpoint(&mut product, location, status, notes).await;
            }

            Operation::VerifyProduct {
                token_id,
                passed,
                details,
            } => {
                let mut product = self.get_product(&token_id).await;
                // TODO: Add verifier role check later
                // Note: Verification should be done by authorized inspectors

                self.verify_product(&mut product, passed, details).await;
            }

            Operation::RejectProduct {
                token_id,
                reason,
            } => {
                let mut product = self.get_product(&token_id).await;
                // TODO: Add proper permission checks later
                // self.runtime
                //     .check_account_permission(product.owner)
                //     .expect("Permission for RejectProduct operation");

                self.reject_product(&mut product, reason).await;
            }
        }
    }

    async fn execute_message(&mut self, message: Message) {
        match message {
            Message::TransferCustody {
                mut product,
                target_account,
            } => {
                use supply_chain::{Checkpoint, ProductStatus};

                let is_bouncing = self
                    .runtime
                    .message_is_bouncing()
                    .expect("Message delivery status has to be available when executing a message");
                if !is_bouncing {
                    product.owner = target_account.owner;

                    // Add delivery checkpoint for cross-chain transfer
                    let delivery_checkpoint = Checkpoint {
                        timestamp: self.runtime.system_time(),
                        location: format!("Chain {}", self.runtime.chain_id()),
                        status: ProductStatus::Delivered,
                        party: target_account.owner,
                        notes: Some("Delivered (cross-chain)".to_string()),
                    };
                    product.checkpoints.push(delivery_checkpoint);
                    product.status = ProductStatus::Delivered;
                }

                self.add_product(product).await;
            }

            Message::ClaimProduct {
                source_account,
                token_id,
                target_account,
            } => {
                self.runtime
                    .check_account_permission(source_account.owner)
                    .expect("Permission for ClaimProduct message");
                let product = self.get_product(&token_id).await;
                assert_eq!(source_account.owner, product.owner);

                self.transfer_custody(product, target_account).await;
            }
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

impl SupplyChainContract {
    /// Transfers custody of the specified product to another account (possibly across chains).
    /// Authentication needs to have happened already.
    async fn transfer_custody(&mut self, mut product: Product, target_account: Account) {
        use supply_chain::{Checkpoint, ProductStatus};

        self.remove_product(&product).await;

        // Add checkpoint for custody transfer
        let transfer_checkpoint = Checkpoint {
            timestamp: self.runtime.system_time(),
            location: format!("Chain {}", self.runtime.chain_id()),
            status: ProductStatus::InTransit,
            party: product.owner,
            notes: Some(format!("Transfer to {}", target_account.owner)),
        };
        product.checkpoints.push(transfer_checkpoint);
        product.status = ProductStatus::InTransit;

        if target_account.chain_id == self.runtime.chain_id() {
            product.owner = target_account.owner;

            // Add delivery checkpoint for same-chain transfer
            let delivery_checkpoint = Checkpoint {
                timestamp: self.runtime.system_time(),
                location: format!("Chain {}", self.runtime.chain_id()),
                status: ProductStatus::Delivered,
                party: target_account.owner,
                notes: Some("Delivered (same chain)".to_string()),
            };
            product.checkpoints.push(delivery_checkpoint);
            product.status = ProductStatus::Delivered;

            self.add_product(product).await;
        } else {
            let message = Message::TransferCustody {
                product,
                target_account,
            };

            self.runtime
                .prepare_message(message)
                .with_tracking()
                .send_to(target_account.chain_id);
        }
    }

    async fn get_product(&self, token_id: &TokenId) -> Product {
        self.state
            .products
            .get(token_id)
            .await
            .expect("Failure in retrieving product")
            .expect("Product not found")
    }

    async fn register_product(&mut self, owner: AccountOwner, name: String, blob_hash: DataBlobHash) {
        use supply_chain::{Checkpoint, ProductStatus};

        self.runtime.assert_data_blob_exists(blob_hash);
        let token_id = Product::create_token_id(
            &self.runtime.chain_id(),
            &self.runtime.application_id().forget_abi(),
            &name,
            &owner,
            &blob_hash,
            *self.state.num_registered_products.get(),
        )
        .expect("Failed to serialize product metadata");

        // Create initial checkpoint for registration
        let initial_checkpoint = Checkpoint {
            timestamp: self.runtime.system_time(),
            location: format!("Chain {}", self.runtime.chain_id()),
            status: ProductStatus::Registered,
            party: owner,
            notes: Some("Product registered".to_string()),
        };

        self.add_product(Product {
            token_id,
            owner,
            name,
            manufacturer: owner,
            blob_hash,
            status: ProductStatus::Registered,
            checkpoints: vec![initial_checkpoint],
            verifications: vec![],
        })
        .await;

        let num_registered_products = self.state.num_registered_products.get_mut();
        *num_registered_products += 1;
    }

    fn remote_claim_product(
        &mut self,
        source_account: Account,
        token_id: TokenId,
        target_account: Account,
    ) {
        let message = Message::ClaimProduct {
            source_account,
            token_id,
            target_account,
        };
        self.runtime
            .prepare_message(message)
            .with_authentication()
            .send_to(source_account.chain_id);
    }

    async fn add_product(&mut self, product: Product) {
        let token_id = product.token_id.clone();
        let owner = product.owner;

        self.state
            .products
            .insert(&token_id, product)
            .expect("Error in insert statement");
        if let Some(owned_token_ids) = self
            .state
            .owned_token_ids
            .get_mut(&owner)
            .await
            .expect("Error in get_mut statement")
        {
            owned_token_ids.insert(token_id);
        } else {
            let mut owned_token_ids = BTreeSet::new();
            owned_token_ids.insert(token_id);
            self.state
                .owned_token_ids
                .insert(&owner, owned_token_ids)
                .expect("Error in insert statement");
        }
    }

    async fn remove_product(&mut self, product: &Product) {
        self.state
            .products
            .remove(&product.token_id)
            .expect("Failure removing product");
        let owned_token_ids = self
            .state
            .owned_token_ids
            .get_mut(&product.owner)
            .await
            .expect("Error in get_mut statement")
            .expect("Product set should be there!");

        owned_token_ids.remove(&product.token_id);
    }

    /// Updates product status and adds a checkpoint
    async fn update_product_status(
        &mut self,
        product: &mut Product,
        new_status: supply_chain::ProductStatus,
        location: String,
        notes: Option<String>,
    ) {
        use supply_chain::Checkpoint;

        product.status = new_status;

        let checkpoint = Checkpoint {
            timestamp: self.runtime.system_time(),
            location,
            status: new_status,
            party: product.owner,
            notes,
        };
        product.checkpoints.push(checkpoint);

        // Update the product in storage
        self.state
            .products
            .insert(&product.token_id, product.clone())
            .expect("Error updating product");
    }

    /// Adds a checkpoint to track product location/status
    async fn add_checkpoint(
        &mut self,
        product: &mut Product,
        location: String,
        status: supply_chain::ProductStatus,
        notes: Option<String>,
    ) {
        use supply_chain::Checkpoint;

        let checkpoint = Checkpoint {
            timestamp: self.runtime.system_time(),
            location,
            status,
            party: product.owner,
            notes,
        };
        product.checkpoints.push(checkpoint);
        product.status = status;

        // Update the product in storage
        self.state
            .products
            .insert(&product.token_id, product.clone())
            .expect("Error updating product");
    }

    /// Records a product verification
    async fn verify_product(&mut self, product: &mut Product, passed: bool, details: String) {
        use supply_chain::{ProductStatus, VerificationRecord};

        let verification = VerificationRecord {
            verifier: product.owner, // In a real system, this might be a separate verifier role
            timestamp: self.runtime.system_time(),
            passed,
            details: details.clone(),
        };
        product.verifications.push(verification);

        // Update status based on verification result
        if passed {
            product.status = ProductStatus::Verified;

            // Add checkpoint for successful verification
            let checkpoint = supply_chain::Checkpoint {
                timestamp: self.runtime.system_time(),
                location: format!("Chain {}", self.runtime.chain_id()),
                status: ProductStatus::Verified,
                party: product.owner,
                notes: Some(format!("Verification passed: {}", details)),
            };
            product.checkpoints.push(checkpoint);
        } else {
            product.status = ProductStatus::Rejected;

            // Add checkpoint for failed verification
            let checkpoint = supply_chain::Checkpoint {
                timestamp: self.runtime.system_time(),
                location: format!("Chain {}", self.runtime.chain_id()),
                status: ProductStatus::Rejected,
                party: product.owner,
                notes: Some(format!("Verification failed: {}", details)),
            };
            product.checkpoints.push(checkpoint);
        }

        // Update the product in storage
        self.state
            .products
            .insert(&product.token_id, product.clone())
            .expect("Error updating product");
    }

    /// Marks a product as rejected
    async fn reject_product(&mut self, product: &mut Product, reason: String) {
        use supply_chain::{Checkpoint, ProductStatus};

        product.status = ProductStatus::Rejected;

        let checkpoint = Checkpoint {
            timestamp: self.runtime.system_time(),
            location: format!("Chain {}", self.runtime.chain_id()),
            status: ProductStatus::Rejected,
            party: product.owner,
            notes: Some(format!("Rejected: {}", reason)),
        };
        product.checkpoints.push(checkpoint);

        // Update the product in storage
        self.state
            .products
            .insert(&product.token_id, product.clone())
            .expect("Error updating product");
    }
}

// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::{
    collections::{BTreeMap, BTreeSet},
    sync::Arc,
};

use async_graphql::{EmptySubscription, Object, Request, Response, Schema};
use base64::engine::{general_purpose::STANDARD_NO_PAD, Engine as _};
use fungible::Account;
use linera_sdk::{
    linera_base_types::{AccountOwner, DataBlobHash, WithServiceAbi},
    views::View,
    Service, ServiceRuntime,
};
use supply_chain::{ProductOutput, Operation, TokenId};

use self::state::SupplyChainState;

pub struct SupplyChainService {
    state: Arc<SupplyChainState>,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(SupplyChainService);

impl WithServiceAbi for SupplyChainService {
    type Abi = supply_chain::SupplyChainAbi;
}

impl Service for SupplyChainService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = SupplyChainState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        SupplyChainService {
            state: Arc::new(state),
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            QueryRoot {
                supply_chain: self.state.clone(),
                runtime: self.runtime.clone(),
            },
            MutationRoot {
                runtime: self.runtime.clone(),
            },
            EmptySubscription,
        )
        .finish();
        schema.execute(request).await
    }
}

struct QueryRoot {
    supply_chain: Arc<SupplyChainState>,
    runtime: Arc<ServiceRuntime<SupplyChainService>>,
}

#[Object]
impl QueryRoot {
    async fn product(&self, token_id: String) -> Option<ProductOutput> {
        let token_id_vec = STANDARD_NO_PAD.decode(&token_id).unwrap();
        let product = self
            .supply_chain
            .products
            .get(&TokenId { id: token_id_vec })
            .await
            .unwrap();

        if let Some(product) = product {
            let payload = self.runtime.read_data_blob(product.blob_hash);
            let product_output = ProductOutput::new_with_token_id(token_id, product, payload);
            Some(product_output)
        } else {
            None
        }
    }

    async fn products(&self) -> BTreeMap<String, ProductOutput> {
        let mut products = BTreeMap::new();
        self.supply_chain
            .products
            .for_each_index_value(|_token_id, product| {
                let product = product.into_owned();
                let payload = self.runtime.read_data_blob(product.blob_hash);
                let product_output = ProductOutput::new(product, payload);
                products.insert(product_output.token_id.clone(), product_output);
                Ok(())
            })
            .await
            .unwrap();

        products
    }

    async fn owned_token_ids_by_owner(&self, owner: AccountOwner) -> BTreeSet<String> {
        self.supply_chain
            .owned_token_ids
            .get(&owner)
            .await
            .unwrap()
            .into_iter()
            .flatten()
            .map(|token_id| STANDARD_NO_PAD.encode(token_id.id))
            .collect()
    }

    async fn owned_token_ids(&self) -> BTreeMap<AccountOwner, BTreeSet<String>> {
        let mut owners = BTreeMap::new();
        self.supply_chain
            .owned_token_ids
            .for_each_index_value(|owner, token_ids| {
                let token_ids = token_ids.into_owned();
                let new_token_ids = token_ids
                    .into_iter()
                    .map(|token_id| STANDARD_NO_PAD.encode(token_id.id))
                    .collect();

                owners.insert(owner, new_token_ids);
                Ok(())
            })
            .await
            .unwrap();

        owners
    }

    async fn owned_products(&self, owner: AccountOwner) -> BTreeMap<String, ProductOutput> {
        let mut result = BTreeMap::new();
        let owned_token_ids = self
            .supply_chain
            .owned_token_ids
            .get(&owner)
            .await
            .unwrap();

        for token_id in owned_token_ids.into_iter().flatten() {
            let product = self
                .supply_chain
                .products
                .get(&token_id)
                .await
                .unwrap()
                .unwrap();
            let payload = self.runtime.read_data_blob(product.blob_hash);
            let product_output = ProductOutput::new(product, payload);
            result.insert(product_output.token_id.clone(), product_output);
        }

        result
    }
}

struct MutationRoot {
    runtime: Arc<ServiceRuntime<SupplyChainService>>,
}

#[Object]
impl MutationRoot {
    async fn register_product(&self, manufacturer: AccountOwner, name: String, blob_hash: DataBlobHash) -> [u8; 0] {
        let operation = Operation::RegisterProduct {
            manufacturer,
            name,
            blob_hash,
        };
        self.runtime.schedule_operation(&operation);
        []
    }

    async fn transfer_custody(
        &self,
        source_owner: AccountOwner,
        token_id: String,
        target_account: Account,
    ) -> [u8; 0] {
        let operation = Operation::TransferCustody {
            source_owner,
            token_id: TokenId {
                id: STANDARD_NO_PAD.decode(token_id).unwrap(),
            },
            target_account,
        };
        self.runtime.schedule_operation(&operation);
        []
    }

    async fn claim_product(
        &self,
        source_account: Account,
        token_id: String,
        target_account: Account,
    ) -> [u8; 0] {
        let operation = Operation::ClaimProduct {
            source_account,
            token_id: TokenId {
                id: STANDARD_NO_PAD.decode(token_id).unwrap(),
            },
            target_account,
        };
        self.runtime.schedule_operation(&operation);
        []
    }
}

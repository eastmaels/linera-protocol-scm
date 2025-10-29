// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/*! ABI of the Supply Chain Management Application */

use std::fmt::{Display, Formatter};

use async_graphql::{InputObject, Request, Response, SimpleObject};
use fungible::Account;
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{
        AccountOwner, ApplicationId, ChainId, ContractAbi, DataBlobHash, ServiceAbi,
    },
    ToBcsBytes,
};
use serde::{Deserialize, Serialize};

#[derive(
    Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Ord, PartialOrd, SimpleObject, InputObject,
)]
#[graphql(input_name = "TokenIdInput")]
pub struct TokenId {
    pub id: Vec<u8>,
}

pub struct SupplyChainAbi;

impl ContractAbi for SupplyChainAbi {
    type Operation = Operation;
    type Response = ();
}

impl ServiceAbi for SupplyChainAbi {
    type Query = Request;
    type QueryResponse = Response;
}

/// An operation.
#[derive(Debug, Deserialize, Serialize, GraphQLMutationRoot)]
pub enum Operation {
    /// Registers a new product in the supply chain
    RegisterProduct {
        manufacturer: AccountOwner,
        name: String,
        blob_hash: DataBlobHash,
    },
    /// Transfers custody of a product from one party to another (possibly across chains/locations)
    TransferCustody {
        source_owner: AccountOwner,
        token_id: TokenId,
        target_account: Account,
    },
    /// Claims a product from a remote location. Depending on the configuration,
    /// the target chain may take time or refuse to process the message.
    ClaimProduct {
        source_account: Account,
        token_id: TokenId,
        target_account: Account,
    },
}

/// A cross-chain message.
#[derive(Debug, Deserialize, Serialize)]
pub enum Message {
    /// Transfers custody to the given `target` account, unless the message is bouncing,
    /// in which case we transfer back to the `source`.
    TransferCustody {
        product: Product,
        target_account: Account,
    },

    /// Claims a product from the given account and starts a transfer to the target account.
    ClaimProduct {
        source_account: Account,
        token_id: TokenId,
        target_account: Account,
    },
}

#[derive(Debug, Serialize, Deserialize, Clone, SimpleObject, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Product {
    pub token_id: TokenId,
    pub owner: AccountOwner,
    pub name: String,
    pub manufacturer: AccountOwner,
    pub blob_hash: DataBlobHash,
}

#[derive(Debug, Serialize, Deserialize, Clone, SimpleObject, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProductOutput {
    pub token_id: String,
    pub owner: AccountOwner,
    pub name: String,
    pub manufacturer: AccountOwner,
    pub payload: Vec<u8>,
}

impl ProductOutput {
    pub fn new(product: Product, payload: Vec<u8>) -> Self {
        use base64::engine::{general_purpose::STANDARD_NO_PAD, Engine as _};
        let token_id = STANDARD_NO_PAD.encode(product.token_id.id);
        Self {
            token_id,
            owner: product.owner,
            name: product.name,
            manufacturer: product.manufacturer,
            payload,
        }
    }

    pub fn new_with_token_id(token_id: String, product: Product, payload: Vec<u8>) -> Self {
        Self {
            token_id,
            owner: product.owner,
            name: product.name,
            manufacturer: product.manufacturer,
            payload,
        }
    }
}

impl Display for TokenId {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", self.id)
    }
}

impl Product {
    pub fn create_token_id(
        chain_id: &ChainId,
        application_id: &ApplicationId,
        name: &String,
        manufacturer: &AccountOwner,
        blob_hash: &DataBlobHash,
        num_registered_products: u64,
    ) -> Result<TokenId, bcs::Error> {
        use sha3::Digest as _;

        let mut hasher = sha3::Sha3_256::new();
        hasher.update(chain_id.to_bcs_bytes()?);
        hasher.update(application_id.to_bcs_bytes()?);
        hasher.update(name);
        hasher.update(name.len().to_bcs_bytes()?);
        hasher.update(manufacturer.to_bcs_bytes()?);
        hasher.update(blob_hash.to_bcs_bytes()?);
        hasher.update(num_registered_products.to_bcs_bytes()?);

        Ok(TokenId {
            id: hasher.finalize().to_vec(),
        })
    }
}

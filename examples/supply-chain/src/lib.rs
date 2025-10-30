// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/*! ABI of the Supply Chain Management Application */

use std::fmt::{Display, Formatter};

use async_graphql::{Enum, InputObject, Request, Response, SimpleObject};
use fungible::Account;
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{
        AccountOwner, ApplicationId, ChainId, ContractAbi, DataBlobHash, ServiceAbi, Timestamp,
    },
    ToBcsBytes,
};
use serde::{Deserialize, Serialize};

/// Product status in the supply chain
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum ProductStatus {
    /// Product has been registered but not yet moved
    Registered,
    /// Product is currently in transit between locations
    InTransit,
    /// Product has been delivered to destination
    Delivered,
    /// Product has passed quality verification
    Verified,
    /// Product has failed verification or been rejected
    Rejected,
}

/// Geographic coordinates for tracking locations
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, SimpleObject, InputObject)]
#[graphql(input_name = "GeoLocationInput")]
#[serde(rename_all = "camelCase")]
pub struct GeoLocation {
    /// Latitude coordinate (-90 to 90)
    pub latitude: f64,
    /// Longitude coordinate (-180 to 180)
    pub longitude: f64,
}

/// A checkpoint records a status or location update for a product
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, SimpleObject)]
#[serde(rename_all = "camelCase")]
pub struct Checkpoint {
    /// When this checkpoint was created
    pub timestamp: Timestamp,
    /// Location or facility name
    pub location: String,
    /// Geographic coordinates (optional)
    pub geo_location: Option<GeoLocation>,
    /// Product status at this checkpoint
    pub status: ProductStatus,
    /// Party who created this checkpoint
    pub party: AccountOwner,
    /// Optional notes or details
    pub notes: Option<String>,
}

/// A verification record for quality assurance
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, SimpleObject)]
#[serde(rename_all = "camelCase")]
pub struct VerificationRecord {
    /// Party who performed the verification
    pub verifier: AccountOwner,
    /// When the verification was performed
    pub timestamp: Timestamp,
    /// Whether the product passed verification
    pub passed: bool,
    /// Verification details or notes
    pub details: String,
}

/// Profile information for an account (manufacturer/supplier)
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, SimpleObject)]
#[serde(rename_all = "camelCase")]
pub struct AccountProfile {
    /// Account owner address
    pub owner: AccountOwner,
    /// Display name for the account
    pub name: String,
    /// Company or organization name (optional)
    pub company_name: Option<String>,
    /// Geographic location (optional)
    pub geo_location: Option<GeoLocation>,
    /// When this profile was registered
    pub registration_timestamp: Timestamp,
}

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
    /// Updates the status of a product and adds a checkpoint
    UpdateStatus {
        token_id: TokenId,
        new_status: ProductStatus,
        location: String,
        geo_location: Option<GeoLocation>,
        notes: Option<String>,
    },
    /// Adds a checkpoint for tracking product location/status
    AddCheckpoint {
        token_id: TokenId,
        location: String,
        geo_location: Option<GeoLocation>,
        status: ProductStatus,
        notes: Option<String>,
    },
    /// Verifies a product (quality check)
    VerifyProduct {
        token_id: TokenId,
        passed: bool,
        details: String,
    },
    /// Marks a product as rejected
    RejectProduct {
        token_id: TokenId,
        reason: String,
    },
    /// Register or update account profile with geolocation
    RegisterAccountProfile {
        name: String,
        company_name: Option<String>,
        geo_location: Option<GeoLocation>,
    },
    /// Update account geolocation
    UpdateAccountLocation {
        geo_location: GeoLocation,
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

#[derive(Debug, Serialize, Deserialize, Clone, SimpleObject, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Product {
    pub token_id: TokenId,
    pub owner: AccountOwner,
    pub name: String,
    pub manufacturer: AccountOwner,
    pub blob_hash: DataBlobHash,
    /// Current status of the product
    pub status: ProductStatus,
    /// History of checkpoints (location and status updates)
    pub checkpoints: Vec<Checkpoint>,
    /// History of quality verifications
    pub verifications: Vec<VerificationRecord>,
}

#[derive(Debug, Serialize, Deserialize, Clone, SimpleObject, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProductOutput {
    pub token_id: String,
    pub owner: AccountOwner,
    pub name: String,
    pub manufacturer: AccountOwner,
    pub payload: Vec<u8>,
    /// Current product status
    pub status: ProductStatus,
    /// Checkpoint history
    pub checkpoints: Vec<Checkpoint>,
    /// Verification history
    pub verifications: Vec<VerificationRecord>,
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
            status: product.status,
            checkpoints: product.checkpoints,
            verifications: product.verifications,
        }
    }

    pub fn new_with_token_id(token_id: String, product: Product, payload: Vec<u8>) -> Self {
        Self {
            token_id,
            owner: product.owner,
            name: product.name,
            manufacturer: product.manufacturer,
            payload,
            status: product.status,
            checkpoints: product.checkpoints,
            verifications: product.verifications,
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

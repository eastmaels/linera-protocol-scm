// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use std::collections::BTreeSet;

use async_graphql::SimpleObject;
use linera_sdk::{
    linera_base_types::AccountOwner,
    views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext},
};
use supply_chain::{AccountProfile, Product, TokenId};

/// The application state.
#[derive(RootView, SimpleObject)]
#[view(context = ViewStorageContext)]
pub struct SupplyChainState {
    // Map from token ID (product serial number) to the Product data
    pub products: MapView<TokenId, Product>,
    // Map from owners (custodians) to the set of product token IDs they currently hold
    pub owned_token_ids: MapView<AccountOwner, BTreeSet<TokenId>>,
    // Counter of products registered in this chain, used for hash uniqueness
    pub num_registered_products: RegisterView<u64>,
    // Map from account owner to their profile (name, geolocation, etc.)
    pub account_profiles: MapView<AccountOwner, AccountProfile>,
}

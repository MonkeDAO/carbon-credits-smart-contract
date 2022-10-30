pub mod carbon_credit;
pub mod delete_config;
pub mod expire_carbon_credit;
pub mod init_config;

pub use carbon_credit::*;
pub use delete_config::*;
pub use expire_carbon_credit::*;
pub use init_config::*;

use anchor_lang::prelude::*;
use mpl_token_metadata::state::{self};

#[derive(Clone)]
/// Token metadata program struct.
pub struct TokenMetadata;

impl Id for TokenMetadata {
    fn id() -> Pubkey {
        mpl_token_metadata::ID
    }
}

#[derive(Clone)]
/// Wrapper for [mpl_token_metadata::state::Metadata] account.
pub struct MetadataAccount(state::Metadata);

impl MetadataAccount {
    pub const LEN: usize = state::MAX_METADATA_LEN;
}

impl AccountDeserialize for MetadataAccount {
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> Result<Self> {
        state::Metadata::deserialize(buf)
            .map_err(|_| ErrorCode::AccountDidNotDeserialize.into())
            .map(MetadataAccount)
    }
}

impl AccountSerialize for MetadataAccount {}

impl Owner for MetadataAccount {
    fn owner() -> Pubkey {
        TokenMetadata::id()
    }
}

impl std::ops::Deref for MetadataAccount {
    type Target = state::Metadata;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

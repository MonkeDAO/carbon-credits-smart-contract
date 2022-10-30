use super::MetadataAccount;
use super::TokenMetadata;
use crate::state::CarbonReceipt;
use anchor_lang::prelude::Pubkey;
use anchor_lang::{solana_program::program::invoke_signed, Key};
use anchor_spl::{associated_token::AssociatedToken, token::Mint};
use mpl_token_metadata::state::DataV2;
use {
    crate::{constants::*, errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
};
#[derive(Accounts)]
pub struct ExpireCarbonCreditCtx<'info> {
    #[account(mut, constraint = admin.key.to_string() == ADMIN_PUBKEY_STR @ ErrorCode::IncorrectAdmin)]
    pub admin: Signer<'info>,
    #[account(mut)]
    /// CHECK:
    pub user: AccountInfo<'info>,
    #[account(mut)]
    carbon_receipt: Box<Account<'info, CarbonReceipt>>,
    #[account(mut, seeds = [CONFIG_PREFIX.as_bytes()], bump)]
    mint_config: Box<Account<'info, MintConfig>>,
    #[account(mut)]
    pub nft_mint: Box<Account<'info, Mint>>,
    #[account(mut,
        seeds = ["metadata".as_ref(), nft_program_id.key().as_ref(), nft_mint.key().as_ref()],
        seeds::program = nft_program_id.key(),
        bump)]
    /// CHECK:
    pub nft_metadata: Box<Account<'info, MetadataAccount>>,
    #[account(mut, seeds = [CARBON_CREDIT_NFT_CREATOR.as_bytes()],
    bump)]
    /// CHECK:
    pub new_nft_creator: AccountInfo<'info>,
    /// CHECK:
    pub token_program: AccountInfo<'info>,
    /// CHECK:
    pub nft_program_id: Program<'info, TokenMetadata>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    /// CHECK:
    pub rent: AccountInfo<'info>,
    pub time: Sysvar<'info, Clock>,
}

pub fn handler(ctx: Context<ExpireCarbonCreditCtx>) -> Result<()> {
    let mint_config = &ctx.accounts.mint_config;
    // expire carbon credit receipt
    let carbon_receipt = &mut ctx.accounts.carbon_receipt;
    carbon_receipt.is_expired = true;

    // modify the metadata

    let curr_metadata = &ctx.accounts.nft_metadata;
    let program_key = &ctx.accounts.nft_program_id;
    let new_nft_creator = &ctx.accounts.new_nft_creator;
    let new_data = DataV2 {
        name: "Expired Carbon Credit Proof".to_string(),
        symbol: "E-CARBON".to_string(),
        uri: EXPIRED_NFT_URI.to_string(),
        seller_fee_basis_points: curr_metadata.data.seller_fee_basis_points.clone(),
        creators: curr_metadata.data.creators.clone(),
        collection: curr_metadata.collection.clone(),
        uses: None,
    };

    let signer_seeds = [
        CARBON_CREDIT_NFT_CREATOR.as_bytes(),
        &[mint_config.new_nft_creator_bump],
    ];
    let update_ix = mpl_token_metadata::instruction::update_metadata_accounts_v2(
        program_key.key(),
        curr_metadata.key(),
        new_nft_creator.key(),
        Some(new_nft_creator.key()),
        Some(new_data),
        None,
        None,
    );
    invoke_signed(
        &update_ix,
        &[
            program_key.to_account_info(),
            curr_metadata.to_account_info(),
            new_nft_creator.to_account_info(),
        ],
        &[&signer_seeds],
    )?;
    Ok(())
}

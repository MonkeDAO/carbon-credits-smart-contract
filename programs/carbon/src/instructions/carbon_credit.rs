use super::TokenMetadata;
use crate::state::CarbonReceipt;
use crate::state::CARBON_RECEIPT_SIZE;
use anchor_lang::prelude::Pubkey;
use anchor_lang::{solana_program::program::invoke_signed, Key};
use anchor_spl::token;
use anchor_spl::token::Transfer;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, TokenAccount},
};
use {
    crate::{constants::*, errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    mpl_token_metadata::{
        instruction::{create_master_edition, create_metadata_accounts},
        state::Creator,
    },
};
#[derive(Accounts)]
pub struct CarbonCreditCtx<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, constraint = mint_config.purchase_token_mint == purchase_token_mint.key())]
    pub purchase_token_mint: Box<Account<'info, Mint>>,
    #[account(mut, constraint =
        purchase_token_account.mint == purchase_token_mint.key()
        && purchase_token_account.owner == user.key()
        @ ErrorCode::InvalidUserPurchaseMintTokenAccount
    )]
    purchase_token_account: Box<Account<'info, TokenAccount>>,
    #[account(init, space=CARBON_RECEIPT_SIZE, payer=user)]
    carbon_receipt: Box<Account<'info, CarbonReceipt>>,
    #[account(mut, seeds = [CONFIG_PREFIX.as_bytes()], bump)]
    mint_config: Box<Account<'info, MintConfig>>,
    #[account(mut)]
    pub new_nft_mint: Box<Account<'info, Mint>>,
    #[account(mut,
        seeds = ["metadata".as_ref(), nft_program_id.key().as_ref(), new_nft_mint.key().as_ref()],
        seeds::program = nft_program_id.key(),
        bump)]
    /// CHECK:
    pub new_nft_metadata: AccountInfo<'info>,
    #[account(mut,
        seeds = ["metadata".as_ref(), nft_program_id.key().as_ref(), new_nft_mint.key().as_ref(), "edition".as_ref()],
        seeds::program = nft_program_id.key(),
        bump)]
    /// CHECK:
    pub new_nft_master_edition: AccountInfo<'info>,
    #[account(mut, seeds = [CARBON_CREDIT_NFT_CREATOR.as_bytes()],
    bump)]
    /// CHECK:
    pub new_nft_creator: AccountInfo<'info>,
    /// CHECK:
    #[account(mut, constraint = admin.key.to_string() == ADMIN_PUBKEY_STR @ ErrorCode::IncorrectAdmin)]
    pub admin: AccountInfo<'info>,
    #[account(
        mut,
        constraint = admin_spl_token_account.owner == admin.key(),
        constraint = admin_spl_token_account.mint == purchase_token_mint.key(),
    )]
    pub admin_spl_token_account: Box<Account<'info, TokenAccount>>,
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

impl<'info> CarbonCreditCtx<'info> {
    pub fn into_admin_spl_token_account_ctx(
        &self,
    ) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = token::Transfer {
            from: self.purchase_token_account.to_account_info(),
            to: self.admin_spl_token_account.to_account_info(),
            authority: self.user.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }
}

pub fn handler(ctx: Context<CarbonCreditCtx>, amount: u64) -> Result<()> {
    let mint_config = &ctx.accounts.mint_config;
    // initialize carbon credit receipt
    let carbon_receipt = &mut ctx.accounts.carbon_receipt;
    carbon_receipt.buyer = ctx.accounts.user.key();
    carbon_receipt.time = Clock::get().unwrap().unix_timestamp;
    carbon_receipt.amount = amount;
    carbon_receipt.mint = ctx.accounts.new_nft_mint.key();
    carbon_receipt.is_expired = false;
    carbon_receipt.is_fulfilled = false;

    // transfer purchase token to admin
    let token_amount = amount.checked_mul(mint_config.one_credit_price).unwrap();
    token::transfer(
        ctx.accounts.into_admin_spl_token_account_ctx(),
        token_amount,
    )?;
    msg!("transferred: {}", token_amount);

    // mint the carbon NFT
    let token_metadata_program = &ctx.accounts.nft_program_id;
    let rent = &ctx.accounts.rent;
    let system_program = &ctx.accounts.system_program;
    let new_nft_mint = &ctx.accounts.new_nft_mint;
    let new_nft_master_edition = &ctx.accounts.new_nft_master_edition;
    let new_nft_metadata = &ctx.accounts.new_nft_metadata;
    let new_nft_creator = &ctx.accounts.new_nft_creator;
    let new_nft_authority_seeds = [
        CARBON_CREDIT_NFT_CREATOR.as_bytes(),
        &[mint_config.new_nft_creator_bump],
    ];

    // set royalty for new NFT from config creator
    let creators: Vec<Creator> = vec![
        Creator {
            address: new_nft_creator.key(),
            verified: true,
            share: 0,
        },
        Creator {
            address: mint_config.creator.key(),
            verified: false,
            share: 100,
        },
    ];

    let token_program = &ctx.accounts.token_program;
    let owner = &ctx.accounts.user;
    let metadata_create_accounts = vec![
        new_nft_metadata.to_account_info(),
        new_nft_mint.to_account_info(),
        new_nft_creator.to_account_info(),
        owner.to_account_info(),
        token_metadata_program.to_account_info(),
        token_program.to_account_info(),
        system_program.to_account_info(),
        rent.to_account_info(),
    ];

    invoke_signed(
        &create_metadata_accounts(
            token_metadata_program.key(),
            new_nft_metadata.key(),
            new_nft_mint.key(),
            owner.key(),
            owner.key(),
            new_nft_creator.key(),
            "Carbon Credit Proof".to_string(),
            "CARBON".to_string(),
            CARBON_CREDIT_NFT_URI.to_string(),
            Some(creators),
            500,
            true,
            true,
        ),
        metadata_create_accounts.as_slice(),
        &[&new_nft_authority_seeds],
    )?;

    let master_edition_create_accounts = vec![
        new_nft_master_edition.to_account_info(),
        new_nft_mint.to_account_info(),
        new_nft_creator.to_account_info(),
        owner.to_account_info(),
        new_nft_metadata.to_account_info(),
        token_metadata_program.to_account_info(),
        token_program.to_account_info(),
        system_program.to_account_info(),
        rent.to_account_info(),
    ];

    invoke_signed(
        &create_master_edition(
            token_metadata_program.key(),
            new_nft_master_edition.key(),
            new_nft_mint.key(),
            new_nft_creator.key(),
            owner.key(),
            new_nft_metadata.key(),
            owner.key(),
            Some(0),
        ),
        master_edition_create_accounts.as_slice(),
        &[&new_nft_authority_seeds],
    )?;

    Ok(())
}

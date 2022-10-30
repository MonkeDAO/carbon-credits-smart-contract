use {
    crate::{constants::*, errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct InitConfigCtx<'info> {
    #[account(init, seeds = [CONFIG_PREFIX.as_bytes()], bump, space=MINT_CONFIG_SIZE, payer=admin)]
    mint_config: Box<Account<'info, MintConfig>>,
    #[account(mut, constraint = admin.key.to_string() == ADMIN_PUBKEY_STR @ ErrorCode::NoValidSigner)]
    pub admin: Signer<'info>,
    #[account(mut, seeds = [CARBON_CREDIT_NFT_CREATOR.as_bytes()],
    bump)]
    /// CHECK:
    pub new_nft_creator: AccountInfo<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitConfigCtx>,
    creator: Pubkey,
    purchase_token_mint: Pubkey,
    one_credit_price: u64,
) -> Result<()> {
    let mint_config = &mut ctx.accounts.mint_config;
    mint_config.new_nft_creator_bump = *ctx.bumps.get("new_nft_creator").unwrap();
    mint_config.creator = creator;
    mint_config.purchase_token_mint = purchase_token_mint;
    mint_config.one_credit_price = one_credit_price;
    Ok(())
}

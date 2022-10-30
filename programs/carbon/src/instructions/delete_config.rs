use {
    crate::{constants::*, errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct DeleteConfigCtx<'info> {
    #[account(mut, seeds = [CONFIG_PREFIX.as_bytes()], bump, close=admin)]
    burn_config: Box<Account<'info, MintConfig>>,
    #[account(mut, constraint = admin.key.to_string() == ADMIN_PUBKEY_STR @ ErrorCode::NoValidSigner)]
    pub admin: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(_ctx: Context<DeleteConfigCtx>) -> Result<()> {
    Ok(())
}

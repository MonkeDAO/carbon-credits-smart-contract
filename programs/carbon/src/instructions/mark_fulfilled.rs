use crate::state::CarbonReceipt;
use {
    crate::{constants::*, errors::ErrorCode},
    anchor_lang::prelude::*,
};
#[derive(Accounts)]
pub struct MarkFulfilledCtx<'info> {
    #[account(mut, constraint = admin.key.to_string() == ADMIN_PUBKEY_STR @ ErrorCode::IncorrectAdmin)]
    pub admin: Signer<'info>,
    #[account(mut)]
    carbon_receipt: Box<Account<'info, CarbonReceipt>>,
}

pub fn handler(ctx: Context<MarkFulfilledCtx>) -> Result<()> {
    // expire carbon credit receipt
    let carbon_receipt = &mut ctx.accounts.carbon_receipt;
    carbon_receipt.is_fulfilled = true;
    Ok(())
}

pub fn handler_mark_unfulfilled(ctx: Context<MarkFulfilledCtx>) -> Result<()> {
    // expire carbon credit receipt
    let carbon_receipt = &mut ctx.accounts.carbon_receipt;
    carbon_receipt.is_fulfilled = false;
    Ok(())
}

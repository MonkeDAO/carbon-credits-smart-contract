pub mod constants;
pub mod errors;
pub mod instructions;
pub mod metadata;
pub mod state;

use anchor_lang::prelude::Pubkey;
use anchor_lang::prelude::*;

use instructions::*;

declare_id!("LCCDPD5uq2QZMeHjd71unWu6nr8no9wwjcH3qMQwXXj");

#[program]
pub mod carbon {

    use super::*;

    pub fn init_config(
        ctx: Context<InitConfigCtx>,
        creator: Pubkey,
        purchase_token_mint: Pubkey,
        one_credit_price: u64,
    ) -> Result<()> {
        init_config::handler(ctx, creator, purchase_token_mint, one_credit_price)
    }

    pub fn delete_config(ctx: Context<DeleteConfigCtx>) -> Result<()> {
        delete_config::handler(ctx)
    }

    pub fn carbon_credit(ctx: Context<CarbonCreditCtx>, amount: u64) -> Result<()> {
        carbon_credit::handler(ctx, amount)
    }

    pub fn expire_carbon_credit(ctx: Context<ExpireCarbonCreditCtx>) -> Result<()> {
        expire_carbon_credit::handler(ctx)
    }
}

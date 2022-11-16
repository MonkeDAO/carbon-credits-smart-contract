use anchor_lang::prelude::*;

#[account]
pub struct MintConfig {
    pub new_nft_creator_bump: u8,    // 1
    pub creator: Pubkey,             //32
    pub purchase_token_mint: Pubkey, //32
    pub one_credit_price: u64,       //8
}

pub const MINT_CONFIG_SIZE: usize = 8 + //key
 1 + // carbon bump
 32 + //vc
 32 + //purchase token
 8 + //one credit price
 64; //extra storage

#[account]
pub struct CarbonReceipt {
    pub buyer: Pubkey,      //32
    pub mint: Pubkey,       //32
    pub time: i64,          //8
    pub amount: u64,        //8
    pub is_expired: bool,   //1
    pub is_fulfilled: bool, //1
}

pub const CARBON_RECEIPT_SIZE: usize = 8 + //key
32 + //buyer
32 + //mint
8 + //time
8 + //amount
1 + //is_expired
1 + //is_fulfilled
31; //extra storage

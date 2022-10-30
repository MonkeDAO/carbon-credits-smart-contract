use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("No valid signer present")]
    NoValidSigner,
    #[msg("Incorrect Admin wallet")]
    IncorrectAdmin,
    #[msg("Invalid User Account for Purchase")]
    InvalidUserPurchaseMintTokenAccount,
}

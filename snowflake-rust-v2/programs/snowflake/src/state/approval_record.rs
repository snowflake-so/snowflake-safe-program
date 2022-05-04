use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct ApprovalRecord {
    pub owner: Pubkey,
    pub date: i64,
    pub is_approved: bool,
}

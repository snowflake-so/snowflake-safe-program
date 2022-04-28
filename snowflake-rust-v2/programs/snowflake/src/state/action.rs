use anchor_lang::prelude::*;

use crate::state::TargetAccountSpec;

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct Action {
    pub name: String,
    pub action_code: u32,
    pub instruction: Vec<u8>,
    pub program: Pubkey,
    pub accounts: Vec<TargetAccountSpec>,
    pub extra: String,
}

impl Action {
    pub fn target_account_metas(&self) -> Vec<AccountMeta> {
        self.accounts
            .iter()
            .map(|item| AccountMeta::from(item))
            .collect()
    }
}

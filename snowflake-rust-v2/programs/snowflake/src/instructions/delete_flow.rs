use anchor_lang::prelude::*;

use crate::state::Flow;

#[derive(Accounts)]
pub struct DeleteFlow<'info> {

    #[account(mut, has_one = owner, close=owner)]
    flow: Account<'info, Flow>,

    pub owner: Signer<'info>,
}
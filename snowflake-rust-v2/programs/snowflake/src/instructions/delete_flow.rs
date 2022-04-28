use anchor_lang::prelude::*;

use crate::state::Flow;

#[derive(Accounts)]
pub struct DeleteFlow<'info> {
    #[account(mut, has_one = requested_by, close=requested_by)]
    flow: Account<'info, Flow>,

    pub requested_by: Signer<'info>,
}

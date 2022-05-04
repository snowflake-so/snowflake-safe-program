use anchor_lang::prelude::*;

use crate::state::Flow;
use crate::state::ProposalStateType;

#[derive(Accounts)]
pub struct DeleteFlow<'info> {
    #[account(
        mut,
        has_one = requested_by,
        close = requested_by,
        constraint = 
            flow.proposal_stage != ProposalStateType::ExecutionInProgress as u8 
            && flow.proposal_stage != ProposalStateType::Complete as u8
    )]
    flow: Account<'info, Flow>,

    pub requested_by: Signer<'info>,
}

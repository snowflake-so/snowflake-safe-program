use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::{Flow, ProposalStateType, Safe};

#[derive(Accounts)]
pub struct AbortFlow<'info> {
    #[account(mut, has_one = safe @ErrorCode::InvalidSafe)]
    flow: Account<'info, Flow>,

    safe: Account<'info, Safe>,

    requested_by: Signer<'info>,
}

pub fn handler(ctx: Context<AbortFlow>) -> Result<()> {
    let flow = &mut ctx.accounts.flow;
    let safe = &ctx.accounts.safe;
    let caller = &ctx.accounts.requested_by;

    require!(
        safe.is_owner(caller.to_account_info().key),
        ErrorCode::InvalidOwner
    );

    require!(
        flow.proposal_stage == ProposalStateType::ExecutionInProgress as u8,
        ErrorCode::RequestIsNotExecutedYet
    );

    let now = Clock::get()?.unix_timestamp;
    flow.proposal_stage = ProposalStateType::Aborted as u8;
    flow.last_updated_date = now;

    Ok(())
}

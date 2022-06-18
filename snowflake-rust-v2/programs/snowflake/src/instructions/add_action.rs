use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::{Flow, Action, ProposalStateType};

#[derive(Accounts)]
#[instruction(client_action: Action)]
pub struct AddAction<'info> {
    #[account(
       mut, 
       has_one = requested_by
    )]
    flow: Account<'info, Flow>,

    requested_by: Signer<'info>,
}

pub fn handler(ctx: Context<AddAction>, client_action: Action) -> Result<()> {
    let flow = &mut ctx.accounts.flow;

    require!(flow.approvals.len() == 0, ErrorCode::MutableFlowApproverExceedsZeroSize);
    require!(
      flow.proposal_stage == ProposalStateType::Pending as u8,
      ErrorCode::MutableFlowIsNotPending
    );

    let now = Clock::get()?.unix_timestamp;
    flow.actions.push(client_action);
    flow.last_updated_date = now;

    Ok(())
}

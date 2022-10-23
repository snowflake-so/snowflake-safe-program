use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::{Action, Flow, ProposalStateType};

#[derive(Accounts)]
pub struct AddAction<'info> {
    #[account(mut, has_one = requested_by)]
    flow: Account<'info, Flow>,

    requested_by: Signer<'info>,
}

pub fn handler(ctx: Context<AddAction>, client_action: Action, finish_draft: bool) -> Result<()> {
    let flow = &mut ctx.accounts.flow;

    require!(
        flow.approvals.len() == 0,
        ErrorCode::FlowMustHaveZeroApproverBeforeUpdate
    );
    require!(
        flow.proposal_stage == ProposalStateType::Draft as u8,
        ErrorCode::FlowMustBeInDraftedBeforeUpdate
    );

    let now = Clock::get()?.unix_timestamp;
    flow.actions.push(client_action);
    if finish_draft {
        flow.proposal_stage = ProposalStateType::Pending as u8;
    }
    flow.last_updated_date = now;

    Ok(())
}

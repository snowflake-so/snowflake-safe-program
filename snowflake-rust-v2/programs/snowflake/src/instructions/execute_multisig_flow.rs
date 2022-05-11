use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::instructions::{do_execute_multisig_flow, ExecuteMultisigFlow};
use crate::state::static_config::{ProposalStateType, TriggerType};

pub fn handler(ctx: Context<ExecuteMultisigFlow>) -> Result<()> {
    validate_multisig_flow_before_execute(&ctx)?;

    let mut result = Ok(());
    let now = Clock::get()?.unix_timestamp;
    if ctx.accounts.flow.trigger_type == TriggerType::Manual as u8 {
        result = do_execute_multisig_flow::handler(&ctx);
        let flow = &mut ctx.accounts.flow;
        flow.proposal_stage = ProposalStateType::Complete as u8;
        flow.last_updated_date = now;
    } else {
        let flow = &mut ctx.accounts.flow;
        if flow.trigger_type == TriggerType::Time as u8 {
            flow.update_next_execution_time(now);
        }
        flow.proposal_stage = ProposalStateType::ExecutionInProgress as u8;
        flow.last_updated_date = now;
    }

    result
}

pub fn validate_multisig_flow_before_execute(ctx: &Context<ExecuteMultisigFlow>) -> Result<()> {
    let safe = &ctx.accounts.safe;
    let flow = &ctx.accounts.flow;
    let caller = &ctx.accounts.caller;
    let execute_by_safe_owner = safe.is_owner(&caller.key());

    require!(execute_by_safe_owner, ErrorCode::InvalidOwner);
    require!(
        flow.get_approvals() >= safe.approvals_required,
        ErrorCode::FlowNotEnoughApprovals
    );
    require!(
        flow.proposal_stage == ProposalStateType::Approved as u8,
        ErrorCode::RequestIsNotApprovedYet
    );

    let now = Clock::get()?.unix_timestamp;
    require!(now <= flow.expiry_date, ErrorCode::JobIsExpired);

    Ok(())
}

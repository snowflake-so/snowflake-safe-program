use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::instructions::{do_execute_multisig_flow, ExecuteMultisigFlow};
use crate::state::static_config::{ProposalStateType, TriggerType};

pub fn handler(ctx: Context<ExecuteMultisigFlow>) -> Result<()> {
    validate_multisig_flow_before_execute(&ctx)?;

    let result = do_execute_multisig_flow::handler(&ctx);
    let flow = &mut ctx.accounts.flow;
    flow.proposal_stage = ProposalStateType::Complete as u8;
    flow.last_updated_date = Clock::get()?.unix_timestamp;
    result
}

pub fn validate_multisig_flow_before_execute(ctx: &Context<ExecuteMultisigFlow>) -> Result<()> {
    let safe = &ctx.accounts.safe;
    let flow = &ctx.accounts.flow;
    let caller = &ctx.accounts.caller;
    let execute_by_safe_owner = safe.is_owner(&caller.key());

    require!(
        flow.trigger_type == TriggerType::Manual as u8,
        ErrorCode::InvalidExecutionType
    );
    require!(execute_by_safe_owner, ErrorCode::InvalidOwner);

    validate_before_execute(ctx)
}

pub fn validate_before_execute(ctx: &Context<ExecuteMultisigFlow>) -> Result<()> {
    let safe = &ctx.accounts.safe;
    let flow = &ctx.accounts.flow;

    require!(safe.key() == flow.safe, ErrorCode::InvalidSafe);
    require!(
        flow.proposal_stage != ProposalStateType::Complete as u8
            && flow.proposal_stage != ProposalStateType::Failed as u8,
        ErrorCode::RequestIsExecutedAlready
    );
    require!(
        flow.proposal_stage != ProposalStateType::Rejected as u8,
        ErrorCode::RequestIsRejected
    );
    require!(
        flow.get_approvals() >= safe.approvals_required,
        ErrorCode::FlowNotEnoughApprovals
    );
    require!(
        flow.proposal_stage == ProposalStateType::Approved as u8
            || flow.proposal_stage == ProposalStateType::ExecutionInProgress as u8,
        ErrorCode::RequestIsNotApprovedYet
    );

    if flow.proposal_stage == ProposalStateType::Approved as u8 {
        let now = Clock::get()?.unix_timestamp;
        require!(now <= flow.expiry_date, ErrorCode::JobIsExpired);
    }

    Ok(())
}

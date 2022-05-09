use anchor_lang::prelude::*;

use crate::common::charge_fee;
use crate::error::ErrorCode;
use crate::instructions::{do_execute_multisig_flow, ExecuteMultisigFlow};
use crate::state::static_config::ProposalStateType;

pub fn handler<'info>(ctx: Context<ExecuteMultisigFlow>, is_successful_run: bool) -> Result<()> {
    validate_scheduled_multisig_flow_before_execute(&ctx)?;
    charge_fee(&ctx)?;

    let now = Clock::get()?.unix_timestamp;
    let flow = &ctx.accounts.flow;
    let mut result = Ok(());

    if is_successful_run {
        require!(
            flow.is_due_for_execute(now),
            ErrorCode::JobIsNotDueForExecution
        );
        result = do_execute_multisig_flow::handler(&ctx);
    } else {
        require!(
            flow.is_schedule_expired(now),
            ErrorCode::CannotMarkJobAsErrorIfItsWithinSchedule
        );
    }

    let flow = &mut ctx.accounts.flow;
    flow.update_after_schedule_run(now, is_successful_run);
    if !flow.has_remaining_runs() {
        flow.proposal_stage = ProposalStateType::Complete as u8;
    }
    flow.last_updated_date = now;

    result
}

pub fn validate_scheduled_multisig_flow_before_execute(
    ctx: &Context<ExecuteMultisigFlow>,
) -> Result<()> {
    let flow = &ctx.accounts.flow;

    require!(
        flow.proposal_stage == ProposalStateType::ExecutionInProgress as u8,
        ErrorCode::RequestIsNotExecutedYet
    );

    Ok(())
}

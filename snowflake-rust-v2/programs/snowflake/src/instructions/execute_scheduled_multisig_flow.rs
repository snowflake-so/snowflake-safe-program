use anchor_lang::prelude::*;

use crate::common::charge_fee;
use crate::error::ErrorCode;
use crate::instructions::{do_execute_multisig_flow, validate_before_execute, ExecuteMultisigFlow};
use crate::state::static_config::{ProposalStateType, TriggerType};

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
    flow.proposal_stage = if flow.has_remaining_runs() {
        ProposalStateType::ExecutionInProgress as u8
    } else {
        ProposalStateType::Complete as u8
    };
    flow.last_updated_date = now;

    result
}

pub fn validate_scheduled_multisig_flow_before_execute(
    ctx: &Context<ExecuteMultisigFlow>,
) -> Result<()> {
    let flow = &ctx.accounts.flow;

    require!(
        flow.trigger_type != TriggerType::Manual as u8,
        ErrorCode::InvalidExecutionType
    );

    validate_before_execute(ctx)
}

use anchor_lang::prelude::*;

use crate::common::charge_fee;
use crate::error::ErrorCode;
use crate::instructions::{do_execute_flow, ExecuteFlow};

pub fn handler<'info>(ctx: Context<'_,'_,'_, 'info, ExecuteFlow<'info>>) -> ProgramResult {
    let pda_bump = *ctx.bumps.get("pda").unwrap();
    charge_fee(&ctx, pda_bump)?;

    let operator = &ctx.accounts.caller;
    let program_settings = &ctx.accounts.program_settings;
    let flow = &mut ctx.accounts.flow;
    let now = Clock::get()?.unix_timestamp;

    require!(program_settings.can_operator_excecute_flow(&flow.key(), operator.key), ErrorCode::JobIsNotAssignedToOperator);

    require!(flow.is_due_for_execute(now), ErrorCode::JobIsNotDueForExecution);

    flow.update_after_schedule_run(now, true);

    do_execute_flow::handler(ctx, pda_bump)
}
use anchor_lang::prelude::*;

use crate::common::charge_fee;
use crate::error::ErrorCode;
use crate::instructions::ExecuteMultisigFlow;

pub fn handler(ctx: Context<ExecuteMultisigFlow>) -> Result<()> {
    charge_fee(&ctx)?;

    let now = Clock::get()?.unix_timestamp;
    let flow = &mut ctx.accounts.flow;
    
    // let operator = &ctx.accounts.caller;
    // let program_settings = &ctx.accounts.program_settings;
    // require!(program_settings.can_operator_excecute_flow(&flow.key(), operator.key), ErrorCode::JobIsNotAssignedToOperator);

    require!(flow.is_schedule_expired(now), ErrorCode::CannotMarkJobAsErrorIfItsWithinSchedule);

    flow.update_after_schedule_run(now, false);

    Ok(())
}
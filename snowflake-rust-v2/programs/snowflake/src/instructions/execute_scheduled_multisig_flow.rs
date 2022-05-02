use anchor_lang::prelude::*;

use crate::common::charge_fee;
use crate::error::ErrorCode;
use crate::instructions::{do_execute_multisig_flow, ExecuteMultisigFlow};
use crate::state::static_config::ProposalStateType;

pub fn handler<'info>(ctx: Context<ExecuteMultisigFlow>) -> Result<()> {
    charge_fee(&ctx)?;

    let now = Clock::get()?.unix_timestamp;
    let flow = &ctx.accounts.flow;
    
    // let operator = &ctx.accounts.caller;
    // require!(program_settings.can_operator_excecute_flow(&flow.key(), operator.key), ErrorCode::JobIsNotAssignedToOperator);
    
    require!(flow.is_due_for_execute(now), ErrorCode::JobIsNotDueForExecution);
    
    let result = do_execute_multisig_flow::handler(&ctx);
    let flow = &mut ctx.accounts.flow;
    flow.update_after_schedule_run(now, true);
    
    if !flow.has_remaining_runs() {
        flow.proposal_stage = ProposalStateType::Complete as u8;
    }

    result
}
use anchor_lang::prelude::*;
use crate::error::ErrorCode;
use crate::instructions::{do_execute_flow, ExecuteFlow};

pub fn handler<'info>(ctx: Context<'_,'_,'_, 'info, ExecuteFlow<'info>>) -> Result<()> {
    let pda_bump = *ctx.bumps.get("pda").unwrap();

    require!(ctx.accounts.caller.key().eq(&ctx.accounts.flow.owner), ErrorCode::ExecuteNowCanOnlyBePerformedByFlowOwner);

    do_execute_flow::handler(ctx, pda_bump)
}
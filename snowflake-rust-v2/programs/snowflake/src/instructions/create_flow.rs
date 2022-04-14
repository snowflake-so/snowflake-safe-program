use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::{Flow, ProposalStateType, Safe};

#[derive(Accounts)]
#[instruction(account_size : u32, client_flow: Flow)]
pub struct CreateFlow<'info> {
    #[account(init, payer = owner, space = account_size as usize)]
    flow: Account<'info, Flow>,

    #[account(mut)]
    safe: Account<'info, Safe>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateFlow>, account_size: u32, client_flow: Flow) -> ProgramResult {
    let flow = &mut ctx.accounts.flow;
    let owner = &ctx.accounts.owner;
    flow.owner = ctx.accounts.owner.key();

    // TODO Version 2: Create Flow handler
    let safe = &mut ctx.accounts.safe;
    require!(safe.is_owner(&owner.key()), ErrorCode::InvalidOwner);
    flow.safe = safe.key();
    flow.signers = Vec::new();
    flow.proposal_stage = ProposalStateType::Pending as u8;

    let now = Clock::get()?.unix_timestamp;
    flow.created_date = now;
    flow.last_updated_date = now;
    flow.apply_flow_data(client_flow, now);

    require!(flow.validate_flow_data(), ErrorCode::InvalidJobData);
    Ok(())
}

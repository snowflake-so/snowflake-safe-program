use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::{assert_unique_owners, Safe};

#[derive(Accounts)]
#[instruction(client_safe: Safe)]
pub struct CreateSafe<'info> {
    #[account(init, payer = payer, space = Safe::space(Safe::MAX_OWNERS))]
    safe: Account<'info, Safe>,

    #[account(mut)]
    payer: Signer<'info>,

    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateSafe>, client_safe: Safe) -> Result<()> {
    let safe = &mut ctx.accounts.safe;

    require!(
        client_safe.owners.len() > 0usize,
        ErrorCode::InvalidMinOwnerCount
    );

    require!(
        client_safe.owners.len() < 64usize,
        ErrorCode::InvalidMaxOwnerCount
    );

    require!(
        client_safe.approvals_required > 0,
        ErrorCode::InvalidMinApprovalsRequired
    );

    require!(
        client_safe.approvals_required <= client_safe.owners.len() as u8,
        ErrorCode::InvalidMaxApprovalsRequired
    );

    assert_unique_owners(&client_safe.owners)?;

    require!(
        client_safe.owners.contains(&ctx.accounts.payer.key()),
        ErrorCode::CreatorIsNotAssignedToOwnerList
    );

    safe.signer_nonce = client_safe.signer_nonce;
    safe.creator = ctx.accounts.payer.key();
    safe.owners = client_safe.owners;
    safe.approvals_required = client_safe.approvals_required;
    safe.owner_set_seqno = 0;
    safe.extra = client_safe.extra;
    safe.created_at = Clock::get()?.unix_timestamp;

    Ok(())
}


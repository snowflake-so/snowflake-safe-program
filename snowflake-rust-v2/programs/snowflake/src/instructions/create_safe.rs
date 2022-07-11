use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::{assert_unique_owners, Safe, SAFE_SIGNER_PREFIX};

#[derive(Accounts)]
#[instruction(client_safe: Safe)]
pub struct CreateSafe<'info> {
    #[account(init, payer = payer, space = Safe::space(Safe::MAX_OWNERS, client_safe.extra))]
    safe: Account<'info, Safe>,

    /// CHECK: must be a valid PDA of safe
    #[account(
        seeds = [
            SAFE_SIGNER_PREFIX.as_ref(),
            safe.key().as_ref()
        ],
        bump = client_safe.signer_bump
    )]
    pub safe_signer: AccountInfo<'info>,

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
        client_safe.owners.len() < Safe::MAX_OWNERS.into(),
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

    safe.signer_bump = client_safe.signer_bump;
    safe.creator = ctx.accounts.payer.key();
    safe.owners = client_safe.owners;
    safe.approvals_required = client_safe.approvals_required;
    safe.owner_set_seqno = 0;
    safe.extra = client_safe.extra;
    safe.created_at = Clock::get()?.unix_timestamp;

    Ok(())
}

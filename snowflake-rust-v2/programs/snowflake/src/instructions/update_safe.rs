use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::Safe;
use crate::{assert_removed_owner, assert_unique_owners};

#[derive(Accounts)]
pub struct AuthSafe<'info> {
    #[account(mut)]
    pub safe: Account<'info, Safe>,

    #[account(
        seeds = [
            // b"SafeSigner",
            &[124, 127, 208, 38, 30, 47, 232, 166],
            safe.to_account_info().key.as_ref(),
        ],
        bump = safe.signer_nonce
    )]
    pub safe_signer: Signer<'info>,
}

pub fn add_owner_handler(ctx: Context<AuthSafe>, owner: Pubkey) -> Result<()> {
    let safe = &mut ctx.accounts.safe;
    let mut safe_owners = safe.owners.to_vec();
    safe_owners.push(owner);

    assert_unique_owners(&safe_owners)?;
    require!(safe_owners.len() < 64usize, ErrorCode::InvalidMaxOwnerCount);

    safe.owners = safe_owners;
    safe.owner_set_seqno += 1;

    Ok(())
}

pub fn remove_owner_handler(ctx: Context<AuthSafe>, owner: Pubkey) -> Result<()> {
    let safe = &mut ctx.accounts.safe;
    let mut safe_owners = safe.owners.to_vec();
    safe_owners.retain(|safe_owner| *safe_owner != owner);

    assert_removed_owner(&safe_owners, &owner)?;
    require!(safe_owners.len() > 0usize, ErrorCode::InvalidMinOwnerCount);

    if (safe_owners.len() as u8) < safe.approvals_required {
        safe.approvals_required = safe_owners.len() as u8;
    }

    safe.owners = safe_owners;
    safe.owner_set_seqno += 1;

    Ok(())
}

pub fn change_threshold_handler(ctx: Context<AuthSafe>, approvals_required: u8) -> Result<()> {
    let safe = &mut ctx.accounts.safe;

    require!(
        approvals_required > 0,
        ErrorCode::InvalidMinApprovalsRequired
    );
    require!(
        approvals_required <= safe.owners.len() as u8,
        ErrorCode::InvalidMaxApprovalsRequired
    );

    safe.approvals_required = approvals_required;
    safe.owner_set_seqno += 1;

    Ok(())
}

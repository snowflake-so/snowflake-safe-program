use anchor_lang::prelude::*;

use crate::assert_unique_owners;
use crate::error::ErrorCode;
use crate::state::Safe;

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

pub fn set_owners_handler(ctx: Context<AuthSafe>, owners: Vec<Pubkey>) -> Result<()> {
    let safe = &mut ctx.accounts.safe;

    assert_unique_owners(&owners)?;
    require!(owners.len() > 0usize, ErrorCode::InvalidMinOwnerCount);
    require!(owners.len() < 64usize, ErrorCode::InvalidMaxOwnerCount);

    if (owners.len() as u8) < safe.approvals_required {
        safe.approvals_required = owners.len() as u8;
    }

    safe.owners = owners;
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

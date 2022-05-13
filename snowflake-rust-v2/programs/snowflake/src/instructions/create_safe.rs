use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::Safe;

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

    let is_creator_exist = client_safe
        .owners
        .iter()
        .any(|owner| *owner == ctx.accounts.payer.key());
    require!(is_creator_exist, ErrorCode::CreatorIsNotAssignedToOwnerList);

    let now = Clock::get()?.unix_timestamp;
    safe.signer_nonce = client_safe.signer_nonce;
    safe.created_at = now;
    safe.creator = ctx.accounts.payer.key();
    safe.owners = client_safe.owners;
    safe.approvals_required = client_safe.approvals_required;
    safe.owner_set_seqno = 0;
    safe.extra = client_safe.extra;

    Ok(())
}

pub fn assert_unique_owners(owners: &[Pubkey]) -> Result<()> {
    for (i, owner) in owners.iter().enumerate() {
        require!(
            !owners.iter().skip(i + 1).any(|item| item == owner),
            ErrorCode::DuplicateOwnerInSafe
        )
    }
    Ok(())
}

pub fn assert_removed_owner(owners: &[Pubkey], asserted_owner: &Pubkey) -> Result<()> {
    for (_i, owner) in owners.iter().enumerate() {
        require!(owner != asserted_owner, ErrorCode::OwnerIsNotRemoved)
    }
    Ok(())
}

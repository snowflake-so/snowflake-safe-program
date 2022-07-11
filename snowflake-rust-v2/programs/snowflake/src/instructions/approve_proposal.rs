use crate::error::ErrorCode;
use crate::state::{ApprovalRecord, Flow, ProposalStateType, Safe};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ApproveProposal<'info> {
    #[account(constraint = safe.owner_set_seqno == flow.owner_set_seqno)]
    safe: Account<'info, Safe>,

    #[account(mut, has_one = safe @ErrorCode::InvalidSafe)]
    flow: Account<'info, Flow>,

    #[account(mut)]
    caller: Signer<'info>,
}

pub fn handler(ctx: Context<ApproveProposal>, is_approved: bool) -> Result<()> {
    let flow = &mut ctx.accounts.flow;
    let safe = &ctx.accounts.safe;
    let caller = &mut ctx.accounts.caller;
    let total_owners = safe.owners.len() as u8;

    require!(safe.is_owner(&caller.key()), ErrorCode::InvalidOwner);
    require!(
        flow.approvals.len() < total_owners as usize,
        ErrorCode::ExceedLimitProposalSignatures
    );

    require!(
        flow.is_new_owner_approval(&caller.key()),
        ErrorCode::AddressSignedAlready
    );

    let now = Clock::get()?.unix_timestamp;
    require!(now <= flow.expiry_date, ErrorCode::JobIsExpired);

    flow.approvals.push(ApprovalRecord {
        date: now,
        is_approved,
        owner: *caller.to_account_info().key,
    });

    let approvals = flow.get_approvals();
    let unsigned_owners = total_owners
        .checked_sub(flow.approvals.len() as u8)
        .unwrap();
    if safe.approvals_required.checked_sub(approvals).unwrap() > unsigned_owners {
        flow.proposal_stage = ProposalStateType::Rejected as u8;
    }

    if approvals == safe.approvals_required {
        flow.proposal_stage = ProposalStateType::Approved as u8;
    }
    flow.last_updated_date = now;

    Ok(())
}

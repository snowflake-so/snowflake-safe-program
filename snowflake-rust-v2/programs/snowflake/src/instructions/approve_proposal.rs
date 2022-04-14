use crate::error::ErrorCode;
use crate::state::{Flow, ProposalStateType, Safe};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(is_approved: bool)]
pub struct ApproveProposal<'info> {
 pub safe: Account<'info, Safe>,

 #[account(mut)]
 pub flow: Account<'info, Flow>,

 #[account(mut)]
 pub caller: Signer<'info>,
}

pub fn handler(ctx: Context<ApproveProposal>, is_approved: bool) -> ProgramResult {
 let flow = &mut ctx.accounts.flow;
 let safe = &mut ctx.accounts.safe;
 let caller = &mut ctx.accounts.caller;
 let total_owners = safe.owners.len() as u8;

 require!(
  safe.is_owner(caller.to_account_info().key),
  ErrorCode::InvalidOwner
 );
 require!(flow.safe == safe.key(), ErrorCode::InvalidSafe);
 require!(
  flow.signers.len() < total_owners as usize,
  ErrorCode::ExceedLimitProposalSignatures
 );
 let mut is_signed_by_caller = false;
 for signer in flow.signers.iter() {
  if signer == caller.to_account_info().key {
   is_signed_by_caller = true;
  }
 }

 require!(!is_signed_by_caller, ErrorCode::AddressSignedAlready);
 flow.approvals.push(is_approved);
 flow.signers.push(*caller.to_account_info().key);

 let approvals = flow.get_approvals();
 if safe.approvals_required - approvals > total_owners - flow.signers.len() as u8 {
  flow.proposal_stage = ProposalStateType::Rejected as u8;
 }

 if approvals == safe.approvals_required {
  flow.proposal_stage = ProposalStateType::Approved as u8;
 }

 Ok(())
}

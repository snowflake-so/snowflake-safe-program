use crate::error::ErrorCode;
use crate::state::Safe;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(owners: Vec<Pubkey>, approvals_required: u8)]
pub struct UpdateSafe<'info> {
 #[account[mut]]
 pub safe: Account<'info, Safe>,

 #[account(mut)]
 pub caller: Signer<'info>,
}

pub fn handler(
 ctx: Context<UpdateSafe>,
 owners: Vec<Pubkey>,
 approvals_required: u8,
) -> ProgramResult {
 let safe = &mut ctx.accounts.safe;
 let caller = &mut ctx.accounts.caller;

 require!(safe.is_owner(&caller.key()), ErrorCode::InvalidOwner);

 require!(owners.len() > 0usize, ErrorCode::InvalidMinOwnerCount);

 require!(owners.len() < 64usize, ErrorCode::InvalidMaxOwnerCount);

 require!(
  approvals_required > 0,
  ErrorCode::InvalidMinApprovalsRequired
 );

 require!(
  approvals_required <= owners.len() as u8,
  ErrorCode::InvalidMaxApprovalsRequired
 );

 let mut creator_exist = false;
 for current_owner in safe.owners.to_vec() {
  let mut occurrence = 0;
  for owner in owners.iter() {
   if owner == &safe.creator {
    creator_exist = true;
   }
   if owner == &current_owner {
    occurrence += 1;
   }
  }
  require!(occurrence <= 1, ErrorCode::DuplicateOwnerInSafe);
 }
 require!(creator_exist, ErrorCode::CreatorIsNotAssignedToOwnerList);

 safe.owners = owners;
 safe.approvals_required = approvals_required;

 Ok(())
}

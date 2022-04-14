use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::Safe;

#[derive(Accounts)]
#[instruction(safe_path: Vec<u8>, client_safe: Safe)]
pub struct CreateSafe<'info> {
 #[account(init, seeds = [
  &[79, 159, 13, 171, 205, 38, 174, 83], 
  &*safe_path
  ], bump, payer = payer, space = Safe::space())]
  safe: Account<'info, Safe>,
 
  #[account(mut)]
  pub payer: Signer<'info>,
  
 pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateSafe>, _safe_path: Vec<u8>, client_safe: Safe) -> ProgramResult {
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

 
 let mut creator_exist = false;
 for owner in client_safe.owners.iter() {
  if owner == &client_safe.creator {
   creator_exist = true;
  }
 }
 
 require!(creator_exist, ErrorCode::CreatorIsNotAssignedToOwnerList);
 
 let now = Clock::get()?.unix_timestamp;
 safe.signer_nonce = client_safe.signer_nonce;
 safe.created_at = now;
 safe.creator = ctx.accounts.payer.key();
 safe.owners = client_safe.owners;
 safe.approvals_required = client_safe.approvals_required;

 Ok(())
}

use crate::error::ErrorCode;
use crate::state::{Safe};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::system_instruction::transfer;

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct TransferNativeMultisig<'info> {
 #[account(mut)]
 pub safe: Account<'info, Safe>,

 #[account(seeds = [
   &[124, 127, 208, 38, 30, 47, 232, 166],
   safe.to_account_info().key.as_ref()
  ], bump = safe.signer_nonce)]
 pub safe_signer: AccountInfo<'info>,

 #[account(signer)]
 pub owner: AccountInfo<'info>,

 #[account(mut)]
 pub recipient: AccountInfo<'info>,

 pub system_program: AccountInfo<'info>,
}

pub fn handler<'info>(ctx: Context<TransferNativeMultisig<'info>>, amount: u64) -> ProgramResult {
 let safe = &ctx.accounts.safe;
 let safe_signer = &ctx.accounts.safe_signer;
 let recipient = &ctx.accounts.recipient;
 let owner = &ctx.accounts.owner;

 require!(safe.is_owner(owner.key), ErrorCode::InvalidOwner);

 let instruction =
  &transfer(safe_signer.to_account_info().key, recipient.key, amount);

 let seeds = &[
  &[124, 127, 208, 38, 30, 47, 232, 166],
  safe.to_account_info().key.as_ref(),
  &[safe.signer_nonce],
 ];

 let signer = &[&seeds[..]];
 invoke_signed(
  &instruction,
  &[safe_signer.to_account_info().clone(), recipient.clone()],
  signer,
 )?;

 Ok(())
}

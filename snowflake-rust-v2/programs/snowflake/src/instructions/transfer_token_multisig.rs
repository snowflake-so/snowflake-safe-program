use crate::error::ErrorCode;
use crate::state::Safe;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::{instruction::Instruction, program::invoke_signed};
use anchor_spl::token::{Token, TokenAccount};
use spl_token::instruction;

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct TransferTokenMultisig<'info> {
  pub safe: Account<'info, Safe>,

  /// CHECK: sign only
  #[account(mut, seeds = [
   &[124, 127, 208, 38, 30, 47, 232, 166],
   safe.to_account_info().key.as_ref()
  ], bump = safe.signer_nonce)]
  pub safe_signer: AccountInfo<'info>,

  /// CHECK: sign only
  #[account(signer)]
  pub owner: AccountInfo<'info>,

  #[account(mut)]
  pub source_ata: Account<'info, TokenAccount>,

  #[account(mut)]
  destination_ata: Account<'info, TokenAccount>,

  token_program: Program<'info, Token>,
}

pub fn handler<'info>(ctx: Context<TransferTokenMultisig<'info>>, amount: u64) -> Result<()> {
  let safe = &ctx.accounts.safe;
  let safe_signer = &ctx.accounts.safe_signer;
  let owner = &ctx.accounts.owner;
  let sender = &ctx.accounts.source_ata;
  let recipient = &ctx.accounts.destination_ata;

  require!(safe.is_owner(owner.key), ErrorCode::InvalidOwner);

  let ix_result: Result<Instruction> = instruction::transfer(
    ctx.accounts.token_program.key,
    &sender.key(),
    &recipient.key(),
    &safe_signer.key(),
    &[&safe_signer.key()],
    amount,
  ).map_err(Into::into);

  let ix = ix_result?;
  let seeds = &[
    &[124, 127, 208, 38, 30, 47, 232, 166],
    safe.to_account_info().key.as_ref(),
    &[safe.signer_nonce],
  ];

  let signer = &[&seeds[..]];
  invoke_signed(
    &ix,
    &[
      sender.to_account_info(),
      recipient.to_account_info(),
      safe_signer.to_account_info(),
    ],
    signer,
  )?;

  Ok(())
}

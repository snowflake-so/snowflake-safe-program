use crate::error::ErrorCode;
use crate::state::Safe;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::system_instruction::transfer;

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct TransferNativeMultisig<'info> {
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

    /// CHECK: receive only
    #[account(mut)]
    pub recipient: AccountInfo<'info>,

    /// CHECK: sign only
    pub system_program: AccountInfo<'info>,
}

pub fn handler<'info>(ctx: Context<TransferNativeMultisig<'info>>, amount: u64) -> Result<()> {
    let safe = &ctx.accounts.safe;
    let safe_signer = &ctx.accounts.safe_signer;
    let recipient = &ctx.accounts.recipient;
    let owner = &ctx.accounts.owner;

    require!(safe.is_owner(owner.key), ErrorCode::InvalidOwner);

    let instruction = &transfer(safe_signer.to_account_info().key, recipient.key, amount);

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

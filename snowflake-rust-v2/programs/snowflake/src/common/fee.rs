use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::sysvar::fees::Fees;

use crate::instructions::ExecuteMultisigFlow;
use crate::SAFE_SIGNER_PREFIX;

pub fn charge_fee(ctx: &Context<ExecuteMultisigFlow>) -> Result<()> {
    let safe = &ctx.accounts.safe;
    let fee = Fees::get().unwrap().fee_calculator.lamports_per_signature;
    let safe_signer = &ctx.accounts.safe_signer;
    let caller = &ctx.accounts.caller;

    let ix = solana_program::system_instruction::transfer(&safe_signer.key, &caller.key, fee);
    let safe_key = safe.key();
    let seeds = &[
        SAFE_SIGNER_PREFIX.as_ref(),
        safe_key.as_ref(),
        &[safe.signer_bump],
    ];
    let signer = &[&seeds[..]];
    invoke_signed(
        &ix,
        &[caller.to_account_info(), safe_signer.to_account_info()],
        signer,
    )?;

    Ok(())
}

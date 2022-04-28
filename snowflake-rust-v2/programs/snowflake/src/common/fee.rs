use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use anchor_lang::solana_program::program::invoke_signed;

use crate::instructions::ExecuteMultisigFlow;
use crate::state::FeeSource;

pub fn charge_fee(ctx: &Context<ExecuteMultisigFlow>, pda_bump: u8) -> ProgramResult {
    let fee = Fees::get().unwrap().fee_calculator.lamports_per_signature;
    let safe_signer = &ctx.accounts.safe_signer;
    let caller = &ctx.accounts.caller;
    let flow = &ctx.accounts.flow;

    if flow.pay_fee_from == FeeSource::FromFlow as u8 {
        let flow_account = flow.to_account_info();
        **flow_account.try_borrow_mut_lamports()? = flow_account
            .to_account_info()
            .lamports()
            .checked_sub(fee)
            .unwrap();
        **caller.try_borrow_mut_lamports()? = caller
            .to_account_info()
            .lamports()
            .checked_add(fee)
            .unwrap();
    } else {
        let ix = solana_program::system_instruction::transfer(&safe_signer.key, &caller.key, fee);
        invoke_signed(
            &ix,
            &[caller.to_account_info(), safe_signer.to_account_info()],
            &[&[
                &flow.requested_by.as_ref(),
                &flow.app_id.as_ref(),
                &[pda_bump],
            ]],
        )?;
    }
    Ok(())
}

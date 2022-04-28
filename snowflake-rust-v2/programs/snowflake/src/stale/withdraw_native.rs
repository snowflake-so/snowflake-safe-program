use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use anchor_lang::solana_program::program::invoke_signed;

#[derive(Accounts)]
pub struct WithdrawNative<'info> {
    pub caller: Signer<'info>,

    /// CHECK : no read or write, no assumption made on the type of this account
    pub app_id : AccountInfo<'info>,

    /// CHECK : no read and pda is derived from the signer
    #[account(mut, seeds = [caller.key().as_ref(), app_id.key().as_ref()], bump)]
    pub pda: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<WithdrawNative>, amount: u64) -> Result<()> {
    let caller = &ctx.accounts.caller;
    let app_id = &ctx.accounts.app_id;
    let pda = &ctx.accounts.pda;
    let pda_bump = *ctx.bumps.get("pda").unwrap();

    let ix = solana_program::system_instruction::transfer(
        &pda.key(),
        &caller.key(),
        amount,
    );
    invoke_signed(
        &ix,
        &[caller.to_account_info(), ctx.accounts.pda.to_account_info()],
        &[&[&caller.key().as_ref(), &app_id.key().as_ref(), &[pda_bump]]],
    )?;
    Ok(())
}
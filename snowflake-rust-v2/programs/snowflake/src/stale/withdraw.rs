use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::token::{Token, TokenAccount};
use spl_token::instruction;

#[derive(Accounts)]
pub struct Withdraw<'info> {

    pub caller: Signer<'info>,

    /// CHECK : no read or write, no assumption made on the type of this account
    pub app_id : AccountInfo<'info>,

    /// CHECK : no read or write and pda is derived from the signer
    #[account(seeds = [&caller.key().as_ref(), app_id.key().as_ref()], bump)]
    pub pda: AccountInfo<'info>,

    #[account(mut)]
    destination_ata: Account<'info, TokenAccount>,

    #[account(mut, constraint = &source_ata.owner == &pda.key())]
    pub source_ata: Account<'info, TokenAccount>,

    token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let caller = &ctx.accounts.caller;
    let app_id = &ctx.accounts.app_id;
    let pda = &ctx.accounts.pda;
    let pda_bump = *ctx.bumps.get("pda").unwrap();

    let ix_result: Result<Instruction, ProgramError>  = instruction::transfer(
        ctx.accounts.token_program.key,
        &ctx.accounts.source_ata.key(),
        &ctx.accounts.destination_ata.key(),
        &pda.key(),
        &[],
        amount,
    );

    let ix = ix_result?;
    invoke_signed(
        &ix,
        &[
            ctx.accounts.source_ata.to_account_info(),
            ctx.accounts.destination_ata.to_account_info(),
            caller.to_account_info(),
            ctx.accounts.pda.to_account_info()
        ],
        &[&[&caller.key().as_ref(), &app_id.key().as_ref(), &[pda_bump]]],
    )?;

    Ok(())
}
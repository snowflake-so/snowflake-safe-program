use anchor_lang::prelude::*;
use crate::state::{ProgramSettings};

#[derive(Accounts)]
pub struct InitProgramSettings<'info> {

    #[account(init, payer = snf_foundation, space = 5000)]
    program_settings: Account<'info, ProgramSettings>,

    #[account(mut)]
    pub snf_foundation: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitProgramSettings>) -> Result<()> {
    let program_settings = &mut ctx.accounts.program_settings;
    program_settings.snf_foundation = ctx.accounts.snf_foundation.key();
    program_settings.operators = Vec::new();
    program_settings.operator_to_check_index = -1;
    Ok(())
}
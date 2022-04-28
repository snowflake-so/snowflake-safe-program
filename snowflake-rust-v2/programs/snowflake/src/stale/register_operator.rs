use anchor_lang::prelude::*;
use crate::error::ErrorCode;
use crate::state::{ProgramSettings};

#[derive(Accounts)]
pub struct RegisterOperator<'info> {

    #[account(mut, has_one = snf_foundation)]
    program_settings: Account<'info, ProgramSettings>,

    pub snf_foundation: Signer<'info>,

    /// CHECK : no read or write to this account.
    pub operator: UncheckedAccount<'info>,
}


pub fn handler(ctx: Context<RegisterOperator>) -> Result<()> {
    let program_settings = &mut ctx.accounts.program_settings;
    let operator = &ctx.accounts.operator;

    require!(!program_settings.is_operator_registered(operator.key), ErrorCode::OperatorIsAlreadyRegistered);

    program_settings.operators.push(*operator.key);
    if program_settings.operator_to_check_index == -1 {
        program_settings.operator_to_check_index = 0;
    }

    Ok(())
}
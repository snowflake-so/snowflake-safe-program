use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::program::invoke_signed;

use crate::state::{Flow, ProgramSettings};
use crate::state::static_config::*;
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct ExecuteFlow<'info> {

    #[account(mut)]
    pub flow: Account<'info, Flow>,

    /// CHECK : account is only used for lamports transfer, no assumption made on its data structure
    #[account(mut, seeds = [&flow.owner.as_ref(), &flow.app_id.as_ref()], bump)]
    pub pda: AccountInfo<'info>,

    pub caller: Signer<'info>,

    pub system_program: Program<'info, System>,

    #[account(address = SNF_PROGRAM_SETTINGS_KEY.parse::<Pubkey>().unwrap())]
    pub program_settings: Account<'info, ProgramSettings>,

}

pub fn handler<'info>(ctx: Context<'_,'_,'_, 'info, ExecuteFlow<'info>>, pda_bump : u8) -> ProgramResult {
    let flow = &ctx.accounts.flow;
    let pda = &ctx.accounts.pda.key();

    let execute_by_owner = ctx.accounts.caller.key().eq(&ctx.accounts.flow.owner);

    for action in flow.actions.iter() {
        let mut metas = action.target_account_metas();

        for meta in &mut metas {
            if meta.pubkey.eq(pda) {
                meta.is_signer = true;
            }

            if !execute_by_owner {
                require!(!ctx.accounts.caller.key().eq(&meta.pubkey), ErrorCode::UserInstructionMustNotReferenceTheNodeOperator);
            }
        }

        let ix = Instruction {
            program_id: action.program,
            accounts: metas,
            data: action.instruction.clone(),
        };

        invoke_signed(
            &ix,
            ctx.remaining_accounts,
            &[&[&flow.owner.as_ref(), &flow.app_id.as_ref(), &[pda_bump]]],
        )?;
    }
    Ok(())
}
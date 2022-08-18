use std::collections::HashSet;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::program::invoke_signed;

use crate::error::ErrorCode;
use crate::state::{Flow, Safe, SAFE_SIGNER_PREFIX};

#[derive(Accounts)]
pub struct ExecuteMultisigFlow<'info> {
    #[account(mut, has_one=safe @ErrorCode::InvalidSafe)]
    pub flow: Account<'info, Flow>,

    pub safe: Account<'info, Safe>,

    /// CHECK: sign only
    #[account(
        mut,
        seeds = [
            SAFE_SIGNER_PREFIX.as_ref(),
            safe.key().as_ref()
        ],
        bump = safe.signer_bump
    )]
    pub safe_signer: AccountInfo<'info>,

    pub caller: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: &Context<ExecuteMultisigFlow>) -> Result<()> {
    let safe = &ctx.accounts.safe;
    let flow = &ctx.accounts.flow;
    let caller = &ctx.accounts.caller;
    let safe_signer = &ctx.accounts.safe_signer.key();
    let execute_by_safe_owner = safe.is_owner(&caller.key());

    for action in flow.clone().actions.iter() {
        let mut metas = action.target_account_metas();
        let mut unique_pubkeys: HashSet<Pubkey> = HashSet::new();

        for meta in &mut metas {
            unique_pubkeys.insert(meta.pubkey.clone());

            if meta.pubkey.eq(safe_signer) {
                meta.is_signer = true;
            }

            if !execute_by_safe_owner {
                require!(
                    !ctx.accounts.caller.key().eq(&meta.pubkey),
                    ErrorCode::UserInstructionMustNotReferenceTheNodeOperator
                );
            }
        }

        let ix = Instruction {
            program_id: action.program,
            accounts: metas,
            data: action.instruction.clone(),
        };
        let safe_key = safe.key();
        let seeds = &[
            SAFE_SIGNER_PREFIX.as_ref(),
            safe_key.as_ref(),
            &[safe.signer_bump],
        ];
        let signer = &[&seeds[..]];
        let account_infos = unique_pubkeys
            .iter()
            .map(|pubkey| -> AccountInfo {
                ctx.remaining_accounts
                    .iter()
                    .find(|&account| account.key().eq(pubkey))
                    .unwrap()
                    .clone()
            })
            .collect::<Vec<AccountInfo>>();
        invoke_signed(&ix, &account_infos, signer)?;
    }

    Ok(())
}

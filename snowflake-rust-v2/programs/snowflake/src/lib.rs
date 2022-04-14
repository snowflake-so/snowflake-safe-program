pub mod common;
mod error;
pub mod instructions;
pub mod state;
mod test;

use anchor_lang::prelude::*;
use instructions::*;
use state::*;

declare_id!("2kkrAW1VNFCAtr7uQ1Bh1kGfFZa5oh9mJjt7YhwTDWrj");

#[program]
pub mod snowflake {
    use super::*;

    pub fn create_flow(
        ctx: Context<CreateFlow>,
        account_size: u32,
        client_flow: Flow,
    ) -> ProgramResult {
        instructions::create_flow::handler(ctx, account_size, client_flow)
    }

    pub fn update_flow(ctx: Context<UpdateFlow>, client_flow: Flow) -> ProgramResult {
        instructions::update_flow::handler(ctx, client_flow)
    }

    pub fn delete_flow(_ctx: Context<DeleteFlow>) -> ProgramResult {
        Ok(())
    }

    pub fn execute_flow<'info>(
        ctx: Context<'_, '_, '_, 'info, ExecuteFlow<'info>>,
    ) -> ProgramResult {
        instructions::execute_flow::handler(ctx)
    }

    pub fn execute_scheduled_flow<'info>(
        ctx: Context<'_, '_, '_, 'info, ExecuteFlow<'info>>,
    ) -> ProgramResult {
        instructions::execute_scheduled_flow::handler(ctx)
    }

    pub fn mark_timed_flow_as_error(ctx: Context<ExecuteFlow>) -> ProgramResult {
        instructions::mark_timed_flow_as_error::handler(ctx)
    }

    pub fn withdraw_native(ctx: Context<WithdrawNative>, amount: u64) -> ProgramResult {
        instructions::withdraw_native::handler(ctx, amount)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> ProgramResult {
        instructions::withdraw::handler(ctx, amount)
    }

    pub fn init_program_settings(ctx: Context<InitProgramSettings>) -> ProgramResult {
        instructions::init_program_settings::handler(ctx)
    }

    pub fn register_operator(ctx: Context<RegisterOperator>) -> ProgramResult {
        instructions::register_operator::handler(ctx)
    }

    pub fn create_safe(
        ctx: Context<CreateSafe>,
        safe_path: Vec<u8>,
        client_safe: Safe,
    ) -> ProgramResult {
        instructions::create_safe::handler(ctx, safe_path, client_safe)
    }

    pub fn update_safe(
        ctx: Context<UpdateSafe>,
        owners: Vec<Pubkey>,
        approvals_required: u8,
    ) -> ProgramResult {
        instructions::update_safe::handler(ctx, owners, approvals_required)
    }

    pub fn approve_proposal(ctx: Context<ApproveProposal>, is_approved: bool) -> ProgramResult {
        instructions::approve_proposal::handler(ctx, is_approved)
    }

    pub fn execute_multisig_flow<'info>(
        ctx: Context<'_, '_, '_, 'info, ExecuteMultisigFlow<'info>>,
    ) -> ProgramResult {
        instructions::execute_multisig_flow::handler(ctx)
    }
}

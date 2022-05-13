pub mod common;
mod error;
pub mod instructions;
pub mod state;
mod test;

use anchor_lang::prelude::*;
use instructions::*;
use state::*;

declare_id!("HAD4YK6z3mFEYaFd82Ln2aVTUp3rt1ifXBHbFLfoot83");

#[program]
pub mod snowflake {
    use super::*;

    // pub fn update_flow(ctx: Context<UpdateFlow>, client_flow: Flow) -> ProgramResult {
    //     msg!("Snowflake Safe: UpdateFlow");
    //     instructions::update_flow::handler(ctx, client_flow)
    // }

    pub fn create_flow(
        ctx: Context<CreateFlow>,
        account_size: u32,
        client_flow: Flow,
    ) -> Result<()> {
        msg!("Snowflake Safe: CreateFlow");
        instructions::create_flow::handler(ctx, account_size, client_flow)
    }

    pub fn delete_flow(_ctx: Context<DeleteFlow>) -> Result<()> {
        msg!("Snowflake Safe: DeleteFlow");
        Ok(())
    }

    pub fn abort_flow(ctx: Context<AbortFlow>) -> Result<()> {
        msg!("Snowflake Safe: AbortFlow");
        instructions::abort_flow::handler(ctx)
    }

    pub fn create_safe(ctx: Context<CreateSafe>, client_safe: Safe) -> Result<()> {
        msg!("Snowflake Safe: CreateSafe");
        instructions::create_safe::handler(ctx, client_safe)
    }

    pub fn add_owner(ctx: Context<AuthSafe>, owner: Pubkey) -> Result<()> {
        msg!("Snowflake Safe: AddSafeOwner");
        instructions::update_safe::add_owner_handler(ctx, owner)
    }

    pub fn remove_owner(ctx: Context<AuthSafe>, owner: Pubkey) -> Result<()> {
        msg!("Snowflake Safe: RemoveSafeOwner");
        instructions::update_safe::remove_owner_handler(ctx, owner)
    }

    pub fn change_threshold(ctx: Context<AuthSafe>, threshold: u8) -> Result<()> {
        msg!("Snowflake Safe: ChangeThreshold");
        instructions::update_safe::change_threshold_handler(ctx, threshold)
    }

    pub fn approve_proposal(ctx: Context<ApproveProposal>, is_approved: bool) -> Result<()> {
        msg!("Snowflake Safe: ApproveProposal");
        instructions::approve_proposal::handler(ctx, is_approved)
    }

    pub fn execute_multisig_flow(ctx: Context<ExecuteMultisigFlow>) -> Result<()> {
        msg!("Snowflake Safe: ExecuteMultisigFlow");
        instructions::execute_multisig_flow::handler(ctx)
    }

    pub fn execute_scheduled_multisig_flow<'info>(ctx: Context<ExecuteMultisigFlow>) -> Result<()> {
        msg!("Snowflake Safe: ExecuteScheduledMultisigFlow");
        instructions::execute_scheduled_multisig_flow::handler(ctx, true)
    }

    pub fn mark_timed_flow_as_error(ctx: Context<ExecuteMultisigFlow>) -> Result<()> {
        msg!("Snowflake Safe: MarkTimeFlowAsError");
        instructions::execute_scheduled_multisig_flow::handler(ctx, false)
        // instructions::mark_timed_flow_as_error::handler(ctx)
    }
}

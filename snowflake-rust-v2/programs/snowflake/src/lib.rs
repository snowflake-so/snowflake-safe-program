pub mod common;
mod error;
pub mod instructions;
pub mod state;
mod test;

use anchor_lang::prelude::*;
use instructions::*;
use state::*;

declare_id!("87XDDi6JDzcqa2MtEnoBgan7BmifUhvQB5TQTGRZYuCt");

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

    pub fn create_safe(
        ctx: Context<CreateSafe>,
        safe_path: Vec<u8>,
        client_safe: Safe,
    ) -> Result<()> {
        msg!("Snowflake Safe: CreateSafe");
        instructions::create_safe::handler(ctx, safe_path, client_safe)
    }

    pub fn set_owners(ctx: Context<AuthSafe>, owners: Vec<Pubkey>) -> Result<()> {
        msg!("Snowflake Safe: SetSafeOwners");
        instructions::update_safe::set_owners_handler(ctx, owners)
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
        instructions::execute_scheduled_multisig_flow::handler(ctx)
    }

    pub fn mark_timed_flow_as_error(ctx: Context<ExecuteMultisigFlow>) -> Result<()> {
        msg!("Snowflake Safe: MarkTimeFlowAsError");
        instructions::mark_timed_flow_as_error::handler(ctx)
    }
}

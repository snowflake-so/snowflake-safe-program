pub mod common;
mod error;
pub mod instructions;
pub mod state;
mod test;

use anchor_lang::prelude::*;
use instructions::*;
use state::*;

declare_id!("ASUGrAeSB51GrgYbqhXbwxgX1rYmfZ7tDNBzBC2QMBdS");

#[program]
pub mod snowflake {
    use super::*;

    // pub fn update_flow(ctx: Context<UpdateFlow>, client_flow: Flow) -> ProgramResult {
    //     msg!("Snowflake Safe: UpdateFlow");
    //     instructions::update_flow::handler(ctx, client_flow)
    // }

    pub fn transfer_native_multisig(
        ctx: Context<TransferNativeMultisig>,
        amount: u64,
    ) -> Result<()> {
        msg!("Snowflake Safe: TransferNativeMultisig");
        instructions::transfer_native_multisig::handler(ctx, amount)
    }

    pub fn transfer_token_multisig(ctx: Context<TransferTokenMultisig>, amount: u64) -> Result<()> {
        msg!("Snowflake Safe: TransferTokenMultisig");
        instructions::transfer_token_multisig::handler(ctx, amount)
    }

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
        instructions::set_owners_handler(ctx, owners)
    }

    pub fn change_threshold(ctx: Context<AuthSafe>, threshold: u8) -> Result<()> {
        instructions::change_threshold_handler(ctx, threshold)
    }

    pub fn approve_proposal(ctx: Context<ApproveProposal>, is_approved: bool) -> Result<()> {
        msg!("Snowflake Safe: ApproveProposal");
        instructions::approve_proposal::handler(ctx, is_approved)
    }

    pub fn execute_multisig_flow(ctx: Context<ExecuteMultisigFlow>) -> Result<()> {
        msg!("Snowflake Safe: ExecuteMultisigFlow");
        instructions::execute_multisig_flow::handler(ctx)
    }
}

// use anchor_lang::prelude::*;

// use crate::error::ErrorCode;
// use crate::state::Flow;

// #[derive(Accounts)]
// pub struct UpdateFlow<'info> {
//     // #[account(mut, has_one = owner)]
// // flow: Account<'info, Flow>,

// // pub owner: Signer<'info>,
// }

// pub fn handler(ctx: Context<UpdateFlow>, client_flow: Flow) -> ProgramResult {
//     let flow = &mut ctx.accounts.flow;

//     let now = Clock::get()?.unix_timestamp;

//     flow.last_updated_date = now;

//     flow.apply_flow_data(client_flow, now);

//     require!(flow.validate_flow_data(), ErrorCode::InvalidJobData);
//     Ok(())
// }

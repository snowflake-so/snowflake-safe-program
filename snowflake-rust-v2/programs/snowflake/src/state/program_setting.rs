use anchor_lang::prelude::*;

use snow_util::operator::can_execute;

#[account]
#[derive(Debug)]
pub struct ProgramSettings {
    pub snf_foundation: Pubkey,
    pub operators: Vec<Pubkey>,
    pub operator_to_check_index: i32,
    pub last_check_time: i64,
}

impl ProgramSettings {

    pub fn is_operator_registered(&self, operator: &Pubkey) -> bool {
        for key in &self.operators {
            if key == operator {
                return true;
            }
        }
        false
    }

    pub fn can_operator_excecute_flow(&self, flow_key: &Pubkey, operator_key: &Pubkey) -> bool {
        if !self.is_operator_registered(operator_key) {
            return false;
        }
        can_execute(&self.operators, flow_key, operator_key)
    }
}
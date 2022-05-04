use anchor_lang::prelude::*;

use crate::common::calculate_next_execution_time;
use crate::state::{
    Action, ApprovalRecord, TriggerType, DEFAULT_RETRY_WINDOW, FLOW_EXPIRY_DURATION,
    RECURRING_FOREVER, TIMED_FLOW_COMPLETE, TIMED_FLOW_ERROR,
};

#[account]
#[derive(Debug)]
pub struct Flow {
    pub requested_by: Pubkey,
    pub safe: Pubkey,
    pub last_updated_date: i64,
    pub created_date: i64,
    pub trigger_type: u8,
    pub next_execution_time: i64,
    pub retry_window: u32,
    pub recurring: bool,
    pub remaining_runs: i16,
    pub schedule_end_date: i64,
    pub client_app_id: u32,
    pub last_rent_charged: i64,
    pub last_scheduled_execution: i64,
    pub expiry_date: i64,
    pub expire_on_complete: bool,
    pub app_id: Pubkey,
    pub pay_fee_from: u8,
    pub user_utc_offset: i32,
    pub custom_compute_budget: u32,
    pub custom_fee: u32,
    pub custom_field_1: i32,
    pub custom_field_2: i32,
    pub external_id: String,
    pub cron: String,
    pub name: String,
    pub extra: String,
    pub actions: Vec<Action>,
    pub approvals: Vec<ApprovalRecord>,
    pub proposal_stage: u8,
    pub owner_set_seqno: u8,
}

impl Flow {
    pub fn apply_flow_data(&mut self, client_flow: Flow, now: i64) {
        self.trigger_type = client_flow.trigger_type;
        self.recurring = client_flow.recurring;
        self.remaining_runs = client_flow.remaining_runs;
        self.retry_window = client_flow.retry_window;
        self.cron = client_flow.cron;
        self.name = client_flow.name;
        self.actions = client_flow.actions;
        self.user_utc_offset = client_flow.user_utc_offset;
        self.pay_fee_from = client_flow.pay_fee_from;
        self.client_app_id = client_flow.client_app_id;
        self.external_id = client_flow.external_id;
        self.custom_compute_budget = client_flow.custom_compute_budget;
        self.custom_fee = client_flow.custom_fee;
        self.app_id = client_flow.app_id;
        self.schedule_end_date = 0;
        self.expiry_date = if client_flow.expiry_date > now {
            client_flow.expiry_date
        } else {
            now + FLOW_EXPIRY_DURATION
        };
        self.expire_on_complete = false;
        self.extra = String::from("");

        if self.trigger_type == TriggerType::Time as u8 {
            if self.retry_window < 1 {
                self.retry_window = DEFAULT_RETRY_WINDOW;
            }

            if self.recurring {
                if self.has_remaining_runs() {
                    self.next_execution_time =
                        calculate_next_execution_time(&self.cron, self.user_utc_offset as i64, now);
                } else {
                    self.next_execution_time = TIMED_FLOW_COMPLETE;
                }
            } else {
                self.next_execution_time = client_flow.next_execution_time;
                self.remaining_runs = 1;
            }
        }
    }

    pub fn get_approvals(&self) -> u8 {
        let mut approvals: u8 = 0;
        for flow_approval in self.approvals.iter() {
            if flow_approval.is_approved {
                approvals += 1;
            }
        }

        approvals
    }

    pub fn validate_flow_data(&self) -> bool {
        if self.trigger_type != TriggerType::None as u8
            && self.trigger_type != TriggerType::Time as u8
            && self.trigger_type != TriggerType::Program as u8
        {
            return false;
        }

        if self.remaining_runs < 0 && self.remaining_runs != RECURRING_FOREVER {
            return false;
        }
        true
    }

    pub fn has_remaining_runs(&self) -> bool {
        self.remaining_runs > 0 || self.remaining_runs == RECURRING_FOREVER
    }

    pub fn is_due_for_execute(&self, now: i64) -> bool {
        if self.trigger_type == TriggerType::Program as u8 {
            return self.has_remaining_runs();
        }

        if self.trigger_type == TriggerType::Time as u8 {
            return self.next_execution_time > 0
                && self.next_execution_time < now
                && now - self.next_execution_time < self.retry_window as i64;
        }

        false
    }

    pub fn is_schedule_expired(&self, now: i64) -> bool {
        return self.trigger_type == TriggerType::Time as u8
            && self.next_execution_time > 0
            && now.checked_sub(self.next_execution_time).unwrap() > self.retry_window as i64;
    }

    pub fn update_after_schedule_run(&mut self, now: i64, is_successful_run: bool) {
        self.last_scheduled_execution = now;
        if self.remaining_runs != RECURRING_FOREVER {
            self.remaining_runs = self.remaining_runs.checked_sub(1).unwrap();
        }

        if self.trigger_type == TriggerType::Time as u8 {
            if self.has_remaining_runs() {
                self.next_execution_time =
                    calculate_next_execution_time(&self.cron, self.user_utc_offset as i64, now);
            } else {
                self.next_execution_time = if is_successful_run {
                    TIMED_FLOW_COMPLETE
                } else {
                    TIMED_FLOW_ERROR
                };
            }
        }

        self.last_updated_date = now;
    }
}

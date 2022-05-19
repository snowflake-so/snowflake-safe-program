#[cfg(test)]
mod tests {
    use crate::state::approval_record::ApprovalRecord;
    use crate::state::static_config::*;
    use crate::state::Flow;
    use anchor_lang::prelude::*;

    #[test]
    fn test_update_schedule_for_a_recurring_timed_flow_after_a_successful_run() {
        let mut flow = sample_recurring_timed_flow();
        let now = 1644466423;

        flow.update_after_schedule_run(now, true);

        assert_eq!(flow.remaining_runs, 2);
        assert_eq!(flow.next_execution_time, 1646089200);
    }

    #[test]
    fn test_update_schedule_for_a_recurring_timed_flow_after_the_last_successful_run() {
        let mut flow = sample_recurring_timed_flow();
        let now = 1644466423;
        flow.remaining_runs = 1;

        flow.update_after_schedule_run(now, true);

        assert_eq!(flow.remaining_runs, 0);
        assert_eq!(flow.next_execution_time, TIMED_FLOW_COMPLETE);
    }

    #[test]
    fn test_update_schedule_for_a_recurring_timed_flow_after_the_last_error_run() {
        let mut flow = sample_recurring_timed_flow();
        let now = 1644466423;
        flow.remaining_runs = 1;

        flow.update_after_schedule_run(now, false);

        assert_eq!(flow.remaining_runs, 0);
        assert_eq!(flow.next_execution_time, TIMED_FLOW_ERROR);
    }

    #[test]
    fn test_update_schedule_for_an_once_off_timed_flow_after_an_error_run() {
        let mut flow = sample_recurring_timed_flow();
        let now = 1644466423;
        flow.remaining_runs = 1;
        flow.recurring = false;

        flow.update_after_schedule_run(now, false);

        assert_eq!(flow.remaining_runs, 0);
        assert_eq!(flow.next_execution_time, TIMED_FLOW_ERROR);
        assert_eq!(flow.last_scheduled_execution, now);
        assert_eq!(flow.last_updated_date, now);
    }

    #[test]
    fn test_update_schedule_for_an_once_off_timed_flow_after_a_successful_run() {
        let mut flow = sample_recurring_timed_flow();
        let now = 1644466423;
        flow.remaining_runs = 1;
        flow.recurring = false;

        flow.update_after_schedule_run(now, true);

        assert_eq!(flow.remaining_runs, 0);
        assert_eq!(flow.next_execution_time, TIMED_FLOW_COMPLETE);
        assert_eq!(flow.last_scheduled_execution, now);
        assert_eq!(flow.last_updated_date, now);
    }

    #[test]
    fn test_update_schedule_for_a_conditional_flow() {
        let mut flow = sample_recurring_timed_flow();
        let now = 1644466423;
        flow.remaining_runs = 1;
        flow.trigger_type = TriggerType::Program as u8;

        flow.update_after_schedule_run(now, true);

        assert_eq!(flow.remaining_runs, 0);
        assert_eq!(flow.next_execution_time, TIMED_FLOW_COMPLETE);
        assert_eq!(flow.last_scheduled_execution, now);
        assert_eq!(flow.last_updated_date, now);
    }

    #[test]
    fn test_approvals() {
        let mut flow = sample_recurring_timed_flow();
        let owner_a = Pubkey::new_unique();

        assert_eq!(flow.is_new_owner_approval(&owner_a), true);

        let owner_b = Pubkey::new_unique();
        let owner_c = Pubkey::new_unique();
        flow.approvals = vec![ApprovalRecord {
            owner: owner_b,
            date: 1652937049,
            is_approved: false,
        }];
        assert_eq!(flow.is_new_owner_approval(&owner_a), true);
        assert_eq!(flow.is_new_owner_approval(&owner_b), false);
        assert_eq!(flow.is_new_owner_approval(&owner_c), true);
    }

    fn sample_recurring_timed_flow() -> Flow {
        Flow {
            requested_by: Pubkey::new_unique(),
            last_updated_date: 0,
            created_date: 0,
            trigger_type: TriggerType::Time as u8,
            next_execution_time: 0,
            retry_window: 0,
            recurring: true,
            remaining_runs: 3,
            schedule_end_date: 0,
            client_app_id: 0,
            last_rent_charged: 0,
            last_scheduled_execution: 0,
            expiry_date: 0,
            expire_on_complete: false,
            app_id: Pubkey::new_unique(),
            pay_fee_from: 0,
            user_utc_offset: -39600,
            custom_compute_budget: 0,
            custom_fee: 0,
            custom_field_1: 0,
            custom_field_2: 0,
            external_id: "".to_string(),
            cron: String::from("0 10 1 * *"),
            name: "".to_string(),
            extra: "".to_string(),
            actions: vec![],
            safe: Pubkey::new_unique(),
            approvals: vec![],
            proposal_stage: 0,
            owner_set_seqno: 0,
        }
    }
}

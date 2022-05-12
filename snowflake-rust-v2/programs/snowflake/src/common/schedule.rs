use snow_util::scheduler::{SnowSchedule, SnowTime};

pub fn calculate_next_execution_time(_cron: &str, utc_offset: i64, now: i64) -> i64 {
    if _cron.trim().is_empty() {
        return 0;
    }

    let local_time = now.checked_sub(utc_offset).unwrap();
    let schedule = SnowSchedule::parse(_cron).unwrap();
    let next_execution = schedule
        .next_event(&SnowTime::from_time_ts(local_time))
        .unwrap()
        .to_time_ts(utc_offset);
    next_execution
}

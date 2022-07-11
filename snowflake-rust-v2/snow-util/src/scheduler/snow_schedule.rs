use super::error::CrontabError;
use super::parsing::{parse_cron, ScheduleComponents};
use super::snow_time::SnowTime;
use super::times::{adv_day, adv_hour, adv_minute, adv_month, day_of_the_week, days_in_month};

/// Represents a crontab schedule.
#[derive(Clone, Debug)]
pub struct SnowSchedule {
    /// The components parsed from a crontab schedule.
    pub schedule: ScheduleComponents,
}

impl SnowSchedule {
    /// Parse a crontab schedule into a Crontab instance.
    pub fn parse(crontab_schedule: &str) -> Result<SnowSchedule, CrontabError> {
        let schedule = parse_cron(crontab_schedule)?;
        Ok(SnowSchedule { schedule: schedule })
    }

    pub fn next_event(&self, start_time: &SnowTime) -> Option<SnowTime> {
        calculate_next_event(&self.schedule, start_time)
    }
}

// TODO: Stop testing this. Test the Crontab method instead.
pub(crate) fn calculate_next_event(
    times: &ScheduleComponents,
    time: &SnowTime,
) -> Option<SnowTime> {
    let mut next_time = time.clone();

    // Minute-resolution. We're always going to round up to the next minute.
    next_time.tm_sec = 0;
    adv_minute(&mut next_time);

    loop {
        if next_time.tm_year >= (2100 - 1900) {
            return None;
        }

        match try_month(times, &mut next_time) {
            DateTimeMatch::Missed => continue,    // Retry
            DateTimeMatch::ContinueMatching => {} // Continue
            DateTimeMatch::AnswerFound(upcoming) => return Some(upcoming),
        }

        match try_day(times, &mut next_time) {
            DateTimeMatch::Missed => continue,    // Retry
            DateTimeMatch::ContinueMatching => {} // Continue
            DateTimeMatch::AnswerFound(upcoming) => return Some(upcoming),
        }

        match try_weekday(times, &mut next_time) {
            DateTimeMatch::Missed => continue,    // Retry
            DateTimeMatch::ContinueMatching => {} // Continue
            _ => {}
        }

        match try_hour(times, &mut next_time) {
            DateTimeMatch::Missed => continue,    // Retry
            DateTimeMatch::ContinueMatching => {} // Continue
            DateTimeMatch::AnswerFound(upcoming) => return Some(upcoming),
        }

        match try_minute(times, &mut next_time) {
            DateTimeMatch::Missed => continue,                         // Retry
            DateTimeMatch::ContinueMatching => return Some(next_time), // Uhh...
            DateTimeMatch::AnswerFound(upcoming) => return Some(upcoming),
        }
    }
}

enum DateTimeMatch {
    Missed,
    ContinueMatching,
    AnswerFound(SnowTime),
}

fn try_month(times: &ScheduleComponents, time: &mut SnowTime) -> DateTimeMatch {
    // Tm month range is [0, 11]
    // Cron months are [1, 12]
    let test_month = (time.tm_mon + 1) as u32;

    match times.months.binary_search(&test_month) {
        Ok(_) => {
            // Precise month... must keep matching
            DateTimeMatch::ContinueMatching
        }
        Err(pos) => {
            if let Some(month) = times.months.get(pos) {
                // Next month. We're done.
                time.tm_mon = (month - 1) as i32;
                // Tm day range is [1, 31]
                time.tm_mday = times.days.get(0).unwrap().clone() as i32;
                // Tm hour range is [0, 23]
                time.tm_hour = times.hours.get(0).unwrap().clone() as i32;
                // Tm minute range is [0, 59]
                time.tm_min = times.minutes.get(0).unwrap().clone() as i32;
                time.tm_sec = 0; // Second resolution

                let max_mday = days_in_month(time.tm_mon + 1, time.tm_year + 1900);
                if time.tm_mday > max_mday {
                    time.tm_mday = max_mday;
                    if let Some(next_month) = times.months.get(pos + 1) {
                        time.tm_mon = (next_month - 1) as i32;
                    } else {
                        time.tm_year = time.tm_year + 1;
                    }
                    return DateTimeMatch::Missed;
                }

                if times.weekdays.len() == 7 {
                    DateTimeMatch::AnswerFound(time.clone())
                } else {
                    DateTimeMatch::ContinueMatching
                }
            } else {
                // Skipped beyond. Pop to last unit and use next value.
                time.tm_year = time.tm_year + 1;
                // Tm month range is [0, 11], Cron months are [1, 12]
                time.tm_mon = (times.months.get(0).unwrap().clone() - 1) as i32;
                // Tm day range is [1, 31]
                time.tm_mday = times.days.get(0).unwrap().clone() as i32;

                let max_mday = days_in_month(time.tm_mon + 1, time.tm_year + 1900);
                if time.tm_mday > max_mday {
                    time.tm_mday = max_mday;
                    if let Some(next_month) = times.months.get(pos + 1) {
                        time.tm_mon = (next_month - 1) as i32;
                    } else {
                        time.tm_year = time.tm_year + 1;
                    }
                }

                // Tm hour range is [0, 23]
                time.tm_hour = times.hours.get(0).unwrap().clone() as i32;
                // Tm minute range is [0, 59]
                time.tm_min = times.minutes.get(0).unwrap().clone() as i32;
                time.tm_sec = 0; // Second resolution

                DateTimeMatch::Missed
            }
        }
    }
}

fn try_day(times: &ScheduleComponents, time: &mut SnowTime) -> DateTimeMatch {
    match times.days.binary_search(&(time.tm_mday as u32)) {
        Ok(_) => {
            // Precise day... must keep matching
            DateTimeMatch::ContinueMatching
        }
        Err(pos) => {
            if let Some(day) = times.days.get(pos) {
                // TODO Rust 2018 does not support if let chaining
                if (day.clone() as i32) > days_in_month(time.tm_mon + 1, time.tm_year + 1900) {
                    time.tm_mday = 1; // Reset day (1-indexed)
                    time.tm_hour = 0; // Reset hour
                    time.tm_min = 0; // Reset minute
                    time.tm_sec = 0; // Reset second
                    adv_month(time);
                    return DateTimeMatch::Missed;
                }

                // Next day. We're done.
                // Tm day range is [1, 31]
                time.tm_mday = day.clone() as i32;
                // Tm hour range is [0, 23]
                time.tm_hour = times.hours.get(0).unwrap().clone() as i32;
                // Tm minute range is [0, 59]
                time.tm_min = times.minutes.get(0).unwrap().clone() as i32;
                time.tm_sec = 0; // Second resolution

                if times.weekdays.len() == 7 {
                    DateTimeMatch::AnswerFound(time.clone())
                } else {
                    DateTimeMatch::ContinueMatching
                }
            } else {
                time.tm_mday = 1; // Reset day (1-indexed)
                time.tm_hour = 0; // Reset hour
                time.tm_min = 0; // Reset minute
                time.tm_sec = 0; // Reset second
                adv_month(time);
                DateTimeMatch::Missed
            }
        }
    }
}

fn try_weekday(times: &ScheduleComponents, time: &mut SnowTime) -> DateTimeMatch {
    time.tm_wday = day_of_the_week(time.tm_year + 1900, time.tm_mon + 1, time.tm_mday);

    match times.weekdays.binary_search(&(time.tm_wday as u32)) {
        Ok(_) => {
            // Precise weekday... must keep matching
            DateTimeMatch::ContinueMatching
        }
        Err(_) => {
            let current_day_index = times.days.binary_search(&(time.tm_mday as u32)).unwrap();

            if let Some(day) = times.days.get(current_day_index + 1) {
                time.tm_mday = day.clone() as i32;
            } else {
                time.tm_mday = 1; // Reset day (1-indexed)
                adv_month(time);
            }

            time.tm_hour = 0; // Reset hour
            time.tm_min = 0; // Reset minute
            time.tm_sec = 0; // Reset second
            DateTimeMatch::Missed
        }
    }
}

fn try_hour(times: &ScheduleComponents, time: &mut SnowTime) -> DateTimeMatch {
    match times.hours.binary_search(&(time.tm_hour as u32)) {
        Ok(_) => {
            // Precise hour... must keep matching
            DateTimeMatch::ContinueMatching
        }
        Err(pos) => {
            if let Some(hour) = times.hours.get(pos) {
                // Next hour. We're done.
                let mut use_time = time.clone();
                // Tm hour range is [0, 23]
                use_time.tm_hour = hour.clone() as i32;
                // Tm minute range is [0, 59]
                use_time.tm_min = times.minutes.get(0).unwrap().clone() as i32;
                use_time.tm_sec = 0; // Second resolution

                DateTimeMatch::AnswerFound(use_time)
            } else {
                time.tm_hour = 0; // Reset hour
                time.tm_min = 0; // Reset minute
                time.tm_sec = 0; // Reset second
                adv_day(time);
                DateTimeMatch::Missed
            }
        }
    }
}

fn try_minute(times: &ScheduleComponents, time: &mut SnowTime) -> DateTimeMatch {
    match times.minutes.binary_search(&(time.tm_min as u32)) {
        Ok(_) => {
            // DONE
            let mut use_time = time.clone();
            //use_time.tm_min = minute.clone() as i32;
            use_time.tm_sec = 0; // Second resolution
            DateTimeMatch::AnswerFound(use_time)
        }
        Err(pos) => {
            if let Some(minute) = times.minutes.get(pos) {
                // Next minute. We're done.
                let mut use_time = time.clone();
                // Tm minute range is [0, 59]
                use_time.tm_min = minute.clone() as i32;
                use_time.tm_sec = 0; // Second resolution

                DateTimeMatch::AnswerFound(use_time)
            } else {
                time.tm_min = 0; // Reset minute
                time.tm_sec = 0; // Reset second
                adv_hour(time);
                DateTimeMatch::Missed
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{DateTime, NaiveDateTime, Utc};
    use SnowSchedule;

    fn to_timestamp(date: &str) -> i64 {
        let datetime = NaiveDateTime::parse_from_str(date, "%Y-%m-%d %H:%M:%S")
            .ok()
            .unwrap();
        datetime.timestamp()
    }

    fn to_datetime(ts: i64) -> String {
        let naive_datetime = NaiveDateTime::from_timestamp(ts, 0);
        let datetime: DateTime<Utc> = DateTime::from_utc(naive_datetime, Utc);
        datetime.format("%Y-%m-%d %H:%M:%S").to_string()
    }

    #[test]
    fn test_first_of_the_month() {
        let cron = SnowSchedule::parse("0 0 1 * *").unwrap();
        let from_ts = to_timestamp("2021-11-29 01:16:40");
        let next_execution = cron.next_event(&SnowTime::from_time_ts(from_ts)).unwrap();

        assert_eq!(
            to_datetime(next_execution.to_time_ts(0).unwrap()),
            "2021-12-01 00:00:00"
        );
    }

    #[test]
    fn test_feb_28th() {
        let cron = SnowSchedule::parse("15 7 28 2 *").unwrap();
        let from_ts = to_timestamp("2021-11-29 01:16:40");
        let next_execution = cron.next_event(&SnowTime::from_time_ts(from_ts)).unwrap();

        assert_eq!(
            to_datetime(next_execution.to_time_ts(0).unwrap()),
            "2022-02-28 07:15:00"
        );
    }

    #[test]
    fn test_feb_29th() {
        let cron = SnowSchedule::parse("15 7 29 2 *").unwrap();
        let from_ts = to_timestamp("2021-11-29 01:16:40");
        let next_execution = cron.next_event(&SnowTime::from_time_ts(from_ts)).unwrap();

        assert_eq!(
            to_datetime(next_execution.to_time_ts(0).unwrap()),
            "2024-02-29 07:15:00"
        );
    }

    #[test]
    fn test_out_day_of_month_range() {
        let cron = SnowSchedule::parse("* * 30,31 2 *").unwrap();
        let from_ts = to_timestamp("2021-11-29 01:16:40");
        assert!(cron.next_event(&SnowTime::from_time_ts(from_ts)).is_none());

        let cron = SnowSchedule::parse("* * 31 4,6,9,11 *").unwrap();
        let from_ts = to_timestamp("2021-11-29 01:16:40");
        assert!(cron.next_event(&SnowTime::from_time_ts(from_ts)).is_none());
    }

    #[test]
    fn test_next_year() {
        let cron = SnowSchedule::parse("* * * 1 *").unwrap();
        let from_ts = to_timestamp("2021-11-29 01:16:40");
        let next_execution = cron.next_event(&SnowTime::from_time_ts(from_ts)).unwrap();

        assert_eq!(
            to_datetime(next_execution.to_time_ts(0).unwrap()),
            "2022-01-01 00:00:00"
        );
    }

    #[test]
    fn test_next_month() {
        let cron = SnowSchedule::parse("* * * 12 *").unwrap();
        let from_ts = to_timestamp("2021-11-29 01:16:40");
        let next_execution = cron.next_event(&SnowTime::from_time_ts(from_ts)).unwrap();
        assert_eq!(
            to_datetime(next_execution.to_time_ts(0).unwrap()),
            "2021-12-01 00:00:00"
        );

        let cron = SnowSchedule::parse("* * 25 * *").unwrap();
        let from_ts = to_timestamp("2021-11-29 01:16:40");
        let next_execution = cron.next_event(&SnowTime::from_time_ts(from_ts)).unwrap();
        assert_eq!(
            to_datetime(next_execution.to_time_ts(0).unwrap()),
            "2021-12-25 00:00:00"
        );
    }

    #[test]
    fn test_next_day() {
        let cron = SnowSchedule::parse("55 2 30 * *").unwrap();
        let from_ts = to_timestamp("2021-11-29 01:16:40");
        let next_execution = cron.next_event(&SnowTime::from_time_ts(from_ts)).unwrap();
        assert_eq!(
            to_datetime(next_execution.to_time_ts(0).unwrap()),
            "2021-11-30 02:55:00"
        );

        let cron = SnowSchedule::parse("1 1 * * *").unwrap();
        let from_ts = to_timestamp("2021-11-29 01:16:40");
        let next_execution = cron.next_event(&SnowTime::from_time_ts(from_ts)).unwrap();
        assert_eq!(
            to_datetime(next_execution.to_time_ts(0).unwrap()),
            "2021-11-30 01:01:00"
        );
    }

    #[test]
    fn test_next_hour() {
        let cron = SnowSchedule::parse("* 2 * * *").unwrap();
        let from_ts = to_timestamp("2021-11-29 01:16:40");
        let next_execution = cron.next_event(&SnowTime::from_time_ts(from_ts)).unwrap();
        assert_eq!(
            to_datetime(next_execution.to_time_ts(0).unwrap()),
            "2021-11-29 02:00:00"
        );

        let cron = SnowSchedule::parse("15 * * * *").unwrap();
        let from_ts = to_timestamp("2021-11-29 01:16:40");
        let next_execution = cron.next_event(&SnowTime::from_time_ts(from_ts)).unwrap();
        assert_eq!(
            to_datetime(next_execution.to_time_ts(0).unwrap()),
            "2021-11-29 02:15:00"
        );
    }

    #[test]
    fn test_next_minutes() {
        let cron = SnowSchedule::parse("21 * * * *").unwrap();
        let from_ts = to_timestamp("2021-11-29 01:16:40");
        let next_execution = cron.next_event(&SnowTime::from_time_ts(from_ts)).unwrap();
        assert_eq!(
            to_datetime(next_execution.to_time_ts(0).unwrap()),
            "2021-11-29 01:21:00"
        );

        let cron = SnowSchedule::parse("*/5 * * * *").unwrap();
        let from_ts = to_timestamp("2021-11-29 01:16:40");
        let next_execution = cron.next_event(&SnowTime::from_time_ts(from_ts)).unwrap();
        assert_eq!(
            to_datetime(next_execution.to_time_ts(0).unwrap()),
            "2021-11-29 01:20:00"
        );
    }

    #[test]
    fn test_next_weekday() {
        // Find next Tuesday
        let cron = SnowSchedule::parse("* * * * 2").unwrap();
        let from_ts = to_timestamp("2021-11-29 01:16:40"); // Monday
        let next_execution = cron.next_event(&SnowTime::from_time_ts(from_ts)).unwrap();
        assert_eq!(
            to_datetime(next_execution.to_time_ts(0).unwrap()),
            "2021-11-30 00:00:00"
        );

        // Find next Saturday
        let cron = SnowSchedule::parse("* * * * 6").unwrap();
        let from_ts = to_timestamp("2021-11-29 01:16:40"); // Monday
        let next_execution = cron.next_event(&SnowTime::from_time_ts(from_ts)).unwrap();
        assert_eq!(
            to_datetime(next_execution.to_time_ts(0).unwrap()),
            "2021-12-04 00:00:00"
        );

        // Find next Monday
        let cron = SnowSchedule::parse("0 1 * * 1").unwrap();
        let from_ts = to_timestamp("2021-11-29 01:16:40"); // Monday
        let next_execution = cron.next_event(&SnowTime::from_time_ts(from_ts)).unwrap();
        assert_eq!(
            to_datetime(next_execution.to_time_ts(0).unwrap()),
            "2021-12-06 01:00:00"
        );

        // Find next Friday, Feb 29th
        let cron = SnowSchedule::parse("0 8 29 2 5").unwrap();
        let from_ts = to_timestamp("2021-11-29 01:16:40"); // Monday
        let next_execution = cron.next_event(&SnowTime::from_time_ts(from_ts)).unwrap();
        assert_eq!(
            to_datetime(next_execution.to_time_ts(0).unwrap()),
            "2036-02-29 08:00:00"
        );
    }
}

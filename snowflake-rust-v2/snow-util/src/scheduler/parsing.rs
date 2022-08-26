#![allow(deprecated)]

use super::error::CrontabError;
use std::collections::BTreeSet;
use std::iter::FromIterator;

/// The components of a crontab schedule.
/// The values in each field are guaranteed to be both unique and ordered.
#[derive(Clone, Debug, Default)]
pub struct ScheduleComponents {
    /// Minutes in the schedule.
    /// Range [0,59] inclusive.
    pub minutes: Vec<u32>,

    /// Hours in the schedule.
    /// Range [0,23] inclusive.
    pub hours: Vec<u32>,

    /// Days of the month in the schedule.
    /// Range [1,31] inclusive.
    pub days: Vec<u32>,

    /// Months in the schedule.
    /// Range [1,12] inclusive.
    pub months: Vec<u32>,

    /// Days of the week in the schedule.
    /// Range [0,6] inclusive.
    pub weekdays: Vec<u32>,

    /// Seconds in the schedule.
    /// Not yet in use. Do not use.
    #[deprecated(since = "0.2.0", note = "Field is never set!")]
    pub seconds: Vec<u32>,
}

pub(crate) fn parse_cron(schedule: &str) -> Result<ScheduleComponents, CrontabError> {
    let fields: Vec<&str> = schedule.trim().split_whitespace().collect();

    if fields.len() != 5 {
        return Err(CrontabError::ErrCronFormat(format!(
            "Invalid format: {}",
            schedule
        )));
    }
    let minutes = parse_field(fields[0], 0, 59)?;
    let hours = parse_field(fields[1], 0, 23)?;
    let days = parse_field(fields[2], 1, 31)?;
    let months = parse_field(fields[3], 1, 12)?;
    let weekdays = parse_field(fields[4], 0, 6)?;
    Ok(ScheduleComponents {
        minutes: minutes,
        hours: hours,
        days: days,
        months: months,
        weekdays: weekdays,
        seconds: Vec::new(), // FIXME: Implement (though nonstandard).
    })
}

fn parse_field(field: &str, field_min: u32, field_max: u32) -> Result<Vec<u32>, CrontabError> {
    if field == "*" {
        return Ok((field_min..=field_max).collect());
    }

    let mut components = BTreeSet::<u32>::new();
    for part in field.split(",") {
        let mut min = field_min;
        let mut max = field_max;
        let mut step: usize = 1;

        // stepped, eg. */2 or 1-45/3
        let stepped: Vec<&str> = part.splitn(2, "/").collect();

        // ranges, eg. 1-30
        let range: Vec<&str> = stepped[0].splitn(2, "-").collect();

        if stepped.len() == 2 {
            step = stepped[1].parse::<usize>()?;
        }

        if range.len() == 2 {
            min = range[0].parse::<u32>()?;
            max = range[1].parse::<u32>()?;
        }

        if stepped.len() == 1 && range.len() == 1 && part != "*" {
            min = part.parse::<u32>()?;
            max = min;
        }

        if min < field_min {
            return Err(CrontabError::FieldOutsideRange {
                description: format!("Value {} is less than minimum: {}", min, field_min),
            });
        }

        if max > field_max {
            return Err(CrontabError::FieldOutsideRange {
                description: format!("Value {} is greater than maximum: {}", max, field_max),
            });
        }

        let values = (min..max + 1).step_by(step).collect::<Vec<u32>>();

        components.extend(values);
    }

    let mut components: Vec<u32> = Vec::from_iter(components.into_iter());
    components.sort();

    Ok(components)
}

#[cfg(test)]
mod tests {
    use crate::scheduler::error::CrontabError;
    use crate::scheduler::parsing::parse_cron;

    #[test]
    fn test_every_mintue_cron() {
        let every_min_schedule = parse_cron("* * * * *").unwrap();
        let full_minutes: Vec<u32> = (0..=59).collect();
        let full_hours: Vec<u32> = (0..=23).collect();
        let full_days: Vec<u32> = (1..=31).collect();
        let full_months: Vec<u32> = (1..=12).collect();
        let full_weekdays: Vec<u32> = (0..=6).collect();

        assert!(every_min_schedule.months == full_months);
        assert!(every_min_schedule.days == full_days);
        assert!(every_min_schedule.hours == full_hours);
        assert!(every_min_schedule.minutes == full_minutes);
        assert!(every_min_schedule.weekdays == full_weekdays);
    }

    #[test]
    fn test_invalid_patterns() {
        assert!(matches!(
            parse_cron("* * * * * *").unwrap_err(),
            CrontabError::ErrCronFormat { .. }
        ));
        assert!(matches!(
            parse_cron("* * 15").unwrap_err(),
            CrontabError::ErrCronFormat { .. }
        ));
        assert!(matches!(
            parse_cron("9 * * * * *").unwrap_err(),
            CrontabError::ErrCronFormat { .. }
        ));
    }

    #[test]
    fn test_valid_range() {
        let test_schedule = parse_cron("40-59 9,18 25-31 4-8 1-5/2").unwrap();
        let minutes: Vec<u32> = (40..=59).collect();
        let hours: Vec<u32> = vec![9, 18];
        let days: Vec<u32> = (25..=31).collect();
        let months: Vec<u32> = (4..=8).collect();
        let weekdays: Vec<u32> = vec![1, 3, 5];

        assert!(test_schedule.months == months);
        assert!(test_schedule.days == days);
        assert!(test_schedule.hours == hours);
        assert!(test_schedule.minutes == minutes);
        assert!(test_schedule.weekdays == weekdays);
    }

    #[test]
    fn test_valid_steps() {
        let test_schedule = parse_cron("40-59/4 3-18/5 1-31/4 4-8/3 1-5/2").unwrap();

        assert!(test_schedule.minutes == vec![40, 44, 48, 52, 56]);
        assert!(test_schedule.hours == vec![3, 8, 13, 18]);
        assert!(test_schedule.days == vec![1, 5, 9, 13, 17, 21, 25, 29]);
        assert!(test_schedule.months == vec![4, 7]);
        assert!(test_schedule.weekdays == vec![1, 3, 5]);
    }

    #[test]
    fn test_outside_ranges() {
        assert!(matches!(
            parse_cron("65 * * * *").unwrap_err(),
            CrontabError::FieldOutsideRange { .. }
        ));
        assert!(matches!(
            parse_cron("* 25 * * *").unwrap_err(),
            CrontabError::FieldOutsideRange { .. }
        ));
        assert!(matches!(
            parse_cron("* * 32 * *").unwrap_err(),
            CrontabError::FieldOutsideRange { .. }
        ));
        assert!(matches!(
            parse_cron("* * * 13 *").unwrap_err(),
            CrontabError::FieldOutsideRange { .. }
        ));
        assert!(matches!(
            parse_cron("* * * * 8").unwrap_err(),
            CrontabError::FieldOutsideRange { .. }
        ));
    }

    #[test]
    fn test_invalid_steps() {
        let result = std::panic::catch_unwind(|| parse_cron("*/2 *////343433 * * * "));
        assert!(matches!(
            result.unwrap(),
            Err(CrontabError::ErrParseInt { .. })
        ));
    }
}

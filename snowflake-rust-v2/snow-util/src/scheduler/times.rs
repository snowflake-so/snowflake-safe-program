use super::snow_time::SnowTime;

/// Advance the year, but leave all other fields untouched.
/// This can result in an invalid day-of-month, day-of-year, or day-of-week!
pub(crate) fn adv_year(time: &mut SnowTime) {
    time.tm_year += 1;
}

/// Advance the day, but leave the day (and hour, minute, second) untouched.
/// This can result in an invalid day-of-month!
pub(crate) fn adv_month(time: &mut SnowTime) {
    time.tm_mon += 1;
    if time.tm_mon > 11 {
        time.tm_mon = 0;
        adv_year(time);
    }
}

/// Advance the day, but leave the hour, minute, and second untouched.
pub(crate) fn adv_day(time: &mut SnowTime) {
    time.tm_wday = (time.tm_wday + 1) % 7; // day of week
    time.tm_mday += 1; // day of month

    let days_in_year = if is_leap_year(time.tm_year + 1900) {
        366
    } else {
        365
    };
    time.tm_yday = (time.tm_yday + 1) % days_in_year; // day of year

    if time.tm_mday > days_in_month(time.tm_mon + 1, time.tm_year + 1900) {
        time.tm_mday = 1;
        adv_month(time);
    }
}

/// Advance the hour, but leave the minute and second untouched.
pub(crate) fn adv_hour(time: &mut SnowTime) {
    time.tm_hour += 1;
    if time.tm_hour > 23 {
        time.tm_hour = 0;
        adv_day(time);
    }
}

/// Advance the minute, but leave the second untouched.
pub(crate) fn adv_minute(time: &mut SnowTime) {
    time.tm_min += 1;
    if time.tm_min > 59 {
        time.tm_min = 0;
        adv_hour(time);
    }
}

/// Calculate the day of the week
pub(crate) fn day_of_the_week(y: i32, m: i32, d: i32) -> i32 {
    let t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
    let mut y = y;
    if m < 3 {
        y -= 1;
    }

    (y + y / 4 - y / 100 + y / 400 + t[(m - 1) as usize] + d) % 7
}

/// Determine whether a year is a leap year
pub(crate) fn is_leap_year(year: i32) -> bool {
    year % 400 == 0 || (year % 4 == 0 && year % 100 != 0)
}

/// Calculate the maximum days of a month
pub(crate) fn days_in_month(month: i32, year: i32) -> i32 {
    let is_leap_year = is_leap_year(year);
    match month {
        9 | 4 | 6 | 11 => 30,
        2 if is_leap_year => 29,
        2 => 28,
        _ => 31,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Normalize a Tm to drop certain fields entirely.
    pub(crate) fn normal(time: &SnowTime) -> SnowTime {
        let mut tm = time.clone();
        tm.tm_wday = 0;
        tm.tm_yday = 0;
        tm.tm_isdst = 0;
        tm.tm_utcoff = 0;
        tm.tm_nsec = 0;
        tm
    }

    #[test]
    pub fn test_adv_year() {
        let mut tm = SnowTime::get_tm(2017, 10, 6, 12, 24, 0);
        adv_year(&mut tm);
        assert_eq!(normal(&tm), SnowTime::get_tm(2018, 10, 6, 12, 24, 0));
    }

    #[test]
    pub fn test_adv_month() {
        // January
        let mut tm = SnowTime::get_tm(2017, 1, 1, 12, 0, 0);
        adv_month(&mut tm);
        assert_eq!(normal(&tm), SnowTime::get_tm(2017, 2, 1, 12, 0, 0));

        // December
        let mut tm = SnowTime::get_tm(2017, 12, 1, 0, 0, 0);
        adv_month(&mut tm);
        assert_eq!(normal(&tm), SnowTime::get_tm(2018, 1, 1, 0, 0, 0));
    }

    #[test]
    pub fn test_adv_day_on_mday() {
        // 2017-01-01 00:00 UTC, a non-leap year starting on a Sunday (tm_wday=0).
        let mut tm = SnowTime::from_time_ts(1483228800);

        // 2017 to 2019 are not leap years
        let days_in_months = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

        // 2017 is (tm_year=117)
        for tm_year in 117..120 {
            assert_eq!(tm.tm_year, tm_year);

            for days_in_month in days_in_months.iter() {
                let bound = days_in_month + 1; // 1-indexed
                for expected_day in 1..bound {
                    assert_eq!(tm.tm_mday, expected_day);
                    adv_day(&mut tm);
                }
            }
        }

        assert_eq!(tm.tm_year, 120);

        // 2020 is a leap-year
        let days_in_months = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

        for days_in_month in days_in_months.iter() {
            let bound = days_in_month + 1; // 1-indexed
            for expected_day in 1..bound {
                assert_eq!(tm.tm_mday, expected_day);
                adv_day(&mut tm);
            }
        }

        assert_eq!(tm.tm_year, 121);
    }

    #[test]
    pub fn test_adv_day_on_wday() {
        // 2017-01-01 00:00 UTC, a non-leap year starting on a Sunday (tm_wday=0).
        let sunday = 1483228800;
        let mut tm = SnowTime::from_time_ts(sunday);

        // First week.
        assert_eq!(tm.tm_wday, 0);
        adv_day(&mut tm);
        assert_eq!(tm.tm_wday, 1);
        adv_day(&mut tm);
        assert_eq!(tm.tm_wday, 2);
        adv_day(&mut tm);
        assert_eq!(tm.tm_wday, 3);
        adv_day(&mut tm);
        assert_eq!(tm.tm_wday, 4);
        adv_day(&mut tm);
        assert_eq!(tm.tm_wday, 5);
        adv_day(&mut tm);
        assert_eq!(tm.tm_wday, 6);
        adv_day(&mut tm);
        assert_eq!(tm.tm_wday, 0); // Back to sunday!

        // Four more years...
        let mut expected = 0;
        for _ in 0..1460 {
            expected = (expected + 1) % 7;
            adv_day(&mut tm);
            assert_eq!(tm.tm_wday, expected);
        }

        // Reset.
        let mut tm = SnowTime::from_time_ts(sunday);

        assert_eq!(tm.tm_year, 117); // 2017
        assert_eq!(tm.tm_wday, 0); // Starts on a Sunday

        // Entire year.
        for _ in 0..365 {
            adv_day(&mut tm);
        }

        // Now it's 2018-01-01
        assert_eq!(tm.tm_year, 118); // 2018
        assert_eq!(tm.tm_wday, 1); // Starts on a Monday
    }

    #[test]
    pub fn test_adv_day_on_yday() {
        // 2017-01-01 00:00 UTC, a non-leap year starting on a Sunday (tm_wday=0).
        let mut tm = SnowTime::from_time_ts(1483228800);

        // First day of 2017. (tm_year=117)
        assert_eq!(tm.tm_year, 117);
        assert_eq!(tm.tm_yday, 0);

        // 2017 passes...
        for expected_day in 0..365 {
            assert_eq!(tm.tm_year, 117); // 2017
            assert_eq!(tm.tm_yday, expected_day);
            adv_day(&mut tm);
        }

        // First day of 2018.
        assert_eq!(tm.tm_year, 118);
        assert_eq!(tm.tm_yday, 0);

        // 2018 and 2019 pass... (Also not leap years.)
        for year in 118..120 {
            for expected_day in 0..365 {
                assert_eq!(tm.tm_year, year);
                assert_eq!(tm.tm_yday, expected_day);
                adv_day(&mut tm);
            }
        }

        // First day of 2020.
        assert_eq!(tm.tm_year, 120);
        assert_eq!(tm.tm_yday, 0);

        // This is a leap year!
        for expected_day in 0..366 {
            assert_eq!(tm.tm_year, 120);
            assert_eq!(tm.tm_yday, expected_day);
            adv_day(&mut tm);
        }

        // First day of 2021.
        assert_eq!(tm.tm_year, 121);
        assert_eq!(tm.tm_yday, 0);
    }
}

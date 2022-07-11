use super::error::CrontabError;
use super::{is_valid_utc_offset, times::is_leap_year};

#[repr(C)]
#[derive(Copy, Clone, PartialEq, Eq, Debug, Hash)]
#[cfg_attr(feature = "rustc-serialize", derive(RustcEncodable, RustcDecodable))]
pub struct SnowTime {
    /// Seconds after the minute - [0, 60]
    pub tm_sec: i32,

    /// Minutes after the hour - [0, 59]
    pub tm_min: i32,

    /// Hours after midnight - [0, 23]
    pub tm_hour: i32,

    /// Day of the month - [1, 31]
    pub tm_mday: i32,

    /// Months since January - [0, 11]
    pub tm_mon: i32,

    /// Years since 1900
    pub tm_year: i32,

    /// Days since Sunday - [0, 6]. 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
    pub tm_wday: i32,

    /// Days since January 1 - [0, 365]
    pub tm_yday: i32,

    /// Daylight Saving Time flag.
    ///
    /// This value is positive if Daylight Saving Time is in effect, zero if
    /// Daylight Saving Time is not in effect, and negative if this information
    /// is not available.
    pub tm_isdst: i32,

    /// Identifies the time zone that was used to compute this broken-down time
    /// value, including any adjustment for Daylight Saving Time. This is the
    /// number of seconds east of UTC. For example, for U.S. Pacific Daylight
    /// Time, the value is `-7*60*60 = -25200`.
    pub tm_utcoff: i32,

    /// Nanoseconds after the second - [0, 10<sup>9</sup> - 1]
    pub tm_nsec: i32,
}

impl SnowTime {
    pub fn new() -> SnowTime {
        SnowTime {
            tm_sec: 0,
            tm_min: 0,
            tm_hour: 0,
            tm_mday: 0,
            tm_mon: 0,
            tm_year: 0,
            tm_wday: 0,
            tm_yday: 0,
            tm_isdst: 0,
            tm_utcoff: 0,
            tm_nsec: 0,
        }
    }

    pub fn get_tm(
        year: i32,
        month: i32,
        day: i32,
        hour: i32,
        minute: i32,
        second: i32,
    ) -> SnowTime {
        SnowTime {
            tm_sec: second,
            tm_min: minute,
            tm_hour: hour,
            tm_mday: day,
            tm_mon: month.saturating_sub(1),    // zero indexed
            tm_year: year.saturating_sub(1900), // Years since 1900
            tm_wday: 0,                         // Incorrect, but don't care
            tm_yday: 0,                         // Incorrect, but don't care
            tm_isdst: 0,
            tm_utcoff: 0,
            tm_nsec: 0,
        }
    }

    pub fn from_time_ts(ts: i64) -> SnowTime {
        let mut tm = SnowTime::new();

        static _YTAB: [[i64; 12]; 2] = [
            [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
            [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
        ];

        let mut year = 1970;

        let dayclock = ts % 86400;
        let mut dayno = ts / 86400;

        tm.tm_sec = (dayclock % 60) as i32;
        tm.tm_min = ((dayclock % 3600) / 60) as i32;
        tm.tm_hour = (dayclock / 3600) as i32;
        tm.tm_wday = ((dayno + 4) % 7) as i32;
        loop {
            let yearsize = if is_leap_year(year) { 366 } else { 365 };
            if dayno >= yearsize {
                dayno -= yearsize;
                year += 1;
            } else {
                break;
            }
        }
        tm.tm_year = (year - 1900) as i32;
        tm.tm_yday = dayno as i32;
        let mut mon = 0;
        while dayno >= _YTAB[if is_leap_year(year) { 1 } else { 0 }][mon] {
            dayno -= _YTAB[if is_leap_year(year) { 1 } else { 0 }][mon];
            mon += 1;
        }
        tm.tm_mon = mon as i32;
        tm.tm_mday = dayno as i32 + 1;
        tm.tm_isdst = 0;

        tm
    }

    pub fn to_time_ts(&self, utc_offset: i32) -> Result<i64, CrontabError> {
        if !is_valid_utc_offset(utc_offset) {
            return Err(CrontabError::FieldOutsideRange {
                description: format!("Invald UTC offset value"),
            });
        }

        let tm = self;
        let mut y = tm.tm_year as i64 + 1900;
        let mut m = tm.tm_mon as i64 + 1;
        if m <= 2 {
            y -= 1;
            m += 12;
        }
        let d = tm.tm_mday as i64;
        let h = tm.tm_hour as i64;
        let mi = tm.tm_min as i64;
        let s = tm.tm_sec as i64;
        Ok(
            (365 * y + y / 4 - y / 100 + y / 400 + 3 * (m + 1) / 5 + 30 * m + d - 719561) * 86400
                + 3600 * h
                + 60 * mi
                + s
                + utc_offset as i64,
        )
    }
}

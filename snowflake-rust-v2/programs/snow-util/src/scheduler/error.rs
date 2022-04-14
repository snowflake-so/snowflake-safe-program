use std::fmt;
use std::num::ParseIntError;
// TODO: These errors could use some improvement, but that would be breaking.
/// A library error.
///
#[derive(Debug)]
pub enum CrontabError {
  /// Error parsing the crontab schedule.
  ErrCronFormat(String),
  /// Error parsing an integer in a crontab schedule.
  ErrParseInt(ParseIntError),
  /// Parse error. When one of the cron schedule fields is outside of the
  /// permitted range.
  FieldOutsideRange {
    /// Description of the error.
    description: String,
  },
}

impl From<ParseIntError> for CrontabError {
  fn from(err: ParseIntError) -> CrontabError {
    CrontabError::ErrParseInt(err)
  }
}

impl fmt::Display for CrontabError {
  fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
    match self {
      &CrontabError::ErrCronFormat(ref x) => write!(f, "<ErrCronFormat> {:?}", x),
      &CrontabError::ErrParseInt(ref e) => write!(f, "<ErrParseInt> {:?}", e),
      &CrontabError::FieldOutsideRange{ ref description } => {
        write!(f, "<FieldOutsideRange> {:?}", description)
      },
    }
  }
}

use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("SnowflakeSafe: The job data is invalid.")]
    InvalidJobData,

    #[msg("SnowflakeSafe: Invalid execution type for the job.")]
    InvalidExecutionType,

    #[msg("SnowflakeSafe: The job is not due for execution.")]
    JobIsNotDueForExecution,

    #[msg("SnowflakeSafe: The job is expired.")]
    JobIsExpired,

    #[msg("SnowflakeSafe: Unable to mark the time triggered job as error because it is still within schedule.")]
    CannotMarkJobAsErrorIfItsWithinSchedule,

    #[msg("SnowflakeSafe: User instruction must not reference the node operator.")]
    UserInstructionMustNotReferenceTheNodeOperator,

    #[msg("SnowflakeSafe: Creator is not assigned to owner list")]
    CreatorIsNotAssignedToOwnerList,

    #[msg("SnowflakeSafe: At least 1 required approvals")]
    InvalidMinApprovalsRequired,

    #[msg("SnowflakeSafe: Required approvals exceeds the number of owners")]
    InvalidMaxApprovalsRequired,

    #[msg("SnowflakeSafe: At least 1 owner.")]
    InvalidMinOwnerCount,

    #[msg("SnowflakeSafe: Max owner reached.")]
    InvalidMaxOwnerCount,

    #[msg("SnowflakeSafe: Invalid Safe.")]
    InvalidSafe,

    #[msg("SnowflakeSafe: Not an owner.")]
    InvalidOwner,

    #[msg("SnowflakeSafe: Duplicate owner address in safe.")]
    DuplicateOwnerInSafe,

    #[msg("SnowflakeSafe: Owner is not removed from safe")]
    OwnerIsNotRemoved,

    #[msg("SnowflakeSafe: Address signed already")]
    AddressSignedAlready,

    #[msg("SnowflakeSafe: Request is rejected")]
    RequestIsRejected,

    #[msg("SnowflakeSafe: Request is executed already")]
    RequestIsExecutedAlready,

    #[msg("SnowflakeSafe: Request is not approved yet")]
    RequestIsNotApprovedYet,

    #[msg("SnowflakeSafe: Request is not executed yet")]
    RequestIsNotExecutedYet,

    #[msg("SnowflakeSafe: Exceed limit proposal signatures")]
    ExceedLimitProposalSignatures,

    #[msg("SnowflakeSafe: Flow not enough approvals")]
    FlowNotEnoughApprovals,

    #[msg("SnowflakeSafe: Invalid UTC offset")]
    InvalidUtcOffset,

    #[msg("SnowflakeSafe: Cron pattern cannot be empty for scheduled flow")]
    InvalidCronPatternForScheduledFlow,
}

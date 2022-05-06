use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    // 6000
    #[msg("SnowflakeSafe: The job data is invalid.")]
    InvalidJobData,

    // 6001
    #[msg("SnowflakeSafe: The job is not due for execution.")]
    JobIsNotDueForExecution,

    #[msg("SnowflakeSafe: The job is expired.")]
    JobIsExpired,

    // 6002
    #[msg("SnowflakeSafe: Unable to mark the time triggered job as error because it is still within schedule.")]
    CannotMarkJobAsErrorIfItsWithinSchedule,

    // 6003
    #[msg("SnowflakeSafe: User instruction must not reference the node operator.")]
    UserInstructionMustNotReferenceTheNodeOperator,

    // 6004
    #[msg("SnowflakeSafe: Creator is not assigned to owner list")]
    CreatorIsNotAssignedToOwnerList,

    // 6005
    #[msg("SnowflakeSafe: At least 1 required approvals")]
    InvalidMinApprovalsRequired,

    // 6006
    #[msg("SnowflakeSafe: Required approvals exceeds the number of owners")]
    InvalidMaxApprovalsRequired,

    // 6007
    #[msg("SnowflakeSafe: At least 1 owner.")]
    InvalidMinOwnerCount,

    // 6008
    #[msg("SnowflakeSafe: Max owner reached.")]
    InvalidMaxOwnerCount,

    // 6009
    #[msg("SnowflakeSafe: Invalid Safe.")]
    InvalidSafe,

    // 6010
    #[msg("SnowflakeSafe: Not an owner.")]
    InvalidOwner,

    // 6011
    #[msg("SnowflakeSafe: Duplicate owner address in safe.")]
    DuplicateOwnerInSafe,

    // 6012
    #[msg("SnowflakeSafe: Owner is not removed from safe")]
    OwnerIsNotRemoved,

    // 6013
    #[msg("SnowflakeSafe: Address signed already")]
    AddressSignedAlready,

    // 6014
    #[msg("SnowflakeSafe: Request is rejected")]
    RequestIsRejected,

    // 6015
    #[msg("SnowflakeSafe: Request is executed already")]
    RequestIsExecutedAlready,

    // 6016
    #[msg("SnowflakeSafe: Request is not approved yet")]
    RequestIsNotApprovedYet,

    #[msg("SnowflakeSafe: Request is not executed yet")]
    RequestIsNotExecutedYet,

    // 6017
    #[msg("SnowflakeSafe: Exceed limit proposal signatures")]
    ExceedLimitProposalSignatures,

    // 6018
    #[msg("SnowflakeSafe: Flow not enough approvals")]
    FlowNotEnoughApprovals,
}

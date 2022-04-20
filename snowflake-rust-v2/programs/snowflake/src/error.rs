use anchor_lang::prelude::*;

#[error]
pub enum ErrorCode {
    // 6000 - The job data is invalid
    #[msg("SnowflakeCron: The job data is invalid.")]
    InvalidJobData,

    // 6001 - User instruction must not reference the node operator
    #[msg("SnowflakeCron: User instruction must not reference the node operator.")]
    UserInstructionMustNotReferenceTheNodeOperator,

    // 6002 - Creator is not assigned to owner list
    #[msg("SnowflakeSafe: Creator is not assigned to owner list")]
    CreatorIsNotAssignedToOwnerList,

    // 6003 - At least 1 required approvals
    #[msg("SnowflakeSafe: At least 1 required approvals")]
    InvalidMinApprovalsRequired,

    // 6004 - Required approvals exceeds the number of owners
    #[msg("SnowflakeSafe: Required approvals exceeds the number of owners")]
    InvalidMaxApprovalsRequired,

    // 6005 - At least 1 owner
    #[msg("SnowflakeSafe: At least 1 owner.")]
    InvalidMinOwnerCount,

    // 6006 - Max owner reached
    #[msg("SnowflakeSafe: Max owner reached.")]
    InvalidMaxOwnerCount,

    // 6007 - Invalid safe
    #[msg("SnowflakeSafe: Invalid Safe.")]
    InvalidSafe,

    // 6008 - Not an owner
    #[msg("SnowflakeSafe: Not an owner.")]
    InvalidOwner,

    // 6009 - Duplicate owner address in safe
    #[msg("SnowflakeSafe: Duplicate owner address in safe.")]
    DuplicateOwnerInSafe,

    // 6010 - Address signed already
    #[msg("SnowflakeSafe: Address signed already")]
    AddressSignedAlready,

    // 6011 - Request is rejected
    #[msg("SnowflakeSafe: Request is rejected")]
    RequestIsRejected,

    // 6012 - Request is executed already
    #[msg("SnowflakeSafe: Request is executed already")]
    RequestIsExecutedAlready,

    // 6013 - Request is not approved yet
    #[msg("SnowflakeSafe: Request is not approved yet")]
    RequestIsNotApprovedYet,

    // 6014 - Exceed limit proposal signatures
    #[msg("SnowflakeSafe: Exceed limit proposal signatures")]
    ExceedLimitProposalSignatures,

    // 6015 - Flow not enough approvals
    #[msg("Flow not enough approvals")]
    FlowNotEnoughApprovals,
}

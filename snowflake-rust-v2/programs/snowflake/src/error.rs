use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("SnowflakeCron: The job data is invalid.")]
    InvalidJobData,

    #[msg("SnowflakeCron: User instruction must not reference the node operator.")]
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

    #[msg("SnowflakeSafe: Address signed already")]
    AddressSignedAlready,

    #[msg("SnowflakeSafe: Request is rejected")]
    RequestIsRejected,

    #[msg("SnowflakeSafe: Request is executed already")]
    RequestIsExecutedAlready,

    #[msg("SnowflakeSafe: Request is not approved yet")]
    RequestIsNotApprovedYet,

    #[msg("SnowflakeSafe: Exceed limit proposal signatures")]
    ExceedLimitProposalSignatures,

    #[msg("Flow not enough approvals")]
    FlowNotEnoughApprovals,
}

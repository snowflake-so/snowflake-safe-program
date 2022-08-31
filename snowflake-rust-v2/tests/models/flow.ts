import BN from 'bn.js';
import { Action } from './flowAction';
import { PublicKey } from '@solana/web3.js';
import ApprovalRecord from './approvalRecord';

export interface Flow {
  name: string;
  nextExecutionTime: BN;
  lastScheduledExecution: BN;
  userUtcOffset: number;
  actions: [Action];
  recurring: boolean;
  retryWindow: number;
  remainingRuns: number;
  requestedBy: PublicKey;
  triggerType: number;
  payFeeFrom: number;
  scheduleEndDate: BN;
  expiryDate: BN;
  expireOnComplete: boolean;
  externalId: string;
  extra: string;
  safe: PublicKey;
  ownerSetSeq: number;
  approvals: ApprovalRecord[];
  proposalState: ProposalStateType;
}

export interface UIFlow {
  state: State;
  triggerType: TriggerType;
}

export enum RecurringUIOption {
  No = 'No',
  Yes = 'Yes',
}

export const RUN_FOREVER = -999;
export const RETRY_WINDOW = 900;

export enum TriggerType {
  None = 1,
  Time = 2,
  ProgramCondition = 3,
}

export enum TransactionType {
  Deposit = 0,
  Withdraw = 1,
  Transfer = 2,
}

export enum ProposalStateType {
  Draft = 222,
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  ExecutionInProgress = 3,
  Complete = 4,
  Failed = 5,
  Aborted = 6,
}

export const TriggerTypeLabels = {
  [TriggerType.None]: 'None',
  [TriggerType.Time]: 'Time',
  [TriggerType.ProgramCondition]: 'Program Condition',
};
export enum State {
  Pending = 1,
  Complete = 2,
  Error = 3,
}

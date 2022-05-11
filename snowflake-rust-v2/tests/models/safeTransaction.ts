import { Job } from '@snowflake-so/snowflake-sdk';
import { PublicKey } from '@solana/web3.js';
import { SnowflakeTemplateAction } from '../utils/flowTemplateUtil';
import { ProposalStateType } from './flow';

export type SafeTransaction = Job & {
  requestedBy: PublicKey;
  name: string;
  actions: SnowflakeTemplateAction<{}>[];
  safe: PublicKey;
  proposalStage: ProposalStateType;
  approvals: ApprovalRecord[];
  executedAt: number;
  ownerSetSeqno: number;
};

export type ApprovalRecord = {
  owner: PublicKey;
  isApproved: boolean;
  date: number;
};

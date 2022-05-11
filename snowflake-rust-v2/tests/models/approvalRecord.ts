import { PublicKey } from '@solana/web3.js';

export default interface ApprovalRecord {
  owner: PublicKey;
  date: number;
  isApproved: boolean;
}

import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { SafeOwner } from './safeOwner';

export interface SafeUIType {
  name: string;
  safeAddress: string;
  safeSignerAddress: string;
  approvalsRequired: number;
  owners: SafeOwner[];
  ownerSetSeqno: number;
  solBalance: number;
}

export type SafeType = {
  safePath: Buffer;
  safeNonce: number;
  safeSignerBump: number;
  owners: PublicKey[];
  approvalsRequired: number;
  ownerSetSeqno: number;
  creator: PublicKey;
  createdAt: BN;
};

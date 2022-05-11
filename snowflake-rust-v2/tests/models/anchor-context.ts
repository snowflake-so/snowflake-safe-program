import { AccountMeta, Keypair, PublicKey } from '@solana/web3.js';

export type InstructionContextType<T extends string> = {
  accounts: Record<T, PublicKey>;
  remainingAccounts?: AccountMeta[];
  signers?: Keypair[];
};

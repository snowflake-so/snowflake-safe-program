import { Program, ProgramAccount } from '@project-serum/anchor';
import {
  GetProgramAccountsFilter,
  Keypair,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import { Job, SerializableJob } from '@snowflake-so/snowflake-sdk';
import BufferLayout from 'buffer-layout';
import BN from 'bn.js';
import { Snowflake } from '../../target/types/snowflake';

import { Flow } from '../models/flow';
import { HashService } from './hashService';
import SafeInstructionService from './safeInstructionService';
import { programIds } from '../utils/ids';
import { SafeType } from '../models/safe';

export const FLOW_ACCOUNT_LAYOUT = BufferLayout.struct([
  BufferLayout.blob(8, 'discriminator'),
  BufferLayout.blob(32, 'requested_by'),
  BufferLayout.blob(32, 'safe'),
]);

export const DEFAULT_FLOW_SIZE = 1800;

export type ClientSafeParams = {
  owners: PublicKey[];
  approvalsRequired: number;
  creator: PublicKey;
  createdAt: BN;
  signerNonce: number;
};

export default class SafeService {
  constructor(readonly program: Program<Snowflake>) {}
  async createSafe(
    payer: PublicKey,
    safeName: string,
    owners: PublicKey[],
    approvalsRequired: number
  ) {
    const safePath = await SafeService.findSafeDerivationPath(safeName);
    const [safeAddress, _] = await SafeService.findSafeAddress(
      safeName,
      this.program.programId
    );
    const [, safeSignerNonce] = await SafeService.findSafeSignerAddress(
      safeAddress,
      this.program.programId
    );
    const result = SafeInstructionService.createSafeIxBase(
      payer,
      safePath,
      safeAddress,
      safeSignerNonce,
      owners,
      approvalsRequired,
      programIds().system
    );

    return { ...result, safePath };
  }

  async createAddOwnerInstruction(
    safeAddress: PublicKey,
    safeOwner: PublicKey
  ): Promise<TransactionInstruction[]> {
    const [safeSignerAddress] = await SafeService.findSafeSignerAddress(
      safeAddress,
      this.program.programId
    );

    const ix = await SafeInstructionService.addOwnerIx(
      this.program,
      safeSignerAddress,
      safeAddress,
      safeOwner
    );

    return [ix];
  }

  async createRemoveOwnerInstruction(
    safeAddress: PublicKey,
    safeOwner: PublicKey
  ): Promise<TransactionInstruction[]> {
    const [safeSignerAddress] = await SafeService.findSafeSignerAddress(
      safeAddress,
      this.program.programId
    );

    const ix = await SafeInstructionService.removeOwnerIx(
      this.program,
      safeSignerAddress,
      safeAddress,
      safeOwner
    );

    return [ix];
  }

  async createChangeThresholdInstruction(
    safeAddress: PublicKey,
    threshold: number
  ): Promise<TransactionInstruction[]> {
    const [safeSignerAddress] = await SafeService.findSafeSignerAddress(
      safeAddress,
      this.program.programId
    );

    const ix = await SafeInstructionService.changeThresholdIx(
      this.program,
      safeSignerAddress,
      safeAddress,
      threshold
    );

    return [ix];
  }

  createFlow(
    requestedByAddress: PublicKey,
    safeAddress: PublicKey,
    clientFlow: Flow,
    newFlowKeypair: Keypair
  ) {
    const data = SafeInstructionService.createFlowIxBase(
      requestedByAddress,
      DEFAULT_FLOW_SIZE,
      clientFlow,
      safeAddress,
      newFlowKeypair,
      programIds().system
    );
    return data;
  }

  approveProposal(
    walletKey: PublicKey,
    safeAddress: PublicKey,
    flowAddress: PublicKey,
    isApproved: boolean
  ) {
    const result = SafeInstructionService.approveProposalIxBase(
      safeAddress,
      flowAddress,
      walletKey,
      isApproved
    );

    return result;
  }


  private getSafeAddressFilter(publicKey: PublicKey): GetProgramAccountsFilter {
    return {
      memcmp: {
        offset: FLOW_ACCOUNT_LAYOUT.offsetOf('safe'),
        bytes: publicKey.toBase58(),
      },
    };
  }

  static findSafeDerivationPath(identifier: string): Buffer {
    return HashService.sha256(identifier);
  }

  static async findSafeAddress(
    identifier: string,
    safeProgramId: PublicKey
  ): Promise<[PublicKey, number]> {
    const prefix: Buffer = HashService.sha256('Safe').slice(0, 8);
    const derivationPath: Buffer = this.findSafeDerivationPath(identifier);
    return PublicKey.findProgramAddress(
      [prefix, derivationPath],
      safeProgramId
    );
  }

  static async findSafeSignerAddress(
    safeAddress: PublicKey,
    safeProgramId: PublicKey
  ): Promise<[PublicKey, number]> {
    const prefix: Buffer = HashService.sha256('SafeSigner').slice(0, 8);
    return PublicKey.findProgramAddress(
      [prefix, safeAddress.toBuffer()],
      safeProgramId
    );
  }
}

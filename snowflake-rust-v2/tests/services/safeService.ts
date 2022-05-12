import { Program, ProgramAccount, utils } from '@project-serum/anchor';
import {
  GetProgramAccountsFilter,
  Keypair,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import BufferLayout from 'buffer-layout';
import BN from 'bn.js';
import { Snowflake } from '../../target/types/snowflake';

import { Flow } from '../models/flow';
import SafeInstructionService from './safeInstructionService';
import { programIds } from '../utils/ids';

export const FLOW_ACCOUNT_LAYOUT = BufferLayout.struct([
  BufferLayout.blob(8, 'discriminator'),
  BufferLayout.blob(32, 'requested_by'),
  BufferLayout.blob(32, 'safe'),
]);

export const DEFAULT_FLOW_SIZE = 1800;

export default class SafeService {
  constructor(readonly program: Program<Snowflake>) {}
  async createSafe(
    payer: PublicKey,
    owners: PublicKey[],
    approvalsRequired: number
  ) {
    const safeKeypair = Keypair.generate();
    const [, safeSignerNonce] = await this.findSafeSignerAddress(
      safeKeypair.publicKey
    );

    const result = SafeInstructionService.createSafeIxBase(
      payer,
      safeKeypair.publicKey,
      safeSignerNonce,
      owners,
      approvalsRequired
    );

    return { safeKeypair, ...result };
  }

  async createAddOwnerInstruction(
    safeAddress: PublicKey,
    safeOwner: PublicKey
  ): Promise<TransactionInstruction[]> {
    const [safeSignerAddress] = await this.findSafeSignerAddress(safeAddress);

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
    const [safeSignerAddress] = await this.findSafeSignerAddress(safeAddress);

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
    const [safeSignerAddress] = await this.findSafeSignerAddress(safeAddress);

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

  async findSafeSignerAddress(
    safeAddress: PublicKey
  ): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [utils.bytes.utf8.encode('SafeSigner'), safeAddress.toBuffer()],
      this.program.programId
    );
  }
}

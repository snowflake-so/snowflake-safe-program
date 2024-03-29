import { Program, ProgramAccount } from '@project-serum/anchor';
import { JobBuilder } from '@snowflake-so/snowflake-sdk';
import {
  AccountMeta,
  Keypair,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import BN from 'bn.js';
import { InstructionContextType } from '../models/anchor-context';
import { Flow, TriggerType } from '../models/flow';
import { Snowflake } from '../../target/types/snowflake';

export type ClientSafeParams = {
  approvalsRequired: number;
  creator: PublicKey;
  createdAt: BN;
  signerBump: number;
  extra: string;
  owners: PublicKey[];
};

export default class SafeInstructionService {
  static async createSafeIx(
    program: Program,
    payerAddress: PublicKey,
    safePath: Buffer,
    safeAddress: PublicKey,
    safeSignerNonce: number,
    safeOwners: PublicKey[],
    approvalsRequired: number,
    systemProgram: PublicKey
  ): Promise<TransactionInstruction> {
    const ctx: any = {
      accounts: {
        payer: payerAddress,
        safe: safeAddress,
        systemProgram,
      },
      signers: [],
    };
    const safe: ClientSafeParams = {
      approvalsRequired: approvalsRequired,
      creator: payerAddress,
      createdAt: new BN(0),
      signerBump: safeSignerNonce,
      extra: '',
      owners: safeOwners.map<PublicKey>(owner => owner),
    };
    const createSafeIx = await program.instruction.createSafe(safePath, safe, ctx);
    return createSafeIx;
  }

  static createSafeIxBase(
    payerAddress: PublicKey,
    safeAddress: PublicKey,
    safeSignerAddress: PublicKey,
    safeSignerNonce: number,
    safeOwners: PublicKey[],
    approvalsRequired: number
  ) {
    const ctx = {
      accounts: {
        payer: payerAddress,
        safe: safeAddress,
        safeSigner: safeSignerAddress,
        systemProgram: SystemProgram.programId,
      },
      signers: [],
    };
    const safe: ClientSafeParams = {
      approvalsRequired: approvalsRequired,
      creator: payerAddress,
      createdAt: new BN(0),
      signerBump: safeSignerNonce,
      extra: '',
      owners: safeOwners.map<PublicKey>(owner => owner),
    };

    return { safe, ctx };
  }

  static async updateSafeIx(
    program: Program,
    payerAddress: PublicKey,
    safeAddress: PublicKey,
    safeOwners: PublicKey[],
    approvalsRequired: number
  ): Promise<TransactionInstruction> {
    const ctx: InstructionContextType<'safe' | 'caller'> = {
      accounts: {
        safe: safeAddress,
        caller: payerAddress,
      },
      signers: [],
    };
    const updateSafeIx = await program.instruction.updateSafe(safeOwners, approvalsRequired, ctx);
    return updateSafeIx;
  }

  static async addOwnerIx(
    program: Program<Snowflake>,
    safeSignerAddress: PublicKey,
    safeAddress: PublicKey,
    safeOwner: PublicKey
  ): Promise<TransactionInstruction> {
    const ctx: InstructionContextType<'safe' | 'safeSigner'> = {
      accounts: {
        safe: safeAddress,
        safeSigner: safeSignerAddress,
      },
      signers: [],
    };

    const setOwnersIx = await program.instruction.addOwner(safeOwner, ctx);

    return setOwnersIx;
  }

  static async removeOwnerIx(
    program: Program<Snowflake>,
    safeSignerAddress: PublicKey,
    safeAddress: PublicKey,
    safeOwner: PublicKey
  ): Promise<TransactionInstruction> {
    const ctx: InstructionContextType<'safe' | 'safeSigner'> = {
      accounts: {
        safe: safeAddress,
        safeSigner: safeSignerAddress,
      },
      signers: [],
    };

    const setOwnersIx = await program.instruction.removeOwner(safeOwner, ctx);

    return setOwnersIx;
  }

  static async changeThresholdIx(
    program: Program<Snowflake>,
    safeSignerAddress: PublicKey,
    safeAddress: PublicKey,
    threshold: number
  ): Promise<TransactionInstruction> {
    const ctx: InstructionContextType<'safe' | 'safeSigner'> = {
      accounts: {
        safe: safeAddress,
        safeSigner: safeSignerAddress,
      },
      signers: [],
    };

    const ix = await program.instruction.changeThreshold(threshold, ctx);
    const safeSigner = ix.keys.find((key: any) => {
      return key.pubkey.equals(safeSignerAddress);
    });
    safeSigner.isSigner = false;

    return ix;
  }

  static buildNewFlowJob(clientFlow: Flow, safeAddress: PublicKey) {
    const jobBuilder = new JobBuilder().jobName(clientFlow.name);
    if (clientFlow.recurring && clientFlow.triggerType === TriggerType.Time) {
      jobBuilder.scheduleCron((clientFlow as any).cron, clientFlow.remainingRuns);
    }
    if (clientFlow.triggerType === TriggerType.ProgramCondition) {
      jobBuilder.scheduleConditional(clientFlow.remainingRuns);
    }
    const job = jobBuilder.build();
    job.triggerType = clientFlow.triggerType;
    const serializableJob = job.toSerializableJob();
    serializableJob.actions = clientFlow.actions;
    serializableJob.ownerSetSeqno = clientFlow.ownerSetSeq;
    serializableJob.approvals = [];
    serializableJob.safe = safeAddress;
    serializableJob.proposalState = 0;

    return serializableJob;
  }

  static async createFlowIx(
    program: Program,
    requestedByAddress: PublicKey,
    account_size: number,
    clientFlow: Flow,
    safeAddress: PublicKey,
    newFlowKeypair: Keypair,
    systemProgram: PublicKey
  ): Promise<TransactionInstruction> {
    const ctx: InstructionContextType<'flow' | 'safe' | 'requestedBy' | 'systemProgram'> = {
      accounts: {
        flow: newFlowKeypair.publicKey,
        safe: safeAddress,
        requestedBy: requestedByAddress,
        systemProgram,
      },
      signers: [],
    };

    const serializableJob = this.buildNewFlowJob(clientFlow, safeAddress);
    const createFlowIx = await program.instruction.createFlow(account_size, serializableJob, ctx);
    return createFlowIx;
  }

  static createFlowIxBase(
    requestedByAddress: PublicKey,
    account_size: number,
    clientFlow: Flow,
    safeAddress: PublicKey,
    newFlowKeypair: Keypair,
    systemProgram: PublicKey
  ) {
    const ctx: InstructionContextType<'flow' | 'safe' | 'requestedBy' | 'systemProgram'> = {
      accounts: {
        flow: newFlowKeypair.publicKey,
        safe: safeAddress,
        requestedBy: requestedByAddress,
        systemProgram,
      },
      signers: [],
    };

    const serializableJob = this.buildNewFlowJob(clientFlow, safeAddress);
    return { accountSize: account_size, serializableJob, ctx };
  }

  static abortFlowIxBase(flowAddress: PublicKey, safeAddress: PublicKey, callerAddress: PublicKey) {
    const ctx: InstructionContextType<'flow' | 'safe' | 'requestedBy'> = {
      accounts: {
        flow: flowAddress,
        safe: safeAddress,
        requestedBy: callerAddress,
      },
    };

    return { ctx };
  }


  static async deleteFlowIx(
    program: Program,
    ownerAddress: PublicKey,
    flowAddress: PublicKey
  ): Promise<TransactionInstruction> {
    const ctx: InstructionContextType<'flow' | 'requestedBy'> = {
      accounts: {
        flow: flowAddress,
        requestedBy: ownerAddress,
      },
      signers: [],
    };

    const createFlowIx = await program.instruction.deleteFlow(ctx);
    return createFlowIx;
  }

  static deleteFlowIxBase(ownerAddress: PublicKey, flowAddress: PublicKey) {
    const ctx: InstructionContextType<'flow' | 'requestedBy'> = {
      accounts: {
        flow: flowAddress,
        requestedBy: ownerAddress,
      },
      signers: [],
    };

    return { ctx };
  }

  static async approveProposalIx(
    program: Program,
    safeAddress: PublicKey,
    flowAddress: PublicKey,
    payerAddress: PublicKey,
    isApproved: boolean
  ) {
    const ctx: InstructionContextType<'safe' | 'flow' | 'caller'> = {
      accounts: {
        safe: safeAddress,
        flow: flowAddress,
        caller: payerAddress,
      },
      signers: [],
    };

    const approveProposalIx = await program.instruction.approveProposal(isApproved, ctx);
    return approveProposalIx;
  }

  static approveProposalIxBase(
    safeAddress: PublicKey,
    flowAddress: PublicKey,
    payerAddress: PublicKey,
    isApproved: boolean
  ) {
    const ctx: InstructionContextType<'safe' | 'flow' | 'caller'> = {
      accounts: {
        safe: safeAddress,
        flow: flowAddress,
        caller: payerAddress,
      },
      signers: [],
    };

    return { isApproved, ctx };
  }

  static executeMultisigFlowIxBase(
    flowAddress: PublicKey,
    safeAddress: PublicKey,
    safeSignerAddress: PublicKey,
    ownerAddress: PublicKey,
    flowActions: any
  ) {
    const remainingAccountMetas: AccountMeta[] = flowActions.reduce((result, current) => {
      const currentAccounts = current.accounts.map(account => {
        return { ...account, isSigner: false };
      });
      result = result.concat(currentAccounts, {
        pubkey: current.program,
        isSigner: false,
        isWritable: false,
      });

      return result;
    }, []);
    const ctx: InstructionContextType<'flow' | 'safe' | 'safeSigner' | 'caller' | 'systemProgram'> = {
      accounts: {
        flow: flowAddress,
        safe: safeAddress,
        safeSigner: safeSignerAddress,
        caller: ownerAddress,
        systemProgram: SystemProgram.programId,
      },
      remainingAccounts: remainingAccountMetas,
    };

    return { ctx };
  }
}

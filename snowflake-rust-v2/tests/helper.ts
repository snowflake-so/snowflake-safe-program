import * as anchor from '@project-serum/anchor';
import { Program, BN } from '@project-serum/anchor';
import { SYSVAR_CLOCK_PUBKEY } from '@solana/web3.js';
import { Job, JobBuilder } from '@snowflake-so/snowflake-sdk';
import { Snowflake } from '../target/types/snowflake';

import SafeService from './services/safeService';
import SafeInstructionService, { ClientSafeParams } from './services/safeInstructionService';

// Configure the client to use the local cluster.
export const anchorProvider = anchor.AnchorProvider.env();
anchor.setProvider(anchorProvider);
export const program = anchor.workspace.Snowflake as Program<Snowflake>;
export const safeService = new SafeService(program);
export const ownerB = anchor.web3.Keypair.generate();
export const ownerC = anchor.web3.Keypair.generate();
export const ownerD = anchor.web3.Keypair.generate();
export const EMPTY_EXPIRY_DATE = undefined;
export const DRAFT_FLOW = true;

export const delay = (milliSeconds: number) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(true);
    }, milliSeconds);
  });
};

export const createSampleSafe = async (owners: anchor.web3.PublicKey[], threshold: number) => {
  const safeData = await safeService.createSafe(anchorProvider.wallet.publicKey, owners, threshold);

  await program.methods
    .createSafe(safeData.safe)
    .accounts(safeData.ctx.accounts)
    .signers([safeData.safeKeypair])
    .rpc();

  return safeData;
};

export const createSampleFlow = async (
  keypair: anchor.web3.Keypair,
  safeAddress: anchor.web3.PublicKey,
  ixs: anchor.web3.TransactionInstruction[]
) => {
  const job = new JobBuilder().jobName('Sample job').jobInstructions(ixs).build();
  return createSampleFlowWithJobBase(keypair, safeAddress, job, EMPTY_EXPIRY_DATE, false);
};

export const createSampleFlowDraft = async (
  keypair: anchor.web3.Keypair,
  safeAddress: anchor.web3.PublicKey,
  ixs: anchor.web3.TransactionInstruction[]
) => {
  const job = new JobBuilder().jobName('Sample job').jobInstructions(ixs).build();
  return createSampleFlowWithJobBase(keypair, safeAddress, job, EMPTY_EXPIRY_DATE, true);
};

export const createAddOwnerJob = async (
  safe: anchor.web3.PublicKey,
  owner: anchor.web3.PublicKey
) => {
  const ixs = await safeService.createAddOwnerInstruction(safe, owner);
  return new JobBuilder().jobName('Add new owner').jobInstructions(ixs).build();
};

export const createSampleFlowWithJob = async (
  keypair: anchor.web3.Keypair,
  safeAddress: anchor.web3.PublicKey,
  job: Job
) => {
  return createSampleFlowWithJobBase(keypair, safeAddress, job, EMPTY_EXPIRY_DATE, false);
};

export const createSampleFlowWithJobWithExpiryDate = async (
  keypair: anchor.web3.Keypair,
  safeAddress: anchor.web3.PublicKey,
  job: Job,
  expiryDate: BN
) => {
  return createSampleFlowWithJobBase(keypair, safeAddress, job, expiryDate, false);
};

export const createSampleFlowWithJobBase = async (
  keypair: anchor.web3.Keypair,
  safeAddress: anchor.web3.PublicKey,
  job: Job,
  expiryDate: BN,
  isDraft = false
) => {
  const [safeSignerAddress] = await safeService.findSafeSignerAddress(safeAddress);

  const flowData = safeService.createFlow(
    anchorProvider.wallet.publicKey,
    safeAddress,
    job.toSerializableJob(),
    keypair
  );

  if (expiryDate) {
    flowData.serializableJob.expiryDate = expiryDate;
  }

  await program.methods
    .createFlow(flowData.accountSize, flowData.serializableJob, isDraft)
    .accounts(flowData.ctx.accounts)
    .signers([keypair])
    .rpc();

  const flowAccount = await program.account.flow.fetch(keypair.publicKey);
  const executeData = SafeInstructionService.executeMultisigFlowIxBase(
    keypair.publicKey,
    safeAddress,
    safeSignerAddress,
    anchorProvider.wallet.publicKey,
    flowAccount.actions
  );

  return { flowData, executeData, flowKeypair: keypair };
};

export const getClusterUnixTimestamp = async () => {
  const accountInfo = await anchorProvider.connection.getParsedAccountInfo(SYSVAR_CLOCK_PUBKEY);
  return (accountInfo.value.data as any).parsed.info.unixTimestamp;
};

export type SafeData = {
  safe: ClientSafeParams;
  ctx: {
    accounts: {
      payer: anchor.web3.PublicKey;
      safe: anchor.web3.PublicKey;
      systemProgram: anchor.web3.PublicKey;
    };
    signers: any[];
  };
  safeKeypair: anchor.web3.Keypair;
};

const logAccounts = (accounts: any[]) => {
  accounts.forEach(key => {
    console.log('key', { ...key, pubkeyStr: key.pubkey.toString() });
  });
};

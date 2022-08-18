import * as anchor from '@project-serum/anchor';
import { SystemProgram } from '@solana/web3.js';
import { assert } from 'chai';
import { JobBuilder } from '@snowflake-so/snowflake-sdk';

import SafeInstructionService from './services/safeInstructionService';
import { ProposalStateType, TriggerType } from './models/flow';
import {
  program,
  anchorProvider,
  createSampleSafe,
  createSampleFlowWithJob,
  safeService,
  ownerB,
  SafeData,
} from './helper';

describe('Flow - Abort', () => {
  const owners = [anchorProvider.wallet.publicKey, ownerB.publicKey];
  let safeData: SafeData;

  before(async () => {
    safeData = await createSampleSafe(owners, 1);
  });

  it('Can only abort the flow with ExecutionInProgress status', async () => {
    const ixs = SystemProgram.transfer({
      fromPubkey: anchorProvider.wallet.publicKey,
      toPubkey: anchorProvider.wallet.publicKey,
      lamports: 10,
    });

    const job = new JobBuilder()
      .jobName('Send SOL')
      .jobInstructions([ixs])
      .scheduleCron('0 10 1 * *')
      .build();

    const sendSolFlow = await createSampleFlowWithJob(
      anchor.web3.Keypair.generate(),
      safeData.ctx.accounts.safe,
      job
    );

    const abortData = SafeInstructionService.abortFlowIxBase(
      sendSolFlow.flowKeypair.publicKey,
      safeData.ctx.accounts.safe,
      anchorProvider.wallet.publicKey
    );

    let flowAccount = await program.account.flow.fetch(sendSolFlow.flowKeypair.publicKey);

    assert.strictEqual(flowAccount.triggerType, TriggerType.Time);
    assert.strictEqual(flowAccount.proposalStage, ProposalStateType.Pending);

    try {
      await program.methods.abortFlow().accounts(abortData.ctx.accounts).rpc();
      assert.fail();
    } catch (error) {
      assert.strictEqual(error.error.errorCode.code, 'RequestIsNotExecutedYet');
    }

    const approveData = safeService.approveProposal(
      anchorProvider.wallet.publicKey,
      safeData.ctx.accounts.safe,
      sendSolFlow.flowKeypair.publicKey,
      true
    );
    await approveData.builder.rpc();
    flowAccount = await program.account.flow.fetch(sendSolFlow.flowKeypair.publicKey);
    assert.strictEqual(flowAccount.proposalStage, ProposalStateType.Approved);

    await program.methods
      .executeMultisigFlow()
      .accounts(sendSolFlow.executeData.ctx.accounts)
      .remainingAccounts(sendSolFlow.executeData.ctx.remainingAccounts)
      .rpc();
    flowAccount = await program.account.flow.fetch(sendSolFlow.flowKeypair.publicKey);
    assert.strictEqual(flowAccount.proposalStage, ProposalStateType.ExecutionInProgress);

    await program.methods.abortFlow().accounts(abortData.ctx.accounts).rpc();
    flowAccount = await program.account.flow.fetch(sendSolFlow.flowKeypair.publicKey);
    assert.strictEqual(flowAccount.proposalStage, ProposalStateType.Aborted);
  });
});

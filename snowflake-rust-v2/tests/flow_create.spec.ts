import { Keypair } from '@solana/web3.js';
import { assert } from 'chai';
import { JobBuilder, RECURRING_FOREVER } from '@snowflake-so/snowflake-sdk';

import { TriggerType } from './models/flow';
import {
  program,
  anchorProvider,
  createSampleSafe,
  safeService,
  ownerB,
  SafeData,
  DRAFT_FLOW,
} from './helper';

describe('Flow - Create', () => {
  const owners = [anchorProvider.wallet.publicKey, ownerB.publicKey];
  let safeData: SafeData;

  before(async () => {
    safeData = await createSampleSafe(owners, 1);
  });

  it('Cannot create flow with invalid trigger type', async () => {
    const safeAddress = safeData.ctx.accounts.safe;
    const keypair = Keypair.generate();
    const job = new JobBuilder().jobName('Add new owner').jobInstructions([]).build();
    job.triggerType = 5;
    const flowData = safeService.createFlow(
      anchorProvider.wallet.publicKey,
      safeAddress,
      job.toSerializableJob(),
      keypair
    );

    try {
      await program.methods
        .createFlow(flowData.accountSize, flowData.serializableJob, !DRAFT_FLOW)
        .accounts(flowData.ctx.accounts)
        .signers([keypair])
        .rpc();
    } catch (error) {
      assert.strictEqual(error.error.errorCode.code, 'InvalidJobData');
    }
  });

  it('Cannot create flow with negative value of remaining_runs', async () => {
    const safeAddress = safeData.ctx.accounts.safe;
    const keypair = Keypair.generate();
    const job = new JobBuilder().jobName('Add new owner').jobInstructions([]).build();
    job.remainingRuns = -1;
    const flowData = safeService.createFlow(
      anchorProvider.wallet.publicKey,
      safeAddress,
      job.toSerializableJob(),
      keypair
    );

    try {
      await program.methods
        .createFlow(flowData.accountSize, flowData.serializableJob, !DRAFT_FLOW)
        .accounts(flowData.ctx.accounts)
        .signers([keypair])
        .rpc();
    } catch (error) {
      assert.strictEqual(error.error.errorCode.code, 'InvalidJobData');
    }
  });

  it('Cannot create flow with invalid RECURRING_FOREVER logic', async () => {
    const safeAddress = safeData.ctx.accounts.safe;
    const keypair = Keypair.generate();
    const job = new JobBuilder().jobName('Add new owner').jobInstructions([]).build();
    job.recurring = false;
    job.remainingRuns = RECURRING_FOREVER;
    const flowData = safeService.createFlow(
      anchorProvider.wallet.publicKey,
      safeAddress,
      job.toSerializableJob(),
      keypair
    );

    try {
      await program.methods
        .createFlow(flowData.accountSize, flowData.serializableJob, !DRAFT_FLOW)
        .accounts(flowData.ctx.accounts)
        .signers([keypair])
        .rpc();
    } catch (error) {
      assert.strictEqual(error.error.errorCode.code, 'InvalidJobData');
    }
  });

  it('Create program condition flow', async () => {
    const safeAddress = safeData.ctx.accounts.safe;
    const keypair = Keypair.generate();
    const job = new JobBuilder().jobName('Add new owner').jobInstructions([]).build();
    job.triggerType = TriggerType.ProgramCondition;
    job.remainingRuns = 999;
    const flowData = safeService.createFlow(
      anchorProvider.wallet.publicKey,
      safeAddress,
      job.toSerializableJob(),
      keypair
    );

    await program.methods
      .createFlow(flowData.accountSize, flowData.serializableJob, !DRAFT_FLOW)
      .accounts(flowData.ctx.accounts)
      .signers([keypair])
      .rpc();

    const flowAccount = await program.account.flow.fetch(flowData.ctx.accounts.flow);
    assert.strictEqual(flowAccount.triggerType, TriggerType.ProgramCondition);
    assert.strictEqual(flowAccount.remainingRuns, 999);
  });

  it('Create program condition flow with remainingRuns larger than maximum value', async () => {
    const safeAddress = safeData.ctx.accounts.safe;
    const keypair = Keypair.generate();
    const job = new JobBuilder().jobName('Add new owner').jobInstructions([]).build();
    job.triggerType = TriggerType.ProgramCondition;
    job.remainingRuns = 31000;
    const flowData = safeService.createFlow(
      anchorProvider.wallet.publicKey,
      safeAddress,
      job.toSerializableJob(),
      keypair
    );

    try {
      await program.methods
        .createFlow(flowData.accountSize, flowData.serializableJob, !DRAFT_FLOW)
        .accounts(flowData.ctx.accounts)
        .signers([keypair])
        .rpc();
    } catch (error) {
      assert.strictEqual(error.error.errorCode.code, 'InvalidRemainingRuns');
    }
  });

  it('Create program condition flow with RECURRING_FOREVER', async () => {
    const safeAddress = safeData.ctx.accounts.safe;
    const keypair = Keypair.generate();
    const job = new JobBuilder().jobName('Add new owner').jobInstructions([]).build();
    job.triggerType = TriggerType.ProgramCondition;
    job.recurring = true;
    job.remainingRuns = RECURRING_FOREVER;
    const flowData = safeService.createFlow(
      anchorProvider.wallet.publicKey,
      safeAddress,
      job.toSerializableJob(),
      keypair
    );

    try {
      await program.methods
        .createFlow(flowData.accountSize, flowData.serializableJob, !DRAFT_FLOW)
        .accounts(flowData.ctx.accounts)
        .signers([keypair])
        .rpc();
    } catch (error) {
      assert.strictEqual(error.error.errorCode.code, 'InvalidRemainingRuns');
    }
  });
});

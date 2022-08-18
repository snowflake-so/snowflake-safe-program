import * as anchor from '@project-serum/anchor';
import { BN } from '@project-serum/anchor';
import { Keypair, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { assert } from 'chai';
import { JobBuilder } from '@snowflake-so/snowflake-sdk';

import { ProposalStateType, TriggerType } from './models/flow';
import {
  program,
  anchorProvider,
  createSampleSafe,
  createSampleFlowWithJob,
  createAddOwnerJob,
  safeService,
  delay,
  getClusterUnixTimestamp,
  ownerB,
  ownerD,
  SafeData,
  createSampleFlowWithJobWithExpiryDate,
} from './helper';

describe('Flow - Execute', () => {
  const owners = [anchorProvider.wallet.publicKey, ownerB.publicKey];
  let safeData: SafeData;

  before(async () => {
    safeData = await createSampleSafe(owners, 1);
  });

  describe('Execute Flow', () => {
    it('Flow must be in approved status', async () => {
      const addOwnerFlow = await createSampleFlowWithJob(
        Keypair.generate(),
        safeData.ctx.accounts.safe,
        await createAddOwnerJob(safeData.ctx.accounts.safe, ownerD.publicKey)
      );

      try {
        await program.methods
          .executeMultisigFlow()
          .accounts(addOwnerFlow.executeData.ctx.accounts)
          .remainingAccounts(addOwnerFlow.executeData.ctx.remainingAccounts)
          .rpc();
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, 'RequestIsNotApprovedYet');
      }
    });

    it('Caller must be an owner of the safe that the flow points to', async () => {
      const addOwnerFlow = await createSampleFlowWithJob(
        anchor.web3.Keypair.generate(),
        safeData.ctx.accounts.safe,
        await createAddOwnerJob(safeData.ctx.accounts.safe, ownerD.publicKey)
      );

      const approveData = safeService.approveProposal(
        anchorProvider.wallet.publicKey,
        safeData.ctx.accounts.safe,
        addOwnerFlow.flowKeypair.publicKey,
        true
      );
      await approveData.builder.rpc();

      try {
        const nonOwner = anchor.web3.Keypair.generate();
        const accounts = {
          ...addOwnerFlow.executeData.ctx.accounts,
          caller: nonOwner.publicKey,
        };
        await program.methods
          .executeMultisigFlow()
          .accounts(accounts)
          .remainingAccounts(addOwnerFlow.executeData.ctx.remainingAccounts)
          .signers([nonOwner])
          .rpc();
        assert.fail();
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, 'InvalidOwner');
      }
    });

    it('Flow has not expired for execution', async () => {
      const now = await getClusterUnixTimestamp();
      const delaySeconds = 3;
      const addOwnerFlow = await createSampleFlowWithJobWithExpiryDate(
        anchor.web3.Keypair.generate(),
        safeData.ctx.accounts.safe,
        await createAddOwnerJob(safeData.ctx.accounts.safe, ownerD.publicKey),
        new BN(now + delaySeconds)
      );

      const approveData = safeService.approveProposal(
        anchorProvider.wallet.publicKey,
        safeData.ctx.accounts.safe,
        addOwnerFlow.flowKeypair.publicKey,
        true
      );
      await approveData.builder.rpc();

      try {
        await delay(delaySeconds * 1000 + 1000);
        await program.methods
          .executeMultisigFlow()
          .accounts(addOwnerFlow.executeData.ctx.accounts)
          .remainingAccounts(addOwnerFlow.executeData.ctx.remainingAccounts)
          .rpc();
        assert.fail();
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, 'JobIsExpired');
      }
    });
  });

  describe('Execute Scheduled Flow', () => {
    it('Only execute the flow with ExecutionInProgress status', async () => {
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

      let flowAccount = await program.account.flow.fetch(sendSolFlow.flowKeypair.publicKey);

      assert.strictEqual(flowAccount.triggerType, TriggerType.Time);
      assert.strictEqual(flowAccount.proposalStage, ProposalStateType.Pending);

      try {
        await program.methods
          .executeScheduledMultisigFlow()
          .accounts(sendSolFlow.executeData.ctx.accounts)
          .remainingAccounts(sendSolFlow.executeData.ctx.remainingAccounts)
          .rpc();
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

      try {
        const airdropSignature = await anchorProvider.connection.requestAirdrop(
          sendSolFlow.executeData.ctx.accounts.safeSigner,
          LAMPORTS_PER_SOL
        );
        await anchorProvider.connection.confirmTransaction(airdropSignature);
        await program.methods
          .executeScheduledMultisigFlow()
          .accounts(sendSolFlow.executeData.ctx.accounts)
          .remainingAccounts(sendSolFlow.executeData.ctx.remainingAccounts)
          .rpc();
        assert.fail();
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, 'JobIsNotDueForExecution');
      }
    });
  });

  describe('Mark Timed Flow As Error', () => {
    it('Only mark the flow with ExecutionInProgress status', async () => {
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

      let flowAccount = await program.account.flow.fetch(sendSolFlow.flowKeypair.publicKey);

      assert.strictEqual(flowAccount.triggerType, TriggerType.Time);
      assert.strictEqual(flowAccount.proposalStage, ProposalStateType.Pending);

      try {
        await program.methods
          .markTimedFlowAsError()
          .accounts(sendSolFlow.executeData.ctx.accounts)
          .remainingAccounts(sendSolFlow.executeData.ctx.remainingAccounts)
          .rpc();
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

      try {
        const airdropSignature = await anchorProvider.connection.requestAirdrop(
          sendSolFlow.executeData.ctx.accounts.safeSigner,
          LAMPORTS_PER_SOL
        );
        await anchorProvider.connection.confirmTransaction(airdropSignature);
        await program.methods
          .markTimedFlowAsError()
          .accounts(sendSolFlow.executeData.ctx.accounts)
          .remainingAccounts(sendSolFlow.executeData.ctx.remainingAccounts)
          .rpc();
        assert.fail();
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, 'CannotMarkJobAsErrorIfItsWithinSchedule');
      }
    });
  });
});

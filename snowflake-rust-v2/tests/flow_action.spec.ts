import { Keypair } from '@solana/web3.js';
import assert from 'assert';
import { expect } from 'chai';

import {
  program,
  anchorProvider,
  createSampleSafe,
  createSampleFlow,
  safeService,
  ownerB,
  SafeData,
  ownerC,
  createSampleFlowDraft,
} from './helper';
import { ProposalStateType } from './models/flow';

describe('Flow - Action', () => {
  const owners = [anchorProvider.wallet.publicKey, ownerB.publicKey];
  let safeData: SafeData;

  before(async () => {
    safeData = await createSampleSafe(owners, 1);
  });

  it('Can add actions', async () => {
    // create flow
    const sampleFlowData = await createSampleFlowDraft(
      Keypair.generate(),
      safeData.ctx.accounts.safe,
      []
    );

    let flowAccount = await program.account.flow.fetch(sampleFlowData.flowKeypair.publicKey);
    expect(flowAccount.proposalStage).to.equal(ProposalStateType.Draft);
    expect(flowAccount.actions).to.be.an('array').that.is.empty;

    // add AddOwner action
    const ixs = await safeService.createAddOwnerInstruction(
      safeData.ctx.accounts.safe,
      ownerC.publicKey
    );
    await safeService
      .createAddAction(
        sampleFlowData.flowKeypair.publicKey,
        anchorProvider.wallet.publicKey,
        ixs[0],
        true
      )
      .builder.rpc();
    flowAccount = await program.account.flow.fetch(sampleFlowData.flowKeypair.publicKey);
    expect(flowAccount.proposalStage).to.equal(ProposalStateType.Pending);
    expect(flowAccount.actions).to.be.an('array').that.is.lengthOf(1);

    // TODO fix execution error
    // // approve flow
    // const approveData = safeService.approveProposal(
    //   anchorProvider.wallet.publicKey,
    //   safeData.ctx.accounts.safe,
    //   sampleFlowData.flowKeypair.publicKey,
    //   true
    // );
    // await approveData.builder.rpc();

    // try {
    //   // but can't execute
    //   const result = await program.methods
    //     .executeMultisigFlow()
    //     .accounts(sampleFlowData.executeData.ctx.accounts)
    //     .remainingAccounts(sampleFlowData.executeData.ctx.remainingAccounts)
    //     .rpc();
    //   console.log('result', result);
    //   flowAccount = await program.account.flow.fetch(
    //     sampleFlowData.flowKeypair.publicKey
    //   );
    //   console.log('flowAccount', flowAccount);
    // } catch (error) {
    //   console.log('error', error);
    //   assert.fail();
    // }
  });

  it('Cannot add action if proposalStage is approved', async () => {
    const sampleFlowData = await createSampleFlow(
      Keypair.generate(),
      safeData.ctx.accounts.safe,
      []
    );

    const approveData = safeService.approveProposal(
      anchorProvider.wallet.publicKey,
      safeData.ctx.accounts.safe,
      sampleFlowData.flowKeypair.publicKey,
      true
    );
    await approveData.builder.rpc();

    try {
      const ixs = await safeService.createAddOwnerInstruction(
        safeData.ctx.accounts.safe,
        ownerC.publicKey
      );
      await safeService
        .createAddAction(
          sampleFlowData.flowKeypair.publicKey,
          anchorProvider.wallet.publicKey,
          ixs[0],
          true
        )
        .builder.rpc();
    } catch (error) {
      assert.strictEqual(error.error.errorCode.code, 'FlowMustHaveZeroApproverBeforeUpdate');
    }
  });

  it('Cannot add action if proposalStage is rejected', async () => {
    const sampleFlowData = await createSampleFlow(
      Keypair.generate(),
      safeData.ctx.accounts.safe,
      []
    );

    const approveData = safeService.approveProposal(
      anchorProvider.wallet.publicKey,
      safeData.ctx.accounts.safe,
      sampleFlowData.flowKeypair.publicKey,
      false
    );
    await approveData.builder.rpc();

    try {
      const ixs = await safeService.createAddOwnerInstruction(
        safeData.ctx.accounts.safe,
        ownerC.publicKey
      );
      await safeService
        .createAddAction(
          sampleFlowData.flowKeypair.publicKey,
          anchorProvider.wallet.publicKey,
          ixs[0],
          true
        )
        .builder.rpc();
    } catch (error) {
      assert.strictEqual(error.error.errorCode.code, 'FlowMustHaveZeroApproverBeforeUpdate');
    }
  });

  it('Only flow creator can add action', async () => {
    const sampleFlowData = await createSampleFlowDraft(
      Keypair.generate(),
      safeData.ctx.accounts.safe,
      []
    );

    const flowAccount = await program.account.flow.fetch(sampleFlowData.flowKeypair.publicKey);
    expect(flowAccount.proposalStage).to.equal(ProposalStateType.Draft);
    expect(flowAccount.actions).to.be.an('array').that.is.empty;

    try {
      const ixs = await safeService.createAddOwnerInstruction(
        safeData.ctx.accounts.safe,
        ownerC.publicKey
      );
      await safeService
        .createAddAction(sampleFlowData.flowKeypair.publicKey, ownerB.publicKey, ixs[0], true)
        .builder.signers([ownerB])
        .rpc();
    } catch (error) {
      assert.strictEqual(error.error.errorCode.code, 'ConstraintHasOne');
    }
  });
});

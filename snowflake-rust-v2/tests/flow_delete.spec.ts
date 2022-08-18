import { Keypair } from '@solana/web3.js';
import { assert } from 'chai';

import SafeInstructionService from './services/safeInstructionService';
import {
  program,
  anchorProvider,
  createSampleSafe,
  createSampleFlow,
  safeService,
  ownerB,
  ownerD,
  SafeData,
} from './helper';

describe('Flow - Delete', () => {
  const owners = [anchorProvider.wallet.publicKey, ownerB.publicKey];
  let safeData: SafeData;

  before(async () => {
    safeData = await createSampleSafe(owners, 1);
  });

  it('Can delete a flow', async () => {
    const sampleFlow = await createSampleFlow(Keypair.generate(), safeData.ctx.accounts.safe, []);

    try {
      const deleteData = SafeInstructionService.deleteFlowIxBase(
        anchorProvider.wallet.publicKey,
        sampleFlow.flowKeypair.publicKey
      );

      await program.methods.deleteFlow().accounts(deleteData.ctx.accounts).rpc();
      await program.account.flow.fetch(sampleFlow.flowKeypair.publicKey);
    } catch (error) {
      assert.strictEqual(
        error.message,
        `Account does not exist ${sampleFlow.flowKeypair.publicKey}`
      );
    }
  });

  it('The caller must be the requestor of the flow', async () => {
    try {
      const sampleFlow = await createSampleFlow(Keypair.generate(), safeData.ctx.accounts.safe, []);

      const deleteData = SafeInstructionService.deleteFlowIxBase(
        ownerB.publicKey,
        sampleFlow.flowKeypair.publicKey
      );

      await program.methods.deleteFlow().accounts(deleteData.ctx.accounts).signers([ownerB]).rpc();
      assert.fail();
    } catch (error) {
      assert.strictEqual(error.error.errorCode.code, 'ConstraintHasOne');
    }
  });

  it('The flow has not yet transitioned to the complete or in_execution state', async () => {
    const ixs = await safeService.createAddOwnerInstruction(
      safeData.ctx.accounts.safe,
      ownerD.publicKey
    );

    const sampleFlow = await createSampleFlow(Keypair.generate(), safeData.ctx.accounts.safe, ixs);

    const approveData = safeService.approveProposal(
      anchorProvider.wallet.publicKey,
      safeData.ctx.accounts.safe,
      sampleFlow.flowKeypair.publicKey,
      true
    );
    await approveData.builder.rpc();

    await program.methods
      .executeMultisigFlow()
      .accounts(sampleFlow.executeData.ctx.accounts)
      .remainingAccounts(sampleFlow.executeData.ctx.remainingAccounts)
      .rpc();

    try {
      const deleteData = SafeInstructionService.deleteFlowIxBase(
        anchorProvider.wallet.publicKey,
        sampleFlow.flowKeypair.publicKey
      );

      await program.methods.deleteFlow().accounts(deleteData.ctx.accounts).rpc();
      assert.fail();
    } catch (error) {
      assert.strictEqual(error.error.errorCode.code, 'ConstraintRaw');
    }
  });
});

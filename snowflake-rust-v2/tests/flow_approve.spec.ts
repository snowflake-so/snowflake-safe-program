import { BN } from '@project-serum/anchor';
import { Keypair } from '@solana/web3.js';
import { assert } from 'chai';

import {
  program,
  anchorProvider,
  createSampleSafe,
  createSampleFlow,
  createAddOwnerJob,
  safeService,
  delay,
  getClusterUnixTimestamp,
  ownerB,
  ownerC,
  ownerD,
  SafeData,
  createSampleFlowWithJobWithExpiryDate,
} from './helper';

describe('Flow - Approve', () => {
  const owners = [anchorProvider.wallet.publicKey, ownerB.publicKey];
  let safeData: SafeData;

  before(async () => {
    safeData = await createSampleSafe(owners, 1);
  });

  it('Can reject a flow', async () => {
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

    const flowAccount = await program.account.flow.fetch(sampleFlowData.flowKeypair.publicKey);

    assert.strictEqual((flowAccount.approvals as any).length, 1);
    assert.ok(flowAccount.approvals[0].owner.equals(anchorProvider.wallet.publicKey));
    assert.strictEqual(flowAccount.approvals[0].isApproved, false);
  });

  it('Caller must be an owner', async () => {
    const sampleFlow = await createSampleFlow(Keypair.generate(), safeData.ctx.accounts.safe, []);

    const approveData = safeService.approveProposal(
      ownerC.publicKey,
      safeData.ctx.accounts.safe,
      sampleFlow.flowKeypair.publicKey,
      true
    );

    try {
      await approveData.builder.signers([ownerC]).rpc();
      assert.fail();
    } catch (error) {
      assert.strictEqual(error.error.errorCode.code, 'InvalidOwner');
    }
  });

  it('Caller has not approved the flow prior to the operation', async () => {
    const sampleFlow = await createSampleFlow(Keypair.generate(), safeData.ctx.accounts.safe, []);

    const approveData = safeService.approveProposal(
      anchorProvider.wallet.publicKey,
      safeData.ctx.accounts.safe,
      sampleFlow.flowKeypair.publicKey,
      true
    );
    await approveData.builder.rpc();

    try {
      await approveData.builder.rpc();
      assert.fail();
    } catch (error) {
      assert.strictEqual(error.error.errorCode.code, 'AddressSignedAlready');
    }
  });

  it('Flow has not expired', async () => {
    const job = await createAddOwnerJob(safeData.ctx.accounts.safe, ownerB.publicKey);

    const now = await getClusterUnixTimestamp();
    const delaySeconds = 3;
    const sampleFlow = await createSampleFlowWithJobWithExpiryDate(
      Keypair.generate(),
      safeData.ctx.accounts.safe,
      job,
      new BN(now + delaySeconds)
    );

    try {
      const approveData = safeService.approveProposal(
        anchorProvider.wallet.publicKey,
        safeData.ctx.accounts.safe,
        sampleFlow.flowKeypair.publicKey,
        true
      );
      await delay(delaySeconds * 1000 + 1000);
      await approveData.builder.rpc();
      assert.fail();
    } catch (error) {
      assert.strictEqual(error.error.errorCode.code, 'JobIsExpired');
    }
  });

  it('Flow.owner_seq must match Safe.owner_seq', async () => {
    const ixsC = await safeService.createAddOwnerInstruction(
      safeData.ctx.accounts.safe,
      ownerC.publicKey
    );
    const ixsD = await safeService.createAddOwnerInstruction(
      safeData.ctx.accounts.safe,
      ownerD.publicKey
    );
    const sampleFlowC = await createSampleFlow(
      Keypair.generate(),
      safeData.ctx.accounts.safe,
      ixsC
    );
    const sampleFlowD = await createSampleFlow(
      Keypair.generate(),
      safeData.ctx.accounts.safe,
      ixsD
    );

    const approveData = safeService.approveProposal(
      anchorProvider.wallet.publicKey,
      safeData.ctx.accounts.safe,
      sampleFlowC.flowKeypair.publicKey,
      true
    );
    await approveData.builder.rpc();
    await program.methods
      .executeMultisigFlow()
      .accounts(sampleFlowC.executeData.ctx.accounts)
      .remainingAccounts(sampleFlowC.executeData.ctx.remainingAccounts)
      .rpc();

    try {
      const approveData = safeService.approveProposal(
        anchorProvider.wallet.publicKey,
        safeData.ctx.accounts.safe,
        sampleFlowD.flowKeypair.publicKey,
        true
      );
      await approveData.builder.rpc();
      assert.fail();
    } catch (error) {
      assert.strictEqual(error.error.errorCode.code, 'ConstraintRaw');
    }
  });
});

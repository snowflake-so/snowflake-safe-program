import { Keypair } from '@solana/web3.js';
import { assert } from 'chai';
import { JobBuilder, SerializableAction } from '@snowflake-so/snowflake-sdk';

import SafeInstructionService from './services/safeInstructionService';
import { ProposalStateType } from './models/flow';
import {
  program,
  anchorProvider,
  createSampleSafe,
  safeService,
  ownerB,
  ownerC,
  ownerD,
} from './helper';

describe('Snowflake', () => {
  it('Test Safe Program - Happy Path', async () => {
    const owners = [anchorProvider.wallet.publicKey, ownerB.publicKey, ownerC.publicKey];
    const { safe, ctx } = await createSampleSafe(owners, 2);
    let safeAccount = await program.account.safe.fetch(ctx.accounts.safe);

    assert.strictEqual(safeAccount.signerBump, safe.signerBump);
    assert.strictEqual(safeAccount.approvalsRequired, 2);
    assert.deepEqual(safeAccount.owners, owners);
    assert.strictEqual(safeAccount.ownerSetSeqno, 0);

    // Create add owner instruction
    const ixs = await safeService.createAddOwnerInstruction(ctx.accounts.safe, ownerD.publicKey);
    const [safeSignerAddress] = await safeService.findSafeSignerAddress(ctx.accounts.safe);
    const job = new JobBuilder().jobName('Add new owner').jobInstructions(ixs).build();
    const newFlowKeypair = Keypair.generate();
    const {
      accountSize,
      serializableJob,
      ctx: createFlowCtx,
    } = safeService.createFlow(
      anchorProvider.wallet.publicKey,
      ctx.accounts.safe,
      job.toSerializableJob(),
      newFlowKeypair
    );

    await program.methods
      .createFlow(accountSize, serializableJob, false)
      .accounts(createFlowCtx.accounts)
      .signers([newFlowKeypair])
      .rpc();

    let flowAccount = await program.account.flow.fetch(newFlowKeypair.publicKey);

    const action = (flowAccount.actions as any)[0];
    assert.strictEqual((flowAccount.actions as any).length, 1);
    assert.ok(action.program.equals(program.programId));
    assert.deepEqual(action.accounts, [
      { pubkey: ctx.accounts.safe, isSigner: false, isWritable: true },
      { pubkey: safeSignerAddress, isSigner: true, isWritable: false },
    ]);
    assert.deepEqual(action.instruction, SerializableAction.fromInstruction(ixs[0]).instruction);

    const executeData = SafeInstructionService.executeMultisigFlowIxBase(
      newFlowKeypair.publicKey,
      ctx.accounts.safe,
      safeSignerAddress,
      anchorProvider.wallet.publicKey,
      flowAccount.actions
    );

    const executeBuilder = await program.methods
      .executeMultisigFlow()
      .accounts(executeData.ctx.accounts)
      .remainingAccounts(executeData.ctx.remainingAccounts);

    // Approve transaction.
    const approveData = safeService.approveProposal(
      anchorProvider.wallet.publicKey,
      ctx.accounts.safe,
      newFlowKeypair.publicKey,
      true
    );
    await approveData.builder.rpc();

    // Try execute flow when not enough approvals
    try {
      await executeBuilder.rpc();
      assert.fail();
    } catch (error) {
      assert.strictEqual(error.error.errorCode.code, 'RequestIsNotApprovedYet');
    }

    // Other owner approves transaction.
    const ownerBapproveData = safeService.approveProposal(
      ownerB.publicKey,
      ctx.accounts.safe,
      newFlowKeypair.publicKey,
      true
    );
    await ownerBapproveData.builder.signers([ownerB]).rpc();

    await executeBuilder.rpc();

    flowAccount = await program.account.flow.fetch(newFlowKeypair.publicKey);
    safeAccount = await program.account.safe.fetch(ctx.accounts.safe);

    assert.strictEqual((flowAccount.approvals as any).length, 2);
    assert.ok(flowAccount.approvals[0].owner.equals(anchorProvider.wallet.publicKey));
    assert.strictEqual(flowAccount.approvals[0].isApproved, true);
    assert.ok(flowAccount.approvals[1].owner.equals(ownerB.publicKey));
    assert.strictEqual(flowAccount.approvals[1].isApproved, true);
    assert.strictEqual(flowAccount.proposalStage, ProposalStateType.Complete);
    assert.strictEqual(flowAccount.ownerSetSeqno, 0);

    assert.strictEqual(safeAccount.signerBump, safe.signerBump);
    assert.strictEqual(safeAccount.approvalsRequired, 2);
    assert.deepEqual(safeAccount.owners, [...owners, ownerD.publicKey]);
    assert.strictEqual(safeAccount.ownerSetSeqno, 1);
  });
});

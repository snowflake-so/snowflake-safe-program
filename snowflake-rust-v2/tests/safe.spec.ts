import { Keypair } from '@solana/web3.js';
import { assert } from 'chai';

import {
  program,
  anchorProvider,
  createSampleSafe,
  createSampleFlow,
  createSampleFlowWithJob,
  createAddOwnerJob,
  safeService,
  ownerB,
  ownerC,
} from './helper';

describe('Safe', () => {
  describe('Create Safe', () => {
    it('Can create a safe', async () => {
      const owners = [anchorProvider.wallet.publicKey, ownerB.publicKey];

      const { safeKeypair } = await createSampleSafe(owners, 1);
      const safeAccount = await program.account.safe.fetch(safeKeypair.publicKey);

      assert.deepEqual(safeAccount.owners, owners);
      assert.strictEqual(safeAccount.approvalsRequired, 1);
      assert.strictEqual(safeAccount.ownerSetSeqno, 0);
    });

    it('Invalid creator', async () => {
      const owners = [ownerB.publicKey, ownerC.publicKey];

      try {
        await createSampleSafe(owners, 1);
        assert.fail();
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, 'CreatorIsNotAssignedToOwnerList');
      }
    });

    it('Unique owners', async () => {
      const owners = [anchorProvider.wallet.publicKey, anchorProvider.wallet.publicKey];

      try {
        await createSampleSafe(owners, 1);
        assert.fail();
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, 'DuplicateOwnerInSafe');
      }
    });

    it('Owners, approvals sizes', async () => {
      try {
        const owners = [];
        await createSampleSafe(owners, 2);
        assert.fail();
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, 'InvalidMinOwnerCount');
      }

      try {
        const owners = [anchorProvider.wallet.publicKey];
        await createSampleSafe(owners, 0);
        assert.fail();
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, 'InvalidMinApprovalsRequired');
      }

      try {
        const owners = [anchorProvider.wallet.publicKey];
        await createSampleSafe(owners, 2);
        assert.fail();
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, 'InvalidMaxApprovalsRequired');
      }
    });
  });

  describe('Add Owners', () => {
    it('Cannot add duplicate owner', async () => {
      const safeData = await createSampleSafe(
        [anchorProvider.wallet.publicKey, ownerB.publicKey],
        1
      );
      const job = await createAddOwnerJob(safeData.ctx.accounts.safe, ownerB.publicKey);
      const flow = await createSampleFlowWithJob(
        Keypair.generate(),
        safeData.ctx.accounts.safe,
        job
      );

      const approveData = safeService.approveProposal(
        anchorProvider.wallet.publicKey,
        safeData.ctx.accounts.safe,
        flow.flowKeypair.publicKey,
        true
      );
      await approveData.builder.rpc();

      try {
        await program.methods
          .executeMultisigFlow()
          .accounts(flow.executeData.ctx.accounts)
          .remainingAccounts(flow.executeData.ctx.remainingAccounts)
          .rpc();
        assert.fail();
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, 'DuplicateOwnerInSafe');
      }
    });

    it('Cannot add owner directly', async () => {
      const safeData = await createSampleSafe(
        [anchorProvider.wallet.publicKey, ownerB.publicKey],
        1
      );

      const [safeSigner] = await safeService.findSafeSignerAddress(safeData.safeKeypair.publicKey);

      try {
        const result = await program.methods
          .addOwner(ownerC.publicKey)
          .accounts({
            safe: safeData.safeKeypair.publicKey,
            safeSigner: safeSigner,
          })
          .rpc();
        assert.fail();
      } catch (error) {
        assert.strictEqual(error.message, 'Signature verification failed');
      }
    });
  });

  describe('Remove Owners', () => {
    it('Can remove owner', async () => {
      const safeData = await createSampleSafe(
        [anchorProvider.wallet.publicKey, ownerB.publicKey],
        1
      );
      const ixs = await safeService.createRemoveOwnerInstruction(
        safeData.ctx.accounts.safe,
        ownerB.publicKey
      );
      const flow = await createSampleFlow(Keypair.generate(), safeData.ctx.accounts.safe, ixs);
      const approveData = safeService.approveProposal(
        anchorProvider.wallet.publicKey,
        safeData.ctx.accounts.safe,
        flow.flowKeypair.publicKey,
        true
      );
      await approveData.builder.rpc();

      let safeAccount = await program.account.safe.fetch(safeData.ctx.accounts.safe);
      assert.strictEqual(safeAccount.owners.length, 2);
      assert.strictEqual(safeAccount.ownerSetSeqno, 0);

      await program.methods
        .executeMultisigFlow()
        .accounts(flow.executeData.ctx.accounts)
        .remainingAccounts(flow.executeData.ctx.remainingAccounts)
        .rpc();

      safeAccount = await program.account.safe.fetch(safeData.ctx.accounts.safe);
      assert.strictEqual(safeAccount.owners.length, 1);
      assert.strictEqual(safeAccount.ownerSetSeqno, 1);
    });

    it('Owners cannot be empty', async () => {
      const safeData = await createSampleSafe([anchorProvider.wallet.publicKey], 1);
      const ixs = await safeService.createRemoveOwnerInstruction(
        safeData.ctx.accounts.safe,
        anchorProvider.wallet.publicKey
      );
      const flow = await createSampleFlow(Keypair.generate(), safeData.ctx.accounts.safe, ixs);
      const approveData = safeService.approveProposal(
        anchorProvider.wallet.publicKey,
        safeData.ctx.accounts.safe,
        flow.flowKeypair.publicKey,
        true
      );
      await approveData.builder.rpc();

      const safeAccount = await program.account.safe.fetch(safeData.ctx.accounts.safe);
      assert.strictEqual(safeAccount.owners.length, 1);
      assert.strictEqual(safeAccount.ownerSetSeqno, 0);
      try {
        await program.methods
          .executeMultisigFlow()
          .accounts(flow.executeData.ctx.accounts)
          .remainingAccounts(flow.executeData.ctx.remainingAccounts)
          .rpc();
        assert.fail();
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, 'InvalidMinOwnerCount');
      }
    });

    it('Cannot remove directly', async () => {
      const safeData = await createSampleSafe(
        [anchorProvider.wallet.publicKey, ownerB.publicKey],
        1
      );

      const [safeSigner] = await safeService.findSafeSignerAddress(safeData.safeKeypair.publicKey);

      try {
        const result = await program.methods
          .removeOwner(ownerB.publicKey)
          .accounts({
            safe: safeData.safeKeypair.publicKey,
            safeSigner: safeSigner,
          })
          .rpc();
        assert.fail();
      } catch (error) {
        assert.strictEqual(error.message, 'Signature verification failed');
      }
    });
  });

  describe('Change threshold', () => {
    it('Can change threshold', async () => {
      const safeData = await createSampleSafe(
        [anchorProvider.wallet.publicKey, ownerB.publicKey],
        1
      );
      const ixs = await safeService.createChangeThresholdInstruction(safeData.ctx.accounts.safe, 2);
      const flow = await createSampleFlow(Keypair.generate(), safeData.ctx.accounts.safe, ixs);
      const approveData = safeService.approveProposal(
        anchorProvider.wallet.publicKey,
        safeData.ctx.accounts.safe,
        flow.flowKeypair.publicKey,
        true
      );
      await approveData.builder.rpc();

      let safeAccount = await program.account.safe.fetch(safeData.ctx.accounts.safe);
      assert.strictEqual(safeAccount.approvalsRequired, 1);
      assert.strictEqual(safeAccount.ownerSetSeqno, 0);

      await program.methods
        .executeMultisigFlow()
        .accounts(flow.executeData.ctx.accounts)
        .remainingAccounts(flow.executeData.ctx.remainingAccounts)
        .rpc();

      safeAccount = await program.account.safe.fetch(safeData.ctx.accounts.safe);
      assert.strictEqual(safeAccount.approvalsRequired, 2);
      assert.strictEqual(safeAccount.ownerSetSeqno, 1);
    });

    it('Threshold cannot be zero', async () => {
      const safeData = await createSampleSafe(
        [anchorProvider.wallet.publicKey, ownerB.publicKey],
        1
      );
      const ixs = await safeService.createChangeThresholdInstruction(safeData.ctx.accounts.safe, 0);
      const flow = await createSampleFlow(Keypair.generate(), safeData.ctx.accounts.safe, ixs);
      const approveData = safeService.approveProposal(
        anchorProvider.wallet.publicKey,
        safeData.ctx.accounts.safe,
        flow.flowKeypair.publicKey,
        true
      );
      await approveData.builder.rpc();

      try {
        await program.methods
          .executeMultisigFlow()
          .accounts(flow.executeData.ctx.accounts)
          .remainingAccounts(flow.executeData.ctx.remainingAccounts)
          .rpc();
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, 'InvalidMinApprovalsRequired');
      }
    });

    it('Threshold cannot be greater than owners size', async () => {
      const owners = [anchorProvider.wallet.publicKey, ownerB.publicKey];
      const safeData = await createSampleSafe(owners, 1);
      const ixs = await safeService.createChangeThresholdInstruction(
        safeData.ctx.accounts.safe,
        owners.length + 1
      );
      const flow = await createSampleFlow(Keypair.generate(), safeData.ctx.accounts.safe, ixs);
      const approveData = safeService.approveProposal(
        anchorProvider.wallet.publicKey,
        safeData.ctx.accounts.safe,
        flow.flowKeypair.publicKey,
        true
      );
      await approveData.builder.rpc();

      try {
        await program.methods
          .executeMultisigFlow()
          .accounts(flow.executeData.ctx.accounts)
          .remainingAccounts(flow.executeData.ctx.remainingAccounts)
          .rpc();
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, 'InvalidMaxApprovalsRequired');
      }
    });
  });
});

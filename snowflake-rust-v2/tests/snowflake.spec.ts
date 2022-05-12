import * as anchor from '@project-serum/anchor';
import { Program, BN } from '@project-serum/anchor';
import {
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  SYSVAR_CLOCK_PUBKEY,
} from '@solana/web3.js';
import { assert } from 'chai';
import {
  Job,
  JobBuilder,
  SerializableAction,
  SerializableJob,
} from '@snowflake-so/snowflake-sdk';
import { Snowflake } from '../target/types/snowflake';

import SafeService from './services/safeService';
import SafeInstructionService, {
  ClientSafeParams,
} from './services/safeInstructionService';
import { ProposalStateType, TriggerType } from './models/flow';

// Configure the client to use the local cluster.
const anchorProvider = anchor.AnchorProvider.env();
anchor.setProvider(anchorProvider);
const program = anchor.workspace.Snowflake as Program<Snowflake>;
const safeService = new SafeService(program);
const ownerB = anchor.web3.Keypair.generate();
const ownerC = anchor.web3.Keypair.generate();
const ownerD = anchor.web3.Keypair.generate();

const delay = (milliSeconds: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, milliSeconds);
  });
};

const createSampleSafe = async (
  owners: anchor.web3.PublicKey[],
  threshold: number
) => {
  const safeData = await safeService.createSafe(
    anchorProvider.wallet.publicKey,
    owners,
    threshold
  );

  await program.methods
    .createSafe(safeData.safe)
    .accounts(safeData.ctx.accounts)
    .signers([safeData.safeKeypair])
    .rpc();

  return safeData;
};

const createSampleFlow = async (
  keypair: anchor.web3.Keypair,
  safeAddress: anchor.web3.PublicKey,
  ixs: anchor.web3.TransactionInstruction[]
) => {
  const job = new JobBuilder()
    .jobName('Add new owner')
    .jobInstructions(ixs)
    .build();
  return createSampleFlowWithJob(keypair, safeAddress, job);
};

const createAddOwnerJob = async (
  safe: anchor.web3.PublicKey,
  owner: anchor.web3.PublicKey
) => {
  const ixs = await safeService.createAddOwnerInstruction(safe, owner);
  return new JobBuilder().jobName('Add new owner').jobInstructions(ixs).build();
};

const createSampleFlowWithJob = async (
  keypair: anchor.web3.Keypair,
  safeAddress: anchor.web3.PublicKey,
  job: Job,
  expiryDate?: BN
) => {
  const [safeSignerAddress] = await safeService.findSafeSignerAddress(
    safeAddress
  );

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
    .createFlow(flowData.accountSize, flowData.serializableJob)
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

const getClusterUnixTimestamp = async () => {
  const accountInfo = await anchorProvider.connection.getParsedAccountInfo(
    SYSVAR_CLOCK_PUBKEY
  );
  return (accountInfo.value.data as any).parsed.info.unixTimestamp;
};

describe('Snowflake', () => {
  it('Test Safe Program - Happy Path', async () => {
    const owners = [
      anchorProvider.wallet.publicKey,
      ownerB.publicKey,
      ownerC.publicKey,
    ];
    const { safe, ctx } = await createSampleSafe(owners, 2);
    let safeAccount = await program.account.safe.fetch(ctx.accounts.safe);

    assert.strictEqual(safeAccount.signerNonce, safe.signerNonce);
    assert.strictEqual(safeAccount.approvalsRequired, 2);
    assert.deepEqual(safeAccount.owners, owners);
    assert.strictEqual(safeAccount.ownerSetSeqno, 0);

    // Create add owner instruction
    const ixs = await safeService.createAddOwnerInstruction(
      ctx.accounts.safe,
      ownerD.publicKey
    );
    const [safeSignerAddress] = await safeService.findSafeSignerAddress(
      ctx.accounts.safe
    );
    const job = new JobBuilder()
      .jobName('Add new owner')
      .jobInstructions(ixs)
      .build();
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
      .createFlow(accountSize, serializableJob)
      .accounts(createFlowCtx.accounts)
      .signers([newFlowKeypair])
      .rpc();

    let flowAccount = await program.account.flow.fetch(
      newFlowKeypair.publicKey
    );

    const action = (flowAccount.actions as any)[0];
    assert.strictEqual((flowAccount.actions as any).length, 1);
    assert.ok(action.program.equals(program.programId));
    assert.deepEqual(action.accounts, [
      { pubkey: ctx.accounts.safe, isSigner: false, isWritable: true },
      { pubkey: safeSignerAddress, isSigner: true, isWritable: false },
    ]);
    assert.deepEqual(
      action.instruction,
      SerializableAction.fromInstruction(ixs[0]).instruction
    );

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
    await program.methods
      .approveProposal(approveData.isApproved)
      .accounts(approveData.ctx.accounts)
      .rpc();

    // Try execute flow when not enough approvals
    try {
      await executeBuilder.rpc();
      assert.fail();
    } catch (error) {
      assert.strictEqual(error.error.errorCode.code, 'FlowNotEnoughApprovals');
    }

    // Other owner approves transaction.
    const ownerBapproveData = safeService.approveProposal(
      ownerB.publicKey,
      ctx.accounts.safe,
      newFlowKeypair.publicKey,
      true
    );
    await program.methods
      .approveProposal(ownerBapproveData.isApproved)
      .accounts(ownerBapproveData.ctx.accounts)
      .signers([ownerB])
      .rpc();

    await executeBuilder.rpc();

    flowAccount = await program.account.flow.fetch(newFlowKeypair.publicKey);
    safeAccount = await program.account.safe.fetch(ctx.accounts.safe);

    assert.strictEqual((flowAccount.approvals as any).length, 2);
    assert.ok(
      flowAccount.approvals[0].owner.equals(anchorProvider.wallet.publicKey)
    );
    assert.strictEqual(flowAccount.approvals[0].isApproved, true);
    assert.ok(flowAccount.approvals[1].owner.equals(ownerB.publicKey));
    assert.strictEqual(flowAccount.approvals[1].isApproved, true);
    assert.strictEqual(flowAccount.proposalStage, ProposalStateType.Complete);
    assert.strictEqual(flowAccount.ownerSetSeqno, 0);

    assert.strictEqual(safeAccount.signerNonce, safe.signerNonce);
    assert.strictEqual(safeAccount.approvalsRequired, 2);
    assert.deepEqual(safeAccount.owners, [...owners, ownerD.publicKey]);
    assert.strictEqual(safeAccount.ownerSetSeqno, 1);
  });
});

describe('Safe', () => {
  describe('Create Safe', () => {
    it('Can create a safe', async () => {
      const owners = [anchorProvider.wallet.publicKey, ownerB.publicKey];

      const { safeKeypair } = await createSampleSafe(owners, 1);
      const safeAccount = await program.account.safe.fetch(
        safeKeypair.publicKey
      );

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
        assert.strictEqual(
          error.error.errorCode.code,
          'CreatorIsNotAssignedToOwnerList'
        );
      }
    });

    it('Unique owners', async () => {
      const owners = [
        anchorProvider.wallet.publicKey,
        anchorProvider.wallet.publicKey,
      ];

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
        assert.strictEqual(
          error.error.errorCode.code,
          'InvalidMinApprovalsRequired'
        );
      }

      try {
        const owners = [anchorProvider.wallet.publicKey];
        await createSampleSafe(owners, 2);
        assert.fail();
      } catch (error) {
        assert.strictEqual(
          error.error.errorCode.code,
          'InvalidMaxApprovalsRequired'
        );
      }
    });
  });

  describe('Add Owners', () => {
    it('Cannot add duplicate owner', async () => {
      const safeData = await createSampleSafe(
        [anchorProvider.wallet.publicKey, ownerB.publicKey],
        1
      );
      const job = await createAddOwnerJob(
        safeData.ctx.accounts.safe,
        ownerB.publicKey
      );
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
      await program.methods
        .approveProposal(approveData.isApproved)
        .accounts(approveData.ctx.accounts)
        .rpc();

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

    it('TODO: Only existing owners can create a valid add request', async () => {
      // const job = await createAddOwnerJob(
      //   safeData.ctx.accounts.safe,
      //   ownerC.publicKey
      // );
      // const flow = await createSampleFlowWithJob(
      //   Keypair.generate(),
      //   safeData.ctx.accounts.safe,
      //   job
      // );
      // const approveData = safeService.approveProposal(
      //   anchorProvider.wallet.publicKey,
      //   safeData.ctx.accounts.safe,
      //   flow.flowKeypair.publicKey,
      //   true
      // );
      // const approveAccounts = {
      //   ...approveData.ctx.accounts,
      //   caller: ownerC.publicKey,
      // };
      // await program.methods
      //   .approveProposal(approveData.isApproved)
      //   .accounts(approveAccounts)
      //   .signers([ownerC])
      //   .rpc();
      // try {
      //   await program.methods
      //     .executeMultisigFlow()
      //     .accounts(flow.executeData.ctx.accounts)
      //     .remainingAccounts(flow.executeData.ctx.remainingAccounts)
      //     .rpc();
      //   assert.fail();
      // } catch (error) {
      //   assert.strictEqual(error.error.errorCode.code, 'DuplicateOwnerInSafe');
      // }
    });

    it('TODO: Cannot add directly');
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
      const flow = await createSampleFlow(
        Keypair.generate(),
        safeData.ctx.accounts.safe,
        ixs
      );
      const approveData = safeService.approveProposal(
        anchorProvider.wallet.publicKey,
        safeData.ctx.accounts.safe,
        flow.flowKeypair.publicKey,
        true
      );
      await program.methods
        .approveProposal(approveData.isApproved)
        .accounts(approveData.ctx.accounts)
        .rpc();

      let safeAccount = await program.account.safe.fetch(
        safeData.ctx.accounts.safe
      );
      assert.strictEqual(safeAccount.owners.length, 2);
      assert.strictEqual(safeAccount.ownerSetSeqno, 0);

      await program.methods
        .executeMultisigFlow()
        .accounts(flow.executeData.ctx.accounts)
        .remainingAccounts(flow.executeData.ctx.remainingAccounts)
        .rpc();

      safeAccount = await program.account.safe.fetch(
        safeData.ctx.accounts.safe
      );
      assert.strictEqual(safeAccount.owners.length, 1);
      assert.strictEqual(safeAccount.ownerSetSeqno, 1);
    });

    it('Owners cannot be empty', async () => {
      const safeData = await createSampleSafe(
        [anchorProvider.wallet.publicKey],
        1
      );
      const ixs = await safeService.createRemoveOwnerInstruction(
        safeData.ctx.accounts.safe,
        anchorProvider.wallet.publicKey
      );
      const flow = await createSampleFlow(
        Keypair.generate(),
        safeData.ctx.accounts.safe,
        ixs
      );
      const approveData = safeService.approveProposal(
        anchorProvider.wallet.publicKey,
        safeData.ctx.accounts.safe,
        flow.flowKeypair.publicKey,
        true
      );
      await program.methods
        .approveProposal(approveData.isApproved)
        .accounts(approveData.ctx.accounts)
        .rpc();

      let safeAccount = await program.account.safe.fetch(
        safeData.ctx.accounts.safe
      );
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

    it('TODO: Cannot remove directly');
  });

  describe('Change threshold', () => {
    it('Can change threshold', async () => {
      const safeData = await createSampleSafe(
        [anchorProvider.wallet.publicKey, ownerB.publicKey],
        1
      );
      const ixs = await safeService.createChangeThresholdInstruction(
        safeData.ctx.accounts.safe,
        2
      );
      const flow = await createSampleFlow(
        Keypair.generate(),
        safeData.ctx.accounts.safe,
        ixs
      );
      const approveData = safeService.approveProposal(
        anchorProvider.wallet.publicKey,
        safeData.ctx.accounts.safe,
        flow.flowKeypair.publicKey,
        true
      );
      await program.methods
        .approveProposal(approveData.isApproved)
        .accounts(approveData.ctx.accounts)
        .rpc();

      let safeAccount = await program.account.safe.fetch(
        safeData.ctx.accounts.safe
      );
      assert.strictEqual(safeAccount.approvalsRequired, 1);
      assert.strictEqual(safeAccount.ownerSetSeqno, 0);

      await program.methods
        .executeMultisigFlow()
        .accounts(flow.executeData.ctx.accounts)
        .remainingAccounts(flow.executeData.ctx.remainingAccounts)
        .rpc();

      safeAccount = await program.account.safe.fetch(
        safeData.ctx.accounts.safe
      );
      assert.strictEqual(safeAccount.approvalsRequired, 2);
      assert.strictEqual(safeAccount.ownerSetSeqno, 1);
    });

    it('Threshold cannot be zero', async () => {
      const safeData = await createSampleSafe(
        [anchorProvider.wallet.publicKey, ownerB.publicKey],
        1
      );
      const ixs = await safeService.createChangeThresholdInstruction(
        safeData.ctx.accounts.safe,
        0
      );
      const flow = await createSampleFlow(
        Keypair.generate(),
        safeData.ctx.accounts.safe,
        ixs
      );
      const approveData = safeService.approveProposal(
        anchorProvider.wallet.publicKey,
        safeData.ctx.accounts.safe,
        flow.flowKeypair.publicKey,
        true
      );
      await program.methods
        .approveProposal(approveData.isApproved)
        .accounts(approveData.ctx.accounts)
        .rpc();

      try {
        await program.methods
          .executeMultisigFlow()
          .accounts(flow.executeData.ctx.accounts)
          .remainingAccounts(flow.executeData.ctx.remainingAccounts)
          .rpc();
      } catch (error) {
        assert.strictEqual(
          error.error.errorCode.code,
          'InvalidMinApprovalsRequired'
        );
      }
    });

    it('Threshold cannot be greater than owners size', async () => {
      const owners = [anchorProvider.wallet.publicKey, ownerB.publicKey];
      const safeData = await createSampleSafe(owners, 1);
      const ixs = await safeService.createChangeThresholdInstruction(
        safeData.ctx.accounts.safe,
        owners.length + 1
      );
      const flow = await createSampleFlow(
        Keypair.generate(),
        safeData.ctx.accounts.safe,
        ixs
      );
      const approveData = safeService.approveProposal(
        anchorProvider.wallet.publicKey,
        safeData.ctx.accounts.safe,
        flow.flowKeypair.publicKey,
        true
      );
      await program.methods
        .approveProposal(approveData.isApproved)
        .accounts(approveData.ctx.accounts)
        .rpc();

      try {
        await program.methods
          .executeMultisigFlow()
          .accounts(flow.executeData.ctx.accounts)
          .remainingAccounts(flow.executeData.ctx.remainingAccounts)
          .rpc();
      } catch (error) {
        assert.strictEqual(
          error.error.errorCode.code,
          'InvalidMaxApprovalsRequired'
        );
      }
    });
  });
});

describe('Flow', () => {
  const owners = [anchorProvider.wallet.publicKey, ownerB.publicKey];
  let safeData: {
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

  before(async () => {
    safeData = await createSampleSafe(owners, 1);
  });

  describe('Approve Flow', () => {
    it('Can reject a flow', async () => {
      const sampleFlowData = await createSampleFlow(
        Keypair.generate(),
        safeData.ctx.accounts.safe,
        []
      );

      let approveData = safeService.approveProposal(
        anchorProvider.wallet.publicKey,
        safeData.ctx.accounts.safe,
        sampleFlowData.flowKeypair.publicKey,
        false
      );
      await program.methods
        .approveProposal(approveData.isApproved)
        .accounts(approveData.ctx.accounts)
        .rpc();

      const flowAccount = await program.account.flow.fetch(
        sampleFlowData.flowKeypair.publicKey
      );

      assert.strictEqual((flowAccount.approvals as any).length, 1);
      assert.ok(
        flowAccount.approvals[0].owner.equals(anchorProvider.wallet.publicKey)
      );
      assert.strictEqual(flowAccount.approvals[0].isApproved, false);
    });

    it('Caller must be an owner', async () => {
      const sampleFlow = await createSampleFlow(
        Keypair.generate(),
        safeData.ctx.accounts.safe,
        []
      );

      let approveData = safeService.approveProposal(
        ownerC.publicKey,
        safeData.ctx.accounts.safe,
        sampleFlow.flowKeypair.publicKey,
        true
      );

      try {
        await program.methods
          .approveProposal(approveData.isApproved)
          .accounts(approveData.ctx.accounts)
          .signers([ownerC])
          .rpc();
        assert.fail();
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, 'InvalidOwner');
      }
    });

    it('Caller has not approved the flow prior to the operation', async () => {
      const sampleFlow = await createSampleFlow(
        Keypair.generate(),
        safeData.ctx.accounts.safe,
        []
      );

      const approveData = safeService.approveProposal(
        anchorProvider.wallet.publicKey,
        safeData.ctx.accounts.safe,
        sampleFlow.flowKeypair.publicKey,
        true
      );

      await program.methods
        .approveProposal(approveData.isApproved)
        .accounts(approveData.ctx.accounts)
        .rpc();

      try {
        await program.methods
          .approveProposal(approveData.isApproved)
          .accounts(approveData.ctx.accounts)
          .rpc();
        assert.fail();
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, 'AddressSignedAlready');
      }
    });

    it('Flow has not expired', async () => {
      const job = await createAddOwnerJob(
        safeData.ctx.accounts.safe,
        ownerB.publicKey
      );

      const now = await getClusterUnixTimestamp();
      const delaySeconds = 3;
      const sampleFlow = await createSampleFlowWithJob(
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
        await program.methods
          .approveProposal(approveData.isApproved)
          .accounts(approveData.ctx.accounts)
          .rpc();
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
      await program.methods
        .approveProposal(approveData.isApproved)
        .accounts(approveData.ctx.accounts)
        .rpc();
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
        await program.methods
          .approveProposal(approveData.isApproved)
          .accounts(approveData.ctx.accounts)
          .rpc();
        assert.fail();
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, 'ConstraintRaw');
      }
    });
  });

  describe('Abort Flow', () => {
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

      let flowAccount = await program.account.flow.fetch(
        sendSolFlow.flowKeypair.publicKey
      );

      assert.strictEqual(flowAccount.triggerType, TriggerType.Time);
      assert.strictEqual(flowAccount.proposalStage, ProposalStateType.Pending);

      try {
        await program.methods
          .abortFlow()
          .accounts(abortData.ctx.accounts)
          .rpc();
        assert.fail();
      } catch (error) {
        assert.strictEqual(
          error.error.errorCode.code,
          'RequestIsNotExecutedYet'
        );
      }

      const approveData = safeService.approveProposal(
        anchorProvider.wallet.publicKey,
        safeData.ctx.accounts.safe,
        sendSolFlow.flowKeypair.publicKey,
        true
      );
      await program.methods
        .approveProposal(approveData.isApproved)
        .accounts(approveData.ctx.accounts)
        .rpc();
      flowAccount = await program.account.flow.fetch(
        sendSolFlow.flowKeypair.publicKey
      );
      assert.strictEqual(flowAccount.proposalStage, ProposalStateType.Approved);

      await program.methods
        .executeMultisigFlow()
        .accounts(sendSolFlow.executeData.ctx.accounts)
        .remainingAccounts(sendSolFlow.executeData.ctx.remainingAccounts)
        .rpc();
      flowAccount = await program.account.flow.fetch(
        sendSolFlow.flowKeypair.publicKey
      );
      assert.strictEqual(
        flowAccount.proposalStage,
        ProposalStateType.ExecutionInProgress
      );

      await program.methods.abortFlow().accounts(abortData.ctx.accounts).rpc();
      flowAccount = await program.account.flow.fetch(
        sendSolFlow.flowKeypair.publicKey
      );
      assert.strictEqual(flowAccount.proposalStage, ProposalStateType.Aborted);
    });

    it('TODO: Only owners can execute');
  });

  describe('Delete Flow', () => {
    it('Can delete a flow', async () => {
      const sampleFlow = await createSampleFlow(
        Keypair.generate(),
        safeData.ctx.accounts.safe,
        []
      );

      try {
        const deleteData = SafeInstructionService.deleteFlowIxBase(
          anchorProvider.wallet.publicKey,
          sampleFlow.flowKeypair.publicKey
        );

        await program.methods
          .deleteFlow()
          .accounts(deleteData.ctx.accounts)
          .rpc();
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
        const sampleFlow = await createSampleFlow(
          Keypair.generate(),
          safeData.ctx.accounts.safe,
          []
        );

        const deleteData = SafeInstructionService.deleteFlowIxBase(
          ownerB.publicKey,
          sampleFlow.flowKeypair.publicKey
        );

        await program.methods
          .deleteFlow()
          .accounts(deleteData.ctx.accounts)
          .signers([ownerB])
          .rpc();
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

      const sampleFlow = await createSampleFlow(
        Keypair.generate(),
        safeData.ctx.accounts.safe,
        ixs
      );

      const approveData = safeService.approveProposal(
        anchorProvider.wallet.publicKey,
        safeData.ctx.accounts.safe,
        sampleFlow.flowKeypair.publicKey,
        true
      );

      await program.methods
        .approveProposal(approveData.isApproved)
        .accounts(approveData.ctx.accounts)
        .rpc();

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

        await program.methods
          .deleteFlow()
          .accounts(deleteData.ctx.accounts)
          .rpc();
        assert.fail();
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, 'ConstraintRaw');
      }

      // TODO in_execution state
    });
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
        assert.strictEqual(
          error.error.errorCode.code,
          'FlowNotEnoughApprovals'
        );
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
      await program.methods
        .approveProposal(approveData.isApproved)
        .accounts(approveData.ctx.accounts)
        .rpc();

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
      const addOwnerFlow = await createSampleFlowWithJob(
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
      await program.methods
        .approveProposal(approveData.isApproved)
        .accounts(approveData.ctx.accounts)
        .rpc();

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
    it('TODO: pass time check for real execution');

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

      let flowAccount = await program.account.flow.fetch(
        sendSolFlow.flowKeypair.publicKey
      );

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
        assert.strictEqual(
          error.error.errorCode.code,
          'RequestIsNotExecutedYet'
        );
      }

      const approveData = safeService.approveProposal(
        anchorProvider.wallet.publicKey,
        safeData.ctx.accounts.safe,
        sendSolFlow.flowKeypair.publicKey,
        true
      );
      await program.methods
        .approveProposal(approveData.isApproved)
        .accounts(approveData.ctx.accounts)
        .rpc();
      flowAccount = await program.account.flow.fetch(
        sendSolFlow.flowKeypair.publicKey
      );
      assert.strictEqual(flowAccount.proposalStage, ProposalStateType.Approved);

      await program.methods
        .executeMultisigFlow()
        .accounts(sendSolFlow.executeData.ctx.accounts)
        .remainingAccounts(sendSolFlow.executeData.ctx.remainingAccounts)
        .rpc();
      flowAccount = await program.account.flow.fetch(
        sendSolFlow.flowKeypair.publicKey
      );
      assert.strictEqual(
        flowAccount.proposalStage,
        ProposalStateType.ExecutionInProgress
      );

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
        assert.strictEqual(
          error.error.errorCode.code,
          'JobIsNotDueForExecution'
        );
      }
    });
  });

  describe('Mark Timed Flow As Error', () => {
    it('TODO: pass time check for real execution');

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

      let flowAccount = await program.account.flow.fetch(
        sendSolFlow.flowKeypair.publicKey
      );

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
        assert.strictEqual(
          error.error.errorCode.code,
          'RequestIsNotExecutedYet'
        );
      }

      const approveData = safeService.approveProposal(
        anchorProvider.wallet.publicKey,
        safeData.ctx.accounts.safe,
        sendSolFlow.flowKeypair.publicKey,
        true
      );
      await program.methods
        .approveProposal(approveData.isApproved)
        .accounts(approveData.ctx.accounts)
        .rpc();
      flowAccount = await program.account.flow.fetch(
        sendSolFlow.flowKeypair.publicKey
      );
      assert.strictEqual(flowAccount.proposalStage, ProposalStateType.Approved);

      await program.methods
        .executeMultisigFlow()
        .accounts(sendSolFlow.executeData.ctx.accounts)
        .remainingAccounts(sendSolFlow.executeData.ctx.remainingAccounts)
        .rpc();
      flowAccount = await program.account.flow.fetch(
        sendSolFlow.flowKeypair.publicKey
      );
      assert.strictEqual(
        flowAccount.proposalStage,
        ProposalStateType.ExecutionInProgress
      );

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
        assert.strictEqual(
          error.error.errorCode.code,
          'CannotMarkJobAsErrorIfItsWithinSchedule'
        );
      }
    });
  });
});

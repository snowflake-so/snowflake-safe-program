const anchor = require('@project-serum/anchor');

describe('snowflake', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  it('Is initialized!', async () => {
    const program = anchor.workspace.Snowflake;


    // Add your test here.
    const tx = await program.rpc.hello();
    console.log("Your transaction signature", tx);
  });
});


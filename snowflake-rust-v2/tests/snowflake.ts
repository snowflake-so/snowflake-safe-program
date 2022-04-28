import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
// import { AnchorNew } from "../target/types/anchor_new";

describe("snowflake", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Snowflake as Program<any>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});


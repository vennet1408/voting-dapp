const anchor = require("@coral-xyz/anchor");
const { PublicKey, SystemProgram } = require("@solana/web3.js");
const { expect } = require("chai");

describe("voting_dapp", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const program = anchor.workspace.VotingDapp;

  const MAX_QUESTION_BYTES = 128;

  const derivePollPda = async (authority, pollIdBn) => {
    const pollIdBuf = Buffer.alloc(8);
    pollIdBuf.writeBigUInt64LE(BigInt(pollIdBn.toString()));
    const [pda] = await PublicKey.findProgramAddressSync(
      [Buffer.from("poll"), authority.toBuffer(), pollIdBuf],
      program.programId
    );
    return pda;
  };

  const deriveVoterRecordPda = async (poll, voter) => {
    const [pda] = await PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), poll.toBuffer(), voter.toBuffer()],
      program.programId
    );
    return pda;
  };

  it("happy path: create, vote, close", async () => {
    const authority = provider.wallet.publicKey;
    const pollId = new anchor.BN(1);
    const question = "Favorite language?";
    const optionsCount = 3;

    const pollPda = await derivePollPda(authority, pollId);

    await program.methods
      .createPoll(pollId, question, optionsCount)
      .accounts({
        authority,
        poll: pollPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const poll = await program.account.poll.fetch(pollPda);
    expect(poll.authority.toBase58()).to.eq(authority.toBase58());
    expect(poll.pollId.toNumber()).to.eq(pollId.toNumber());
    expect(poll.isOpen).to.eq(true);
    expect(poll.optionsCount).to.eq(optionsCount);
    expect(poll.question).to.eq(question);

    const voter = provider.wallet.publicKey;
    const voterRecordPda = await deriveVoterRecordPda(pollPda, voter);

    await program.methods
      .vote(1)
      .accounts({
        voter,
        poll: pollPda,
        authority,
        voterRecord: voterRecordPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const pollAfterVote = await program.account.poll.fetch(pollPda);
    expect(pollAfterVote.counts[1]).to.eq(1);

    await program.methods
      .closePoll()
      .accounts({
        authority,
        poll: pollPda,
      })
      .rpc();

    const pollClosed = await program.account.poll.fetch(pollPda);
    expect(pollClosed.isOpen).to.eq(false);
  });

  it("unhappy: invalid option index", async () => {
    const authority = provider.wallet.publicKey;
    const pollId = new anchor.BN(2);
    const question = "Pick one of two";
    const optionsCount = 2;
    const pollPda = await derivePollPda(authority, pollId);

    await program.methods
      .createPoll(pollId, question, optionsCount)
      .accounts({ authority, poll: pollPda, systemProgram: SystemProgram.programId })
      .rpc();

    const voter = provider.wallet.publicKey;
    const voterRecordPda = await deriveVoterRecordPda(pollPda, voter);

    let threw = false;
    try {
      await program.methods
        .vote(5) // out of range
        .accounts({
          voter,
          poll: pollPda,
          authority,
          voterRecord: voterRecordPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    } catch (e) {
      threw = true;
    }
    expect(threw).to.eq(true);
  });

  it("unhappy: vote after close", async () => {
    const authority = provider.wallet.publicKey;
    const pollId = new anchor.BN(3);
    const question = "Close then vote";
    const optionsCount = 2;
    const pollPda = await derivePollPda(authority, pollId);
    await program.methods
      .createPoll(pollId, question, optionsCount)
      .accounts({ authority, poll: pollPda, systemProgram: SystemProgram.programId })
      .rpc();

    await program.methods
      .closePoll()
      .accounts({ authority, poll: pollPda })
      .rpc();

    const voter = provider.wallet.publicKey;
    const voterRecordPda = await deriveVoterRecordPda(pollPda, voter);

    let threw = false;
    try {
      await program.methods
        .vote(0)
        .accounts({
          voter,
          poll: pollPda,
          authority,
          voterRecord: voterRecordPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    } catch (e) {
      threw = true;
    }
    expect(threw).to.eq(true);
  });

  it("unhappy: question too long", async () => {
    const authority = provider.wallet.publicKey;
    const pollId = new anchor.BN(4);
    const question = "q".repeat(MAX_QUESTION_BYTES + 1);
    const optionsCount = 2;
    const pollPda = await derivePollPda(authority, pollId);
    let threw = false;
    try {
      await program.methods
        .createPoll(pollId, question, optionsCount)
        .accounts({ authority, poll: pollPda, systemProgram: SystemProgram.programId })
        .rpc();
    } catch (e) {
      threw = true;
    }
    expect(threw).to.eq(true);
  });
});

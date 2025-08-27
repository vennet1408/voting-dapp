"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useState, useEffect } from "react";
import { AnchorProvider, BN, Idl, Program } from "@coral-xyz/anchor";
import idl from "./idl/voting_dapp.json";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { Buffer } from "buffer";

if (typeof window !== "undefined" && !(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}

const WalletMultiButton = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const PROGRAM_ID = new PublicKey((idl as any).address);

// Discriminators from IDL
const DISC = {
  create_poll: Uint8Array.from([182, 171, 112, 238, 6, 219, 14, 110]),
  vote: Uint8Array.from([227, 110, 155, 23, 136, 126, 172, 25]),
  close_poll: Uint8Array.from([139, 213, 162, 65, 172, 150, 123, 67]),
};

function u64Le(n: number | bigint) {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(n));
  return b;
}

function u8(n: number) {
  return Buffer.from([n & 0xff]);
}

function str(s: string) {
  const enc = new TextEncoder();
  const bytes = enc.encode(s);
  const len = Buffer.alloc(4);
  len.writeUInt32LE(bytes.length);
  return Buffer.concat([len, Buffer.from(bytes)]);
}

function boolByte(b: boolean) {
  return Buffer.from([b ? 1 : 0]);
}

function patchIdl(idlObj: any): any {
  try {
    const clone = JSON.parse(JSON.stringify(idlObj));
    if (Array.isArray(clone.accounts) && Array.isArray(clone.types)) {
      const nameToType: Record<string, any> = {};
      for (const t of clone.types) {
        if (t?.name && t?.type) nameToType[t.name] = t.type;
      }
      for (const acc of clone.accounts) {
        if (acc && acc.name && !acc.type && nameToType[acc.name]) {
          acc.type = nameToType[acc.name];
        }
      }
    }
    return clone;
  } catch (_e) {
    return idlObj;
  }
}

const patchedIdl: any = patchIdl(idl as any);

export default function Home() {
  return (
    <div className="min-h-screen grid grid-rows-[auto_1fr_auto] bg-background text-foreground">
      <header className="px-6 sm:px-10 py-6 border-b border-black/5 dark:border-white/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="text-lg font-semibold tracking-tight">
            Voting dApp
          </div>
          <nav className="hidden sm:flex gap-6 text-sm text-foreground/80">
            <Link
              href="#features"
              className="hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="#how"
              className="hover:text-foreground transition-colors"
            >
              How it works
            </Link>
            <Link
              href="#cta"
              className="hover:text-foreground transition-colors"
            >
              Launch
            </Link>
          </nav>
        </div>
      </header>

      <main className="px-6 sm:px-10 py-16 sm:py-24">
        <div className="max-w-6xl mx-auto">
          <section className="flex flex-col items-center text-center gap-6">
            <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight">
              Create polls. Vote on-chain. Simple.
            </h1>
            <p className="text-base sm:text-lg text-foreground/70 max-w-2xl">
              A minimal, elegant voting experience powered by Solana and Anchor.
              Create a poll with multiple options and let wallets vote—fast and
              verifiable.
            </p>
            <div id="cta" className="flex gap-3">
              <Link
                href="#launch"
                className="inline-flex items-center rounded-md bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Launch App
              </Link>
            </div>
          </section>

          <section id="launch" className="mt-16">
            <ClientActions />
          </section>

          <section id="features" className="mt-20 grid sm:grid-cols-3 gap-6">
            <FeatureCard
              title="Create Polls"
              desc="Define a question and up to 10 options. Deployed to Devnet."
            />
            <FeatureCard
              title="One Vote / Wallet"
              desc="PDA-enforced voter records ensure one vote per poll per wallet."
            />
            <FeatureCard
              title="Close & Tally"
              desc="Close polls to freeze results. Counts remain on-chain."
            />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-black/10 dark:border-white/15 p-6 bg-white/50 dark:bg-white/5 backdrop-blur-sm">
      <div className="text-base font-medium mb-1">{title}</div>
      <p className="text-sm text-foreground/70">{desc}</p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="px-6 sm:px-10 py-6 border-t border-black/5 dark:border-white/10">
      <div className="max-w-6xl mx-auto flex items-center justify-between text-sm">
        <div className="text-foreground/70">
          Designed and Developed by Venki
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://x.com/asaivenkatesh1"
            target="_blank"
            rel="noreferrer"
            aria-label="X (Twitter)"
            className="text-foreground/70 hover:text-foreground transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path d="M18.244 3H21l-6.41 7.323L22.5 21h-6.492l-4.04-5.03L6.3 21H3.543l6.845-7.823L1.5 3h6.66l3.65 4.657L18.244 3zm-1.137 16.2h1.77L7.01 4.695H5.15L17.107 19.2z" />
            </svg>
          </a>
          <a
            href="https://github.com/venki1402"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="text-foreground/70 hover:text-foreground transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.012c0 4.424 2.865 8.176 6.839 9.504.5.092.683-.217.683-.482 0-.237-.009-.866-.014-1.7-2.782.604-3.369-1.342-3.369-1.342-.455-1.157-1.11-1.466-1.11-1.466-.907-.62.069-.607.069-.607 1.003.07 1.53 1.03 1.53 1.03.892 1.53 2.341 1.088 2.91.833.092-.647.35-1.088.636-1.338-2.221-.253-4.555-1.112-4.555-4.947 0-1.092.39-1.987 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.269 2.75 1.026A9.563 9.563 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.295 2.748-1.026 2.748-1.026.546 1.378.203 2.397.1 2.65.64.701 1.028 1.596 1.028 2.688 0 3.844-2.337 4.692-4.565 4.94.358.309.677.92.677 1.853 0 1.337-.012 2.415-.012 2.743 0 .268.181.579.688.48A10.013 10.013 0 0 0 22 12.012C22 6.484 17.523 2 12 2Z"
                clipRule="evenodd"
              />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}

function ClientActions() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [creating, setCreating] = useState(false);
  const [voting, setVoting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [question, setQuestion] = useState("");
  const [optionsCount, setOptionsCount] = useState(2);
  const [pollId, setPollId] = useState<number>(
    Math.floor(Math.random() * 1_000_000)
  );
  const [optionIndex, setOptionIndex] = useState(0);
  const [status, setStatus] = useState<string>("");
  const [pollView, setPollView] = useState<null | {
    question: string;
    isOpen: boolean;
    optionsCount: number;
    counts: number[];
  }>(null);

  const derivePollPda = useCallback(
    async (authority: PublicKey, pollIdNum: number) => {
      const le = Buffer.alloc(8);
      le.writeBigUInt64LE(BigInt(pollIdNum));
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("poll"), authority.toBuffer(), le],
        PROGRAM_ID
      );
      return pda;
    },
    []
  );

  const deriveVoterRecordPda = useCallback(
    (poll: PublicKey, voter: PublicKey) => {
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vote"), poll.toBuffer(), voter.toBuffer()],
        PROGRAM_ID
      );
      return pda;
    },
    []
  );

  const onCreate = useCallback(async () => {
    if (!wallet.publicKey) return;
    setCreating(true);
    setStatus("");
    try {
      const pollPda = await derivePollPda(wallet.publicKey, pollId);
      const data = Buffer.concat([
        Buffer.from(DISC.create_poll),
        u64Le(pollId),
        str(question),
        u8(optionsCount),
      ]);
      const keys = [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: pollPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ];
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys,
        data,
      });
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      const tx = new Transaction({
        feePayer: wallet.publicKey,
        recentBlockhash: blockhash,
      }).add(ix);
      const signed = wallet.signTransaction
        ? await wallet.signTransaction(tx)
        : null;
      if (!signed) throw new Error("Wallet does not support signTransaction");
      const sig = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
      });
      await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        "confirmed"
      );
      setStatus("Poll created ✔");
    } catch (e: any) {
      console.error("Create poll error:", e);
      setStatus(e?.message || "Failed to create poll");
    } finally {
      setCreating(false);
    }
  }, [
    wallet.publicKey,
    connection,
    derivePollPda,
    pollId,
    question,
    optionsCount,
  ]);

  const onFetch = useCallback(async () => {
    if (!wallet.publicKey) return;
    setFetching(true);
    setStatus("");
    try {
      const pollPda = await derivePollPda(wallet.publicKey, pollId);
      const info = await connection.getAccountInfo(pollPda);
      if (!info) throw new Error("Poll account not found");
      const buf = info.data;
      let o = 8; // disc
      o += 32; // authority
      o += 8; // poll_id
      o += 1; // bump
      const isOpen = buf[o] === 1;
      o += 1;
      const oc = buf[o];
      o += 1;
      const counts: number[] = [];
      for (let i = 0; i < 10; i++) {
        counts.push(buf.readUInt32LE(o));
        o += 4;
      }
      const qLen = buf.readUInt32LE(o);
      o += 4;
      const qStr = Buffer.from(buf.subarray(o, o + qLen)).toString();
      setPollView({
        question: qStr,
        isOpen,
        optionsCount: oc,
        counts: counts.slice(0, oc),
      });
      setStatus("Poll loaded ✔");
    } catch (e: any) {
      console.error("Fetch poll error:", e);
      setStatus(e?.message || "Failed to fetch poll");
      setPollView(null);
    } finally {
      setFetching(false);
    }
  }, [wallet.publicKey, connection, derivePollPda, pollId]);

  const onVote = useCallback(async () => {
    if (!wallet.publicKey) return;
    setVoting(true);
    setStatus("");
    try {
      const pollPda = await derivePollPda(wallet.publicKey, pollId);
      const voterRecord = deriveVoterRecordPda(pollPda, wallet.publicKey);
      const data = Buffer.concat([Buffer.from(DISC.vote), u8(optionIndex)]);
      const keys = [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: pollPda, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: false, isWritable: false },
        { pubkey: voterRecord, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ];
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys,
        data,
      });
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      const tx = new Transaction({
        feePayer: wallet.publicKey,
        recentBlockhash: blockhash,
      }).add(ix);
      const signed = wallet.signTransaction
        ? await wallet.signTransaction(tx)
        : null;
      if (!signed) throw new Error("Wallet does not support signTransaction");
      const sig = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
      });
      await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        "confirmed"
      );
      setStatus("Vote submitted ✔");
      await onFetch();
    } catch (e: any) {
      console.error("Vote error:", e);
      setStatus(e?.message || "Failed to vote");
    } finally {
      setVoting(false);
    }
  }, [
    wallet.publicKey,
    connection,
    derivePollPda,
    deriveVoterRecordPda,
    pollId,
    optionIndex,
    onFetch,
  ]);

  const onClose = useCallback(async () => {
    if (!wallet.publicKey) return;
    setClosing(true);
    setStatus("");
    try {
      const pollPda = await derivePollPda(wallet.publicKey, pollId);
      const data = Buffer.from(DISC.close_poll);
      const keys = [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: pollPda, isSigner: false, isWritable: true },
      ];
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys,
        data,
      });
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      const tx = new Transaction({
        feePayer: wallet.publicKey,
        recentBlockhash: blockhash,
      }).add(ix);
      const signed = wallet.signTransaction
        ? await wallet.signTransaction(tx)
        : null;
      if (!signed) throw new Error("Wallet does not support signTransaction");
      const sig = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
      });
      await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        "confirmed"
      );
      setStatus("Poll closed ✔");
      await onFetch();
    } catch (e: any) {
      console.error("Close poll error:", e);
      setStatus(e?.message || "Failed to close poll");
    } finally {
      setClosing(false);
    }
  }, [wallet.publicKey, connection, derivePollPda, pollId, onFetch]);

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/15 p-6 bg-white/50 dark:bg-white/5 backdrop-blur-sm max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="text-base font-medium">Launch</div>
        <div className="flex items-center gap-2">
          <WalletMultiButton className="btn btn-sm" />
        </div>
      </div>
      <div className="grid gap-6">
        <div className="grid sm:grid-cols-3 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-sm text-foreground/70 mb-1">
              Question
            </label>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Your question"
              className="w-full rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 ring-black/10 dark:ring-white/15"
            />
          </div>
          <div>
            <label className="block text-sm text-foreground/70 mb-1">
              Options Count
            </label>
            <input
              type="number"
              min={2}
              max={10}
              value={optionsCount}
              onChange={(e) => setOptionsCount(Number(e.target.value))}
              className="w-full rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 ring-black/10 dark:ring-white/15"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm text-foreground/70 mb-1">
              Poll ID
            </label>
            <input
              type="number"
              value={pollId}
              onChange={(e) => setPollId(Number(e.target.value))}
              className="w-full rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 ring-black/10 dark:ring-white/15"
            />
          </div>
          <div>
            <label className="block text-sm text-foreground/70 mb-1">
              Vote Option Index
            </label>
            <input
              type="number"
              min={0}
              max={9}
              value={optionIndex}
              onChange={(e) => setOptionIndex(Number(e.target.value))}
              className="w-full rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 ring-black/10 dark:ring-white/15"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCreate}
              disabled={!wallet.publicKey || creating}
              className="flex-1 rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              Create Poll
            </button>
            <button
              onClick={onVote}
              disabled={!wallet.publicKey || voting}
              className="flex-1 rounded-md border border-black/10 dark:border-white/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
            >
              Vote
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onFetch}
            disabled={!wallet.publicKey || fetching}
            className="rounded-md border border-black/10 dark:border-white/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
          >
            Fetch Poll
          </button>
          <button
            onClick={onClose}
            disabled={!wallet.publicKey || closing}
            className="rounded-md border border-black/10 dark:border-white/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
          >
            Close Poll
          </button>
        </div>

        {pollView ? (
          <div className="rounded-lg border border-black/10 dark:border-white/15 p-4">
            <div className="text-sm text-foreground/70 mb-1">Question</div>
            <div className="text-base font-medium mb-4">
              {pollView.question}
            </div>
            <div className="text-sm text-foreground/70 mb-2">
              Status: {pollView.isOpen ? "Open" : "Closed"}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pollView.counts.map((c, i) => (
                <div
                  key={i}
                  className="rounded-md border border-black/10 dark:border-white/15 p-3 text-sm"
                >
                  <div className="text-foreground/70">Option {i}</div>
                  <div className="text-base font-semibold">{c}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {status ? (
          <div className="text-sm text-foreground/80">{status}</div>
        ) : null}
      </div>
    </div>
  );
}

function WalletButtons() {
  const { publicKey } = useWallet();
  const Connected = () => (
    <span className="inline-flex items-center gap-2 text-sm text-foreground/70">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
    </span>
  );
  return publicKey ? (
    <Connected />
  ) : (
    <span className="text-sm text-foreground/60">Connect via button</span>
  );
}

import * as anchor from "@project-serum/anchor";
import fs from "fs";
import log from "loglevel";
import { IDL } from "../../target/types/carbon";

export const PROGRAM_ID = new anchor.web3.PublicKey(
  "LCCDPD5uq2QZMeHjd71unWu6nr8no9wwjcH3qMQwXXj"
);

export const SYSTEM_PROGRAM = anchor.web3.SystemProgram.programId;

export function loadWalletKey(keypair): anchor.web3.Keypair {
  if (!keypair || keypair == "") {
    throw new Error("Keypair is required!");
  }
  const loaded = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(keypair).toString()))
  );
  log.info(`Wallet public key: ${loaded.publicKey}`);
  return loaded;
}

export async function loadProgram(
  walletKeyPair: anchor.web3.Keypair,
  customRpcUrl?: string
) {
  const solConnection = new anchor.web3.Connection(customRpcUrl);
  const walletWrapper = new anchor.Wallet(walletKeyPair);
  const provider = new anchor.AnchorProvider(solConnection, walletWrapper, {
    preflightCommitment: "confirmed",
  });
  return new anchor.Program(IDL, PROGRAM_ID, provider);
}

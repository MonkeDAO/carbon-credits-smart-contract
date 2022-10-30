// @ts-nocheck
import * as anchor from "@project-serum/anchor";
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { Carbon } from "../target/types/carbon";

export const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

export const getMasterEditionAccount = async (
  mint: anchor.web3.PublicKey
): Promise<anchor.web3.PublicKey> => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )
  )[0];
};

export const getMetadataAccount = async (
  mint: anchor.web3.PublicKey
): Promise<anchor.web3.PublicKey> => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )
  )[0];
};

export const getAllPDAs = async (prog: anchor.Program<Carbon>) => {
  const [mintConfig, mintConfigBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("config")],
      prog.programId
    );

  const [newNftCreator, newNftCreatorBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("carbon")],
      prog.programId
    );

  return {
    mintConfig,
    mintConfigBump,
    newNftCreator,
    newNftCreatorBump,
  };
};

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID =
  new anchor.web3.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

export const getAtaForMint = async (
  mint: anchor.web3.PublicKey,
  buyer: anchor.web3.PublicKey
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [buyer.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
  );
};

export const sendTokensToUser = async (
  kp: Keypair,
  provider: anchor.Provider,
  mint: PublicKey,
  receiver: PublicKey,
  amount: number,
  createAtaForReceiver: boolean = false
): Promise<string> => {
  const senderTokenAccountPubkey = await getAssociatedTokenAddress(
    mint,
    kp.publicKey
  );
  let receiverTokenAccountPubkey: PublicKey;
  let shouldCreateAccountForTheReceiver: boolean = false;
  if (createAtaForReceiver) {
    receiverTokenAccountPubkey = await getAssociatedTokenAddress(
      mint,
      receiver
    );
    shouldCreateAccountForTheReceiver = true;
  } else {
    const receiverTokenAccounts =
      await provider.connection.getTokenAccountsByOwner(receiver, {
        mint: mint,
      });

    shouldCreateAccountForTheReceiver = receiverTokenAccounts.value.length < 1;

    receiverTokenAccountPubkey = shouldCreateAccountForTheReceiver
      ? (await getAtaForMint(mint, receiver))[0]
      : receiverTokenAccounts.value[0].pubkey;
  }

  const transaction = new Transaction();
  if (shouldCreateAccountForTheReceiver) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        kp.publicKey,
        receiverTokenAccountPubkey,
        receiver,
        mint
      )
    );
  }

  transaction.add(
    createTransferInstruction(
      senderTokenAccountPubkey,
      receiverTokenAccountPubkey,
      kp.publicKey,
      amount
    )
  );

  const tx = await provider.sendAndConfirm(transaction, []);
  await provider.connection.confirmTransaction(tx, "confirmed");
  console.log(`Sent token ${tx}`);

  return "";
};

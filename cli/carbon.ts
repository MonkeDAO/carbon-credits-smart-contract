import * as anchor from "@project-serum/anchor";
import {
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Command } from "commander";
import log from "loglevel";
import { getAllPDAs, getAtaForMint } from "../tests/utils";

import { loadProgram, loadWalletKey, SYSTEM_PROGRAM } from "./helpers/utils";

const program = new Command();
program.version("0.69.420");
log.setLevel("info");

const programCommand = (name: string, desc: string = "") => {
  return program
    .command(name)
    .description(desc)
    .option("-r, --rpc-url <string>", "custom rpc url")
    .option(
      "-k, --keypair <path>",
      "solana wallet location",
      "--keypair not provided"
    );
};

programCommand("init-config", "initializes config")
  .option(
    "-creator, --creator <string>",
    "creator who will get 100% of royalty"
  )
  .option(
    "-ptm, --purchase-token-mint <string>",
    "mint of the token which will be used to purchase the carbon credits"
  )
  .option(
    "-ocp, --one-credit-price <number>",
    "cost of one carbon credit, caution: take account of number of decimals of mint to add zeros at the end"
  )
  .action(async (_, command) => {
    const { rpcUrl, keypair, creator, purchaseTokenMint, oneCreditPrice } =
      command.opts();
    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadProgram(walletKeyPair, rpcUrl);
    const { mintConfig, newNftCreator } = await getAllPDAs(anchorProgram);

    let creatorPk: anchor.web3.PublicKey;
    let purchaseTokenMintPk: anchor.web3.PublicKey;

    if (creator) {
      creatorPk = new anchor.web3.PublicKey(creator);
    } else {
      throw new Error("No creator address provided");
    }

    if (purchaseTokenMint) {
      purchaseTokenMintPk = new anchor.web3.PublicKey(purchaseTokenMint);
    } else {
      throw new Error("No purchase token mint provided");
    }

    const signature = await anchorProgram.rpc.initConfig(
      creatorPk,
      purchaseTokenMintPk,
      new anchor.BN(oneCreditPrice),
      {
        accounts: {
          mintConfig: mintConfig,
          newNftCreator: newNftCreator,
          admin: walletKeyPair.publicKey,
          systemProgram: SYSTEM_PROGRAM,
        },
      }
    );

    log.info(`tx: ${signature}`);
  });

programCommand("delete-config", "initializes config").action(
  async (_, command) => {
    const { rpcUrl, keypair } = command.opts();
    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadProgram(walletKeyPair, rpcUrl);
    const { mintConfig } = await getAllPDAs(anchorProgram);

    const signature = await anchorProgram.rpc.deleteConfig({
      accounts: {
        burnConfig: mintConfig,
        admin: walletKeyPair.publicKey,
        systemProgram: SYSTEM_PROGRAM,
      },
    });

    log.info(`tx: ${signature}`);
  }
);

programCommand(
  "create-token",
  "create token for the testing on localnet or devnet"
)
  .requiredOption("-mkp, --mint-key-path <string>", "mint keypair path")
  .action(async (_, command) => {
    const { rpcUrl, keypair, mintKeyPath } = command.opts();
    const walletKeyPair = loadWalletKey(keypair);
    const mintKey = loadWalletKey(mintKeyPath);
    const anchorProgram = await loadProgram(walletKeyPair, rpcUrl);

    try {
      const transaction = new anchor.web3.Transaction();
      const adminAta = (
        await getAtaForMint(mintKey.publicKey, walletKeyPair.publicKey)
      )[0];
      transaction.add(
        // create mint account
        anchor.web3.SystemProgram.createAccount({
          fromPubkey: walletKeyPair.publicKey,
          newAccountPubkey: mintKey.publicKey,
          space: MINT_SIZE,
          lamports: await getMinimumBalanceForRentExemptMint(
            anchorProgram.provider.connection
          ),
          programId: TOKEN_PROGRAM_ID,
        }),
        // init mint account
        createInitializeMintInstruction(
          mintKey.publicKey,
          9,
          walletKeyPair.publicKey,
          walletKeyPair.publicKey
        ),
        // mint 1 Million tokens to admin account
        createAssociatedTokenAccountInstruction(
          walletKeyPair.publicKey,
          adminAta,
          walletKeyPair.publicKey,
          mintKey.publicKey
        ),
        createMintToInstruction(
          mintKey.publicKey,
          adminAta,
          walletKeyPair.publicKey,
          1000000 * 10 ** 9
        )
      );

      const tx = await anchorProgram.provider.sendAndConfirm(transaction, [
        mintKey,
      ]);
      console.log(`Created token ${tx}`);
    } catch (error) {
      console.log({ error });
      console.log({ errorString: error.toString() });
      console.log(`Token is already created`);
    }
  });

program.parse(process.argv);

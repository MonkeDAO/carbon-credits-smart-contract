import * as anchor from "@project-serum/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  getMinimumBalanceForRentExemptMint,
  MintLayout,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { IDL } from "../target/types/carbon";
import {
  getAllPDAs,
  getMasterEditionAccount,
  getMetadataAccount,
  sendTokensToUser,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  TOKEN_METADATA_PROGRAM_ID,
} from "./utils";

const adminKeypair = anchor.web3.Keypair.fromSecretKey(
  new Uint8Array(
    JSON.parse(
      require("fs").readFileSync(
        "./localnet-keys/LAMNrme9Q9CWXmctMRFQ18PXtdTfeDLgd7suoSyN4eE.json",
        "utf8"
      )
    )
  )
);

const userKeypair = anchor.web3.Keypair.fromSecretKey(
  new Uint8Array(
    JSON.parse(
      require("fs").readFileSync(
        "./localnet-keys/LURCvMcJKH4rmFHup6Y3dwMMJsoZKYyLsHxAwNizok7.json",
        "utf8"
      )
    )
  )
);

const mintKey = anchor.web3.Keypair.fromSecretKey(
  new Uint8Array(
    JSON.parse(
      require("fs").readFileSync(
        "./localnet-keys/LTKNocCbMhyz5naABWjL8kXPFNVHUNSiYnmjvNBCKEd.json",
        "utf8"
      )
    )
  )
);

export const getAtaForMint = async (
  mint: anchor.web3.PublicKey,
  user: anchor.web3.PublicKey
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [user.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
  );
};

const PROGRAM_ID = "LCCDPD5uq2QZMeHjd71unWu6nr8no9wwjcH3qMQwXXj";

const getProvider = (): anchor.AnchorProvider => {
  const anchorProvider = anchor.AnchorProvider.env();
  anchor.setProvider(anchorProvider);
  return anchorProvider;
};

export function loadContractProgram() {
  const provider = getProvider();
  return new anchor.Program(IDL, PROGRAM_ID, provider);
}

describe("CC", async () => {
  const anchorProgram = loadContractProgram();
  const carbonCreditReceiptKp = anchor.web3.Keypair.generate();
  const newNftKp = anchor.web3.Keypair.generate();

  it("Create Token if it is not created already", async () => {
    try {
      const transaction = new anchor.web3.Transaction();
      const adminAta = (
        await getAtaForMint(mintKey.publicKey, adminKeypair.publicKey)
      )[0];
      transaction.add(
        // create mint account
        anchor.web3.SystemProgram.createAccount({
          fromPubkey: adminKeypair.publicKey,
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
          adminKeypair.publicKey,
          adminKeypair.publicKey
        ),
        // mint 1 Million tokens to admin account
        createAssociatedTokenAccountInstruction(
          adminKeypair.publicKey,
          adminAta,
          adminKeypair.publicKey,
          mintKey.publicKey
        ),
        createMintToInstruction(
          mintKey.publicKey,
          adminAta,
          adminKeypair.publicKey,
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

  it("Send 5K tokens to the user", async () => {
    await sendTokensToUser(
      adminKeypair,
      anchorProgram.provider,
      mintKey.publicKey,
      userKeypair.publicKey,
      5000 * 10 ** 9
    );
  });

  it("Initialize the contract config", async () => {
    const { mintConfig, newNftCreator } = await getAllPDAs(anchorProgram);

    try {
      const txnSign = await anchorProgram.rpc.initConfig(
        adminKeypair.publicKey,
        mintKey.publicKey,
        new anchor.BN(10 * 10 ** 9),
        {
          accounts: {
            admin: adminKeypair.publicKey,
            newNftCreator,
            mintConfig: mintConfig,
            systemProgram: anchor.web3.SystemProgram.programId,
          },
        }
      );

      console.log({ txnSign });
    } catch (error) {
      console.log({ error });
      throw new Error("Failed to initialize config");
    }
  });

  it("User mints the NFT", async () => {
    const { mintConfig, newNftCreator } = await getAllPDAs(anchorProgram);

    const newNftMint = newNftKp.publicKey;
    const newNftMetadata = await getMetadataAccount(newNftMint);
    const newNftMasterEdition = await getMasterEditionAccount(newNftMint);

    const rent =
      await anchorProgram.provider.connection.getMinimumBalanceForRentExemption(
        MintLayout.span
      );

    const newNftToken = (
      await PublicKey.findProgramAddress(
        [
          userKeypair.publicKey.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          newNftMint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    )[0];

    console.log({ newNftMint: newNftMint.toBase58() });

    try {
      const txnSign = await anchorProgram.rpc.carbonCredit(new anchor.BN(5), {
        accounts: {
          user: userKeypair.publicKey,
          purchaseTokenMint: mintKey.publicKey,
          purchaseTokenAccount: await getAssociatedTokenAddress(
            mintKey.publicKey,
            userKeypair.publicKey
          ),
          carbonReceipt: carbonCreditReceiptKp.publicKey,
          mintConfig: mintConfig,
          newNftMint: newNftMint,
          newNftMetadata: newNftMetadata,
          newNftMasterEdition: newNftMasterEdition,
          newNftCreator: newNftCreator,
          admin: adminKeypair.publicKey,
          adminSplTokenAccount: await getAssociatedTokenAddress(
            mintKey.publicKey,
            adminKeypair.publicKey
          ),
          tokenProgram: TOKEN_PROGRAM_ID,
          nftProgramId: TOKEN_METADATA_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          time: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
        signers: [userKeypair, carbonCreditReceiptKp, newNftKp],
        instructions: [
          anchor.web3.SystemProgram.createAccount({
            fromPubkey: userKeypair.publicKey,
            newAccountPubkey: newNftMint,
            space: MintLayout.span,
            lamports: rent,
            programId: TOKEN_PROGRAM_ID,
          }),
          createInitializeMintInstruction(
            newNftMint,
            0,
            userKeypair.publicKey,
            userKeypair.publicKey
          ),
          createAssociatedTokenAccountInstruction(
            userKeypair.publicKey,
            newNftToken,
            userKeypair.publicKey,
            newNftMint
          ),
          createMintToInstruction(
            newNftMint,
            newNftToken,
            userKeypair.publicKey,
            1,
            [userKeypair]
          ),
        ],
      });
      console.log({ txnSign });
    } catch (error) {
      console.log({ error });
      throw new Error("Failed to mint nft");
    }
  });

  it("Admin changes the metadata of that NFT", async () => {
    const { mintConfig, newNftCreator } = await getAllPDAs(anchorProgram);

    const newNftMint = newNftKp.publicKey;
    const newNftMetadata = await getMetadataAccount(newNftMint);
    try {
      const txnSign = await anchorProgram.rpc.expireCarbonCredit({
        accounts: {
          admin: adminKeypair.publicKey,
          user: userKeypair.publicKey,
          carbonReceipt: carbonCreditReceiptKp.publicKey,
          mintConfig: mintConfig,
          nftMint: newNftMint,
          nftMetadata: newNftMetadata,
          newNftCreator: newNftCreator,
          tokenProgram: TOKEN_PROGRAM_ID,
          nftProgramId: TOKEN_METADATA_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          time: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
      });
      console.log({ txnSign });
    } catch (error) {
      console.log({ error });
      throw new Error("Failed to expire nft");
    }
  });

  it("Delete the contract config", async () => {
    const { mintConfig } = await getAllPDAs(anchorProgram);

    try {
      const txnSign = await anchorProgram.rpc.deleteConfig({
        accounts: {
          admin: adminKeypair.publicKey,
          burnConfig: mintConfig,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
      });

      console.log({ txnSign });
    } catch (error) {
      console.log({ error });
      throw new Error("Failed to delete config");
    }
  });
});

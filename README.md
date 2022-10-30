# README

## Commands

```sh
# download js dependencies
yarn
# build the program
anchor build
# copy the localnet program key & build it again
cp localnet-keys/LCCDPD5uq2QZMeHjd71unWu6nr8no9wwjcH3qMQwXXj.json target/deploy/carbon-keypair.json
anchor build
# start the test-validator on localnet
yarn localnet:start
# airdrop SOLs to the admin & user account
yarn localnet:airdrop
# run tests
yarn localnet:test
# run tests with skipping re-deployment of program
yarn localnet:testq
```

## Deployment Checklist

1. Modify ADMIN_PUBKEY_STR, CARBON_CREDIT_NFT_URI, and EXPIRED_NFT_URI in `programs/carbon/src/constants.rs` file
2. Check the parameters of `create_metadata_accounts` function in `programs/carbon/src/instructions/carbon_credit.rs` file
3. Check the values of `DataV2` in `programs/carbon/src/instructions/expire_carbon_credit.rs` file
4. Re-build the contract & deploy it
5. Run the `init-config` command with correct values

## Versions

### Anchor Version: 0.25.0, Solana Version: 1.13.2, Node version 16.14.2

## Dev-Net Testing & Cli Demo

```sh
solana airdrop 2 LAMNrme9Q9CWXmctMRFQ18PXtdTfeDLgd7suoSyN4eE --url https://api.devnet.solana.com
# create token for testing
npx ts-node cli/carbon.ts create-token -r https://api.devnet.solana.com -k localnet-keys/LAMNrme9Q9CWXmctMRFQ18PXtdTfeDLgd7suoSyN4eE.json -mkp localnet-keys/LTKNocCbMhyz5naABWjL8kXPFNVHUNSiYnmjvNBCKEd.json
# deploy program
anchor build && anchor deploy --provider.cluster devnet
# init config
npx ts-node cli/carbon.ts init-config -r https://api.devnet.solana.com -k localnet-keys/LAMNrme9Q9CWXmctMRFQ18PXtdTfeDLgd7suoSyN4eE.json -creator LAMNrme9Q9CWXmctMRFQ18PXtdTfeDLgd7suoSyN4eE -ptm LTKNocCbMhyz5naABWjL8kXPFNVHUNSiYnmjvNBCKEd -ocp 10000000000
# delete config
npx ts-node cli/carbon.ts delete-config -r https://api.devnet.solana.com -k localnet-keys/LAMNrme9Q9CWXmctMRFQ18PXtdTfeDLgd7suoSyN4eE.json
```

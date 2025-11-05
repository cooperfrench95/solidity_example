# Solidity Smart Contract Example

This project was bootstrapped with Hardhat V3. I've edited the default smart contract somewhat, but my version does basically the same thing - increments a counter.

## Installation and usage

1. Clone this repo
2. Run `yarn` to install dependencies
3. `touch .env` - Create a .env file to place your secrets (gitignored)
4. In your new `.env` file, place the following variables: `SEPOLIA_PRIVATE_KEY` (your private wallet key for the sepolia network), `SEPOLIA_RPC_URL` (for example: `https://sepolia.infura.io/v3/MY_API_KEY`)
5. To run tests, `yarn test`
6. To call the function with your wallet, run `yarn call:sepolia`. This will call the various functions exposed by the contract and print some output.

## Development/Deployment

1. Make your changes to the contract or add a new one in the `contracts` folder
2. Update the associated tests. Note that there are both solidity tests AND typescript unit tests you'll need to update.
3. To deploy, assuming you've got your variables above in the `.env` file, run: `npx hardhat ignition deploy --network sepolia ignition/modules/MyContract.ts` (replacing `MyContract` with your file name)
4. Adjust the contract address and deployment JSON in the `scripts/send-sepolia-tx.ts` file as needed. 
5. Run `yarn call:sepolia` to execute the new contract (presuming you adjusted the ts file correctly in the previous step!)


import { network } from "hardhat";

const { viem } = await network.connect({
  network: "sepolia",
  chainType: "l1",
});

console.log('Connected to network')

const publicClient = await viem.getPublicClient()
const [senderClient] = await viem.getWalletClients()

const tokenContract = await viem.getContractAt('CoopCoin', '0xBbeC911437A633e39B17d73230Ed02e6627c0ABe')

const transactionHash = await tokenContract.write.issueMeSomeTokens(
  { account: senderClient.account.address }
)
console.log('Transaction hash: ', transactionHash)

const transactionReceipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash });

console.log("Receipt:", transactionReceipt);
import { network } from "hardhat";
import { parseUnits } from "viem";

const RECIPIENT_ADDRESS = '0x3068cf9088465e50990a883c0bb376073b834826'
const CONTRACT_ADDRESS = '0xBbeC911437A633e39B17d73230Ed02e6627c0ABe'

const { viem } = await network.connect({
  network: "sepolia",
  chainType: "l1",
});

console.log('Connected to network')

const publicClient = await viem.getPublicClient()
const [senderClient] = await viem.getWalletClients()

const tokenContract = await viem.getContractAt('CoopCoin', CONTRACT_ADDRESS)

const amount = parseUnits('100', 18)

const transactionHash = await tokenContract.write.transfer(
  [RECIPIENT_ADDRESS, amount],
  { account: senderClient.account.address }
)
console.log('Transaction hash: ', transactionHash)

const transactionReceipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash });

console.log("Receipt:", transactionReceipt);
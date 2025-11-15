import { network } from "hardhat";
import contractAbi from '../external_contracts/wave_contract/abi.json'

const CONTRACT_ADDRESS = '0xB2c91F5c7b50b635e6a49488abB19296793B6d3d'
const CONTRACT_ABI = contractAbi

const { viem } = await network.connect({
  network: "sepolia",
  chainType: "l1",
});

console.log('Connected to network')

const publicClient = await viem.getPublicClient()
const [senderClient] = await viem.getWalletClients()

const transactionHash = await senderClient.writeContract({
  address: CONTRACT_ADDRESS,
  abi: CONTRACT_ABI,
  functionName: 'wave',
});

console.log('Transaction hash: ', transactionHash)

const transactionReceipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash });

console.log("Receipt:", transactionReceipt);
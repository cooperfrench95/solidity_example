import { network } from "hardhat";
import contractDeploymentJson from '../ignition/deployments/chain-11155111/artifacts/module.json'


const CONTRACT_ADDRESS = '0xBa312fABF1B0e3025F07D12f103c65C6611263a9'
const CONTRACT_ABI = contractDeploymentJson.abi

const { viem } = await network.connect({
  network: "sepolia",
  chainType: "l1",
});

console.log('Checking how many times the increment function has been called')


const publicClient = await viem.getPublicClient();
const [senderClient] = await viem.getWalletClients();

const numExistingCalls = await publicClient.readContract({
  address: CONTRACT_ADDRESS,
  abi: CONTRACT_ABI,
  functionName: 'checkCalls'
});

console.log('Calls so far: ', numExistingCalls)

console.log('\nCalling increment() via the Sepolia network...')

const transactionHash = await senderClient.writeContract({
  address: CONTRACT_ADDRESS,
  abi: CONTRACT_ABI,
  functionName: 'increment',
});

console.log('Getting the receipt...')

const transactionReceipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash })

console.log("Receipt:", transactionReceipt);
console.log("Indexed sender address (pulled from transaction receipt): ", transactionReceipt.logs[0].topics[1])

const int1 = Math.floor(Math.random() * 1000)
const int2 = Math.floor(Math.random() * 1000)

console.log('\nCalling sum() with 2 random integers: ', int1, int2)

const sumResult = await publicClient.readContract({
  address: CONTRACT_ADDRESS,
  abi: CONTRACT_ABI,
  functionName: 'sum',
  args: [int1, int2],
  account: senderClient.account.address,
});

console.log('Sum result: ', sumResult)

console.log('\nChecking how many times we have incremented again...')

const numCalls = await publicClient.readContract({
  address: CONTRACT_ADDRESS,
  abi: CONTRACT_ABI,
  functionName: 'checkCalls'
});

console.log('Number of calls: ', numCalls)
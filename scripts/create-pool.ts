
import { network } from "hardhat";
import v3Factory from '../external_contracts/uniswap/v3factory.json'
import { Address, decodeEventLog } from 'viem';

const Q96 = 2n ** 96n;
const WETH_ADDRESS = '0xfff9976782d46cc05630d1f6ebab18b2324d6b14'
const COOPCOIN = '0xBbeC911437A633e39B17d73230Ed02e6627c0ABe'
const AUD = '0x251A516C36726A70Ec95eBb4D17073550d63C16e'
const FEE_TIER = 500

const { viem } = await network.connect({
  network: "sepolia",
  chainType: "l1",
});
const publicClient = await viem.getPublicClient()
const [walletClient] = await viem.getWalletClients()

async function createPool(tokenA: Address, tokenB: Address) {
  const hash = await walletClient.writeContract({
      address: v3Factory.address as Address,
      abi: v3Factory.abi,
      functionName: 'createPool',
      args: [tokenA, tokenB, FEE_TIER],
      account: walletClient.account,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  for (const log of receipt.logs) {
    const decoded = decodeEventLog({
      abi: v3Factory.abi,
      data: log.data,
      topics: log.topics,
    })

    if (decoded.eventName === 'PoolCreated') {
      console.log('Pool address: ', (decoded?.args as any)?.pool)
    }
  }
}

async function main() {
  const ETH_AUD_POOL = await createPool(WETH_ADDRESS, AUD) // 0xc8AF8eDCd579dA8faEBBe59d5606b124cD6D7E5F
  const AUD_COOP_POOL = await createPool(AUD, COOPCOIN) // 0xAeB410f574312C52f6e743862C2e372271B80b9B
  const WETH_COOP_POOL = await createPool(WETH_ADDRESS, COOPCOIN) // 0xFaB938F222ca301dF8A3028554c480837489FeEB
}

main()
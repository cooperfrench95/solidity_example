import Big from 'big.js'; 
import { network } from 'hardhat';
import { Address, getContract } from 'viem';
import uniswapV3PoolAbi from '../external_contracts/uniswap/poolABI.json'

const Q96 = 2n ** 96n;

const { viem } = await network.connect({
  network: "sepolia",
  chainType: "l1",
});

console.log('Connected to network')

const publicClient = await viem.getPublicClient()
const [senderClient] = await viem.getWalletClients()


const WETH_ADDRESS = '0xfff9976782d46cc05630d1f6ebab18b2324d6b14';
const COOPCOIN = '0xBbeC911437A633e39B17d73230Ed02e6627c0ABe';
const AUD = '0x251A516C36726A70Ec95eBb4D17073550d63C16e';

const WETH_AUD_POOL = '0xc8AF8eDCd579dA8faEBBe59d5606b124cD6D7E5F'
const AUD_COOP_POOL = '0xAeB410f574312C52f6e743862C2e372271B80b9B'
const WETH_COOP_POOL = '0xFaB938F222ca301dF8A3028554c480837489FeEB'

const WETH_PER_AUD = '0.0001' // 10k aud per eth
const AUD_PER_COOP = '3' // 1 COOP = 3 AUD
const WETH_PER_COOP = '0.0002' // 5k COOP per eth

function calculateSqrtPriceX96(
    desiredPrice: string, 
    token1Decimals: number, 
    token2Decimals: number
) {
    const priceAdjustment = new Big(10).pow(token1Decimals - token2Decimals);
    const adjustedPrice = new Big(desiredPrice).mul(priceAdjustment);
    const sqrtPrice = adjustedPrice.sqrt(); 
    const sqrtPriceX96_Big = sqrtPrice.mul(new Big(Q96.toString()));
    return BigInt(sqrtPriceX96_Big.toFixed(0));
}

async function setPoolPrice(poolAddr: Address, initialPrice: string) {
  const poolContract = getContract({
    address: poolAddr,
    abi: uniswapV3PoolAbi,
    client: {
      public: publicClient,
      wallet: senderClient,
    },
  });

  const hash = await poolContract.write.initialize(
    [calculateSqrtPriceX96(initialPrice, 18, 18)],
    { account: senderClient.account }
  );

  console.log('Transaction hash: ', hash)
  const transactionReceipt = await publicClient.waitForTransactionReceipt({ hash: hash });
  console.log("Receipt:", transactionReceipt);
}

async function main() {
  await setPoolPrice(WETH_AUD_POOL, WETH_PER_AUD);
  await setPoolPrice(AUD_COOP_POOL, AUD_PER_COOP);
  await setPoolPrice(WETH_COOP_POOL, WETH_PER_COOP);
}

main()
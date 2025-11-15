import { network } from "hardhat";
import swapRouter from '../external_contracts/uniswap/swapRouterO2.json'
import { Abi, Address, encodeFunctionData, formatUnits, isAddress, parseAbi, parseEther, parseUnits } from "viem";
import { DateTime } from 'luxon'
import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";
import v3factoryContract from '../external_contracts/uniswap/v3factory.json'
import v2factoryContract from '../external_contracts/uniswap/v2factory.json'
import quoter from '../external_contracts/uniswap/quoterv3.json'
import v4PoolManagerContract from '../external_contracts/uniswap/v4manager.json'
import { sqrt, Token } from '@uniswap/sdk-core'
import readline from "readline/promises";
import axios from 'axios'
import { stdin, stdout } from 'node:process'
import * as dotenv from 'dotenv';
import Big from 'big.js';
import hre from "hardhat";

// Load env vars
dotenv.config();

const { viem } = await network.connect({
  network: "sepolia",
  chainType: "l1",
});

const publicClient = await viem.getPublicClient()
const [senderClient] = await viem.getWalletClients()

const CONTRACT_ADDRESS = swapRouter.address as `0x${string}`
const CONTRACT_ABI = swapRouter.abi;

// Define the shape of the function parameters for type safety
type SwapParams = {
    tokenIn: Address;
    tokenOut: Address;
    fee: number; // uint24
    recipient: Address;
    deadline: bigint;
    amountIn: bigint;
    amountOutMinimum: bigint;
    sqrtPriceLimitX96: bigint; // uint160
};
type LiquidityPool = {
  poolAddress: Address,
  uniswapVersion: 'v2' | 'v3',
  feeBasisPoints: string,
  feeTier: number,
}
type LiquidityPoolHydrated = LiquidityPool & {
  currentPrice: Big.Big,
  abi: Abi,
}

const SEPOLIA_NET_ID = 11155111
const Q96 = Big(2).pow(96);
const FEE_TIERS = [100, 500, 3000, 10000];
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'.toLowerCase();
const MAX_SLIPPAGE_PERCENT = 5;
const WETH_ADDRESS = '0xfff9976782d46cc05630d1f6ebab18b2324d6b14'.toLowerCase();


// async function checkForV4Pool(token1address: Address, token2address: Address) {
//   const tokenA = new Token(
//     SEPOLIA_NET_ID,
//     token1address,
    
//   )
// }

async function calculateSlippageV3(pool: LiquidityPoolHydrated, swapParams: SwapParams, tokenOutDecimals: number) {
  const result = await publicClient.readContract({
    address: quoter.address as Address,
    abi: quoter.abi,
    functionName: 'quoteExactInputSingle',
    args: [
      {
        tokenIn: swapParams.tokenIn,
        tokenOut: swapParams.tokenOut,
        fee: pool.feeTier,
        amountIn: swapParams.amountIn,
        sqrtPriceLimitX96: swapParams.sqrtPriceLimitX96,    
      }
    ],
  });

  const amountOut = (result as bigint[])[0]
  return formatUnits(amountOut, tokenOutDecimals)
}

function calculateSlippageV2(pool: LiquidityPoolHydrated, swapParams: SwapParams, tokenOutDecimals: number) {
  // V2
  // Expected slippage = 1 - (amount out/amount in x spot price)
  const amountIn = Big(swapParams.amountIn.toString())
  const spotPrice = Big(pool.currentPrice)
  const expectedAmountOutAfterFees = Big(pool.currentPrice).mul(amountIn).mul(Big('0.997'))
  const result = expectedAmountOutAfterFees.div(amountIn.mul(spotPrice))
  return formatUnits(BigInt(result.toFixed(0).toString()), tokenOutDecimals)
}

function calcSlippage(pool: LiquidityPoolHydrated, swapParams: SwapParams, tokenOutDecimals: number) {
  switch (pool.uniswapVersion) {
    case 'v2':
      return calculateSlippageV2(pool, swapParams, tokenOutDecimals)
    case 'v3':
    default:
      return calculateSlippageV3(pool, swapParams, tokenOutDecimals)
  }
}

async function getToken(address: Address): Promise<Token> {
  const abi = await getABI(address)

  const decimalsBigInt = await publicClient.readContract({
    address: address,
    abi,
    functionName: 'decimals',
  });
  const symbol = await publicClient.readContract({
    address: address,
    abi,
    functionName: 'symbol',
  });

  return new Token(
    SEPOLIA_NET_ID,
    address,
    Number(decimalsBigInt),
    symbol as string,
  )
}


async function getABI(addr: Address): Promise<Abi> {
  const response = await axios.get(`https://api.etherscan.io/v2/api?module=contract&action=getabi&address=${addr}&apikey=${process.env.ETHERSCAN_API_KEY}&chainid=${SEPOLIA_NET_ID}`)
  return JSON.parse(response.data.result)
}

async function hydrateLiquidityPoolObject(pool: LiquidityPool, token1: Token, token2: Token) {
  const abi = await getABI(pool.poolAddress)
  
  let price
  switch (pool.uniswapVersion) {
    case 'v2':
      const res = await publicClient.readContract({
        address: pool.poolAddress,
        abi,
        functionName: 'getReserves',
      });

      const [reserve0, reserve1] = res as bigint[];
      price = Big(Number(reserve1 * 1000000n / reserve0) / 1000000);
      break
    case 'v3':
    default:
      const slot0 = await publicClient.readContract({
        address: pool.poolAddress,
        abi,
        functionName: 'slot0',
      });
      const sqrtPriceX96 = BigInt((slot0 as bigint[])[0]);
      const sqrtPriceX96Big = Big(sqrtPriceX96.toString());
      const sqrtP = sqrtPriceX96Big.div(Q96);
      const priceRaw = sqrtP.pow(2);
      const decimalDifference = token1.decimals - token2.decimals;
      const decimalAdjustment = Big(10).pow(decimalDifference);
      const priceToken1PerToken0 = priceRaw.mul(decimalAdjustment);
      price = priceToken1PerToken0
      break
  }

  return {
    ...pool,
    currentPrice: price,
    abi,
  }
}

async function checkPoolExists(tokenA: Address, tokenB: Address): Promise<LiquidityPool> {
  for (let feeTier of FEE_TIERS) {
    const feeBasisPoints = (Number(feeTier) / 10000).toFixed(2) + '%';

    console.log('Checking Uniswap v3 for pools with', feeBasisPoints, 'fee')

    const poolAddress = await publicClient.readContract({
      address: v3factoryContract.address as Address,
      abi: v3factoryContract.abi,
      functionName: 'getPool',
      args: [tokenA, tokenB, feeTier],
    });

    if (poolAddress !== ZERO_ADDRESS) {
      console.log('Liquidity pool found!')
      return {
        poolAddress: poolAddress as Address,
        feeBasisPoints,
        feeTier,
        uniswapVersion: 'v3'
      }
    }
  }

  console.log('Checking Uniswap v2 for pools')

  const poolAddress = await publicClient.readContract({
    address: v2factoryContract.address as Address,
    abi: v2factoryContract.abi,
    functionName: 'getPair',
    args: [tokenA, tokenB],
  });

  if (poolAddress !== ZERO_ADDRESS) {
    console.log('Liquidity pool found!')
    return {
      poolAddress: poolAddress as Address,
      feeBasisPoints: '0.3%',
      uniswapVersion: 'v2',
      feeTier: 3000,
    }
  }

  throw new Error('Error: No liquidity pool found for this pair!')
}

async function processArguments(): Promise<{
  token1address: Address,
  token2address: Address,
  amount: string,
}> {
  const { _: parsedArgs } = await yargs(hideBin(process.argv))
    .scriptName('swap')
    .parserConfiguration({
      // Disable general number parsing
      'parse-numbers': false, 
      // Disable number parsing specifically for positional args (the address)
      'parse-positional-numbers': false 
    })
    .usage('Usage: yarn swap <token1address> <token2address> <token1amount>')
    .positional('token1address', {
      type: 'string',
      description: 'Token 1 smart contract address (the token you are swapping from)',
      demandOption: true,
      coerce: (arg: any) => String(arg).toLowerCase()
    })
    .positional('token2address', {
      type: 'string',
      description: 'Token 2 smart contract address (the token you are swapping to)',
      demandOption: true,
      coerce: (arg: any) => String(arg).toLowerCase()
    })
    .positional('amount', {
      type: 'number',
      description: 'The amount of token 1 you want to swap',
      demandOption: true,
    })
    .check((argv) => {
      const args = argv._;

      if (args.length !== 3) {
        throw new Error("Missing required args")
      }

      const [token1address, token2address, amount] = args 
      
      if (!isAddress(token1address as string)) {
        throw new Error('Provided token 1 address invalid')
      }

      if (!isAddress(token2address as string)) {
        throw new Error('Provided token 2 address invalid')
      }

      if (typeof amount !== 'number') {
        const asNum = parseInt(amount, 10)
        if (isNaN(asNum)) {
          throw new Error('Invalid input amount')
        }
      }

      return true
    })
    .help()
    .parseAsync()
  
  const [token1address, token2address, amount] = parsedArgs as string[]
  return {
    token1address: token1address.toLowerCase() as Address,
    token2address: token2address.toLowerCase() as Address,
    amount: amount as string,
  }
}

function getMaxPrice(token1: Token, token2: Token, currentPrice: Big.Big) {
  if (token1.decimals !== token2.decimals) {
    const decimalCorrectionFactor = Big(10).pow(token1.decimals - token2.decimals);

    const targetPriceP = currentPrice.mul(Big(1 + (MAX_SLIPPAGE_PERCENT/100)));

    const sqrtRawP = targetPriceP.mul(decimalCorrectionFactor).sqrt();

    const sqrtPriceLimitX96 = BigInt(
      sqrtRawP.mul(Q96).round(0).toFixed(0)
    );

    return sqrtPriceLimitX96
  }
  else {
    const targetPriceP = currentPrice.mul(Big(1 + (MAX_SLIPPAGE_PERCENT/100)));

    const sqrtRawP = targetPriceP.sqrt();

    const sqrtPriceLimitX96 = BigInt(
      sqrtRawP.mul(Q96).round(0).toFixed(0)
    );

    return sqrtPriceLimitX96
  }
}

async function requireApproval() {
  const inf = readline.createInterface(stdin, stdout)
  const answer = await inf.question('About to swap using the above parameters. Continue? (Y/N) ');
  const userApproved = answer.trim().toLowerCase() === 'y';
  
  if (!userApproved) {
    console.log('Aborting.')
    process.exit(0)
  }
}

async function executeTransaction(swapParams: SwapParams) {
  // Estimate gas fees
  console.log(
    swapParams.tokenIn, 
    WETH_ADDRESS,
    swapParams.tokenIn === WETH_ADDRESS
  )
  const result = await publicClient.estimateGas({
    account: senderClient.account,
    to: swapRouter.address as Address,
    data: encodeFunctionData({
      abi: swapRouter.abi,
      functionName: 'exactInputSingle',
      args: [swapParams],
    }),
    value: swapParams.tokenIn === WETH_ADDRESS ? swapParams.amountIn : 0n,
  })

  console.log('Estimated gas: ', result)

  // Approve
  console.log('Approving...')
  const txHash = await senderClient.writeContract({
    address: swapParams.tokenIn,
    abi: await getABI(swapParams.tokenIn),
    functionName: 'approve',
    args: [
      swapRouter.address,
      swapParams.amountIn,
    ],
    account: senderClient.account,
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log('Approval received. Executing...')

  // Execute transaction
  const transactionHash = await senderClient.writeContract({
    address: swapRouter.address as Address,
    abi: swapRouter.abi,
    functionName: 'exactInputSingle',
    args: [swapParams],
    account: senderClient.account,
    value: swapParams.tokenIn === WETH_ADDRESS ? swapParams.amountIn : 0n,
  });
  
  console.log('Transaction hash: ', transactionHash)
  
  const transactionReceipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash });
  
  console.log("Receipt:", transactionReceipt);

}

async function main() {
  const args = await processArguments()
  
  console.log('Connected to network')
  const [token1, token2] = await Promise.all([
    getToken(args.token1address),
    getToken(args.token2address),
  ])
  
  const deadline = BigInt(DateTime.now().plus({ minutes: 10 }).toUnixInteger())
  
  const swapParams: SwapParams = {
    tokenIn: token1.address.toLowerCase() as Address,
    tokenOut: token2.address.toLowerCase() as Address,
    fee: 3000, // 0.3%
    recipient: senderClient.account.address,
    amountIn: parseEther(args.amount),
    amountOutMinimum: 0n,
    sqrtPriceLimitX96: 0n,
    deadline,
  }

  
  const liquidityPool = await checkPoolExists(swapParams.tokenIn, swapParams.tokenOut)
  const hydratedPool = await hydrateLiquidityPoolObject(liquidityPool, token1, token2)
  
  // Set slippage limits
  swapParams.sqrtPriceLimitX96 = getMaxPrice(token1, token2, hydratedPool.currentPrice);
  console.log(hydratedPool.currentPrice, Big(swapParams.sqrtPriceLimitX96.toString()).div(Q96).pow(2), 'price and price limit')
  const expectedAmountOut = await calcSlippage(hydratedPool, swapParams, token2.decimals)
  swapParams.amountOutMinimum = parseUnits(Big(expectedAmountOut).mul(1 - (MAX_SLIPPAGE_PERCENT/100)).toFixed(0), token2.decimals)
  
  console.log(swapParams)
  console.log({ ...hydratedPool, abi: 'Redacted', expectedAmountOut })
  
  
  await requireApproval()
  
  await executeTransaction(swapParams)
}

main()
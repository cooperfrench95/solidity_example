import { network } from 'hardhat';
import { erc20Abi, parseUnits, Address, getContract, walletActions } from 'viem';
import nfpmABI from '../external_contracts/uniswap/nfpm.json'
import { DateTime } from 'luxon';

const NFPM_ADDRESS = '0x1238536071E1c677A632429e3655c799b22cDA52' as Address; 

const WETH_ADDRESS = '0xfff9976782d46cc05630d1f6ebab18b2324d6b14';
const COOPCOIN = '0xBbeC911437A633e39B17d73230Ed02e6627c0ABe';
const AUD = '0x251A516C36726A70Ec95eBb4D17073550d63C16e';
const POOL_FEE = 500;
const TICK_SPACING = 10;

const DYLAN_POOL_ADDRESS = '0xE1bD97caE5f8F7b2400bbA40d0F3F65a4Ff5B22D'


const MIN_DIVISIBLE_TICK = Math.ceil(-887272 / TICK_SPACING) * TICK_SPACING;
const MAX_DIVISIBLE_TICK = Math.floor(887272 / TICK_SPACING) * TICK_SPACING;

const WETH_TO_DEPOSIT = parseUnits('0.002', 18);
const WETH_TO_APPROVE = parseUnits('0.004', 18);
const AUD_TO_DEPOSIT = parseUnits('30', 18);
const AUD_TO_APPROVE = parseUnits('35', 18);
const COOP_TO_DEPOSIT = parseUnits('100', 18);
const COOP_TO_APPROVE = parseUnits('200', 18);


const { viem } = await network.connect({
  network: "sepolia",
  chainType: "l1",
});

console.log('Connected to network')

const publicClient = await viem.getPublicClient()
const [senderClient] = await viem.getWalletClients()


async function fillPool({ 
  tokenA,
  tokenB,
  tokenASupply,
  tokenBSupply,
  tokenAApprove,
  tokenBApprove,
  isEth = false
}: {
  tokenA: Address,
  tokenB: Address,
  tokenASupply: bigint,
  tokenBSupply: bigint, 
  tokenAApprove: bigint,
  tokenBApprove: bigint,
  isEth?: boolean
}) {
  
  // The token thought of as "token 0" or "token A" depends on alphanumeric sorting of the two addresses
  const sorted = [
    tokenA,
    tokenB
  ].sort((a, b) => {
    if (a < b) return -1; 
    if (a > b) return 1;
    return 0;
  });
  
  const token0 = sorted[0]
  const token1 = sorted[1]

  const token0Supply = sorted[0] === tokenA ? tokenASupply : tokenBSupply
  const token1Supply = sorted[0] === tokenA ? tokenBSupply : tokenASupply

  if (isEth) {
    const tokenAIsETH = tokenA === WETH_ADDRESS
    // Native ETH gets handled differently due to the wrapping
    if (tokenAIsETH) {
      // Approve Token B
      await senderClient.writeContract({
          address: tokenB,
          abi: erc20Abi,
          functionName: 'approve',
          args: [NFPM_ADDRESS, tokenBApprove],
          account: senderClient.account,
      });
    }
    else {
      // Approve Token A
      await senderClient.writeContract({
          address: tokenA,
          abi: erc20Abi,
          functionName: 'approve',
          args: [NFPM_ADDRESS, tokenAApprove],
          account: senderClient.account,
      });
    }
  }
  else {
    // Approve Token A
    await senderClient.writeContract({
      address: tokenA,
      abi: erc20Abi,
      functionName: 'approve',
      args: [NFPM_ADDRESS, tokenAApprove],
      account: senderClient.account,
    });
    
    // Approve Token B
    await senderClient.writeContract({
        address: tokenB,
        abi: erc20Abi,
        functionName: 'approve',
        args: [NFPM_ADDRESS, tokenBApprove],
        account: senderClient.account,
    });
  }

  const nfpmContract = await getContract({
    address: NFPM_ADDRESS,
    abi: nfpmABI,
    client: { public: publicClient, wallet: senderClient },
  });

  const mintParams = {
    token0, 
    token1,
    fee: POOL_FEE,
    tickLower: MIN_DIVISIBLE_TICK,
    tickUpper: MAX_DIVISIBLE_TICK,
    amount0Desired: token0Supply, 
    amount1Desired: token1Supply,
    amount0Min: 0n,
    amount1Min: 0n,
    recipient: senderClient.account.address,
    deadline: BigInt(DateTime.now().plus({ minutes: 10 }).toUnixInteger()),
  };

  const token0IsEth = token0 === WETH_ADDRESS

  const mintHash = await nfpmContract.write.mint(
    [mintParams],
    {
      account: senderClient.account.address,
      value: isEth ? (
        token0IsEth ? token0Supply : token1Supply
      ) : undefined
    } 
  );

  const receipt = await publicClient.waitForTransactionReceipt({ hash: mintHash });
  console.log('Minted position receipt', receipt)
}

async function main() {
  // // WETH/AUD
  // await fillPool({
  //   tokenA: WETH_ADDRESS,
  //   tokenB: AUD,
  //   tokenASupply: WETH_TO_DEPOSIT,
  //   tokenBSupply: AUD_TO_DEPOSIT,
  //   tokenAApprove: WETH_TO_APPROVE,
  //   tokenBApprove: AUD_TO_APPROVE,
  //   isEth: true,
  // })
  // AUD/COOP
  await fillPool({
    tokenA: AUD,
    tokenB: COOPCOIN,
    tokenASupply: AUD_TO_DEPOSIT,
    tokenBSupply: COOP_TO_DEPOSIT,
    tokenAApprove: AUD_TO_APPROVE,
    tokenBApprove: COOP_TO_APPROVE,
  })
    // WETH/COOP
  await fillPool({
    tokenA: WETH_ADDRESS,
    tokenB: COOPCOIN,
    tokenASupply: WETH_TO_DEPOSIT,
    tokenBSupply: COOP_TO_DEPOSIT,
    tokenAApprove: WETH_TO_APPROVE,
    tokenBApprove: COOP_TO_APPROVE,
    isEth: true,
  })
}

main()
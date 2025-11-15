import * as dotenv from 'dotenv';

// Load env vars
dotenv.config();

import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import hardhatViem from '@nomicfoundation/hardhat-viem';
import hardhatViemAssertions from '@nomicfoundation/hardhat-viem-assertions';
import { defineConfig } from "hardhat/config";

const config = defineConfig({
  plugins: [hardhatToolboxViemPlugin, hardhatViem, hardhatViemAssertions],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: process.env.SEPOLIA_RPC_URL as string,
      accounts: [process.env.SEPOLIA_PRIVATE_KEY as string],
    },
  },
});

export default config
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CoopCoinModule", (m) => {
  const CoopCoin = m.contract("CoopCoin");

  return { CoopCoin };
});

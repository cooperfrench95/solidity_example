import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("GetsIncrementedModule", (m) => {
  const GetsIncremented = m.contract("GetsIncremented");

  return { GetsIncremented };
});

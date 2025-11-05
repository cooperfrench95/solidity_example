import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

describe("GetsIncremented", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  it("Should emit the Incremented event when times_called gets incremented", async function () {
    const c = await viem.deployContract("GetsIncremented");
    const [wallet] = await viem.getWalletClients()

    await viem.assertions.emitWithArgs(
      c.write.increment({
        account: wallet.account.address,
      }),
      c,
      "Incremented",
      [(addr: string) => addr.toLowerCase() === wallet.account.address]
    );
  });

  it("checkCalls returns the correct number of calls and emitted increment events", async function () {
    const c = await viem.deployContract("GetsIncremented");
    const deploymentBlockNumber = await publicClient.getBlockNumber();

    // run a series of increments
    for (let i = 1n; i <= 10n; i++) {
      await c.write.increment();
    }

    const events = await publicClient.getContractEvents({
      address: c.address,
      abi: c.abi,
      eventName: "Incremented",
      fromBlock: deploymentBlockNumber,
      strict: true,
    });

    // check that the aggregated events match the current value
    let total = 0;
    for (const event of events) {
      total += 1;
    }

    const checkCallsValue = await c.read.checkCalls();
    const variableValue = await c.read.times_called();
    assert.equal(total, checkCallsValue);
    assert.equal(total, variableValue);
  });

  it("sum() adds two ints together and returns them", async function () {
    const c = await viem.deployContract("GetsIncremented");

    const x = 100
    const y = 1000
    const expectedResult = 1100n
    const answer = await c.read.sum([x, y])

    assert.equal(expectedResult, answer);
  });
});

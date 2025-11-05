// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {GetsIncremented} from "./GetsIncremented.sol";
import {Test} from "forge-std/Test.sol";

contract GetsIncrementedTest is Test {
    GetsIncremented c;

    function setUp() public {
        c = new GetsIncremented();
    }

    function test_InitialValue() public view {
        // times_called() is a getter automatically created by the contract
        require(c.times_called() == 0, "Initial value should be 0");

        // checkCalls is our own getter we implemented
        require(c.checkCalls() == 0, "Initial value should be 0");
    }

    function testSum(uint32 x, uint32 y) public view {
        uint64 answer = uint64(x) + uint64(y);
        require(c.sum(x, y) == answer, "Sum function should sum two integers");
    }

    function testIncrement(uint8 times) public {
        for (uint8 i = 0; i < times; i++) {
            c.increment();
        }

        require(
            c.checkCalls() == times,
            "Should equal the amount of times it was incremented"
        );
    }
}

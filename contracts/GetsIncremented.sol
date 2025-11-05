// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract GetsIncremented {
    // State variable, stored on the blockchain and persistent between calls to the contract
    // This implicitly creates a getter function times_called()
    uint32 public times_called;

    // Logs an event when emitted. Here we define the arguments to the log function.
    // This log is cheaper than block storage for the contract and gets baked into the transaction receipt
    event Incremented(address indexed fromAddress);

    // Constructor only called when contract first deployed
    constructor() {
        times_called = 0;
    }

    // Changes state and costs gas to call.
    function increment() public {
        times_called++;
        emit Incremented(msg.sender);
    }

    // "view" marks this as readonly - it cannot change the state
    // This function is kinda pointless since the getter already gets created when intialising the state
    function checkCalls() public view returns (uint32) {
        return times_called;
    }

    // "pure" makes this a static function with no access to the contract's state - can't even read it
    function sum(uint32 num1, uint32 num2) public pure returns (uint64) {
        uint64 result = uint64(num1) + uint64(num2);
        return result;
    }
}

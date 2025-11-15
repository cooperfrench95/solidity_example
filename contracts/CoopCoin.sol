// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

contract CoopCoin is ERC20, ERC20Capped {
    uint256 private constant TOKEN_DECIMALS = 18;
    uint256 private constant INITIAL_SUPPLY = 1702 * (10 ** TOKEN_DECIMALS); // 1702 tokens
    uint256 private constant MAX_SUPPLY = 10_000;
    uint256 private constant CAP_AMOUNT = MAX_SUPPLY * (10 ** TOKEN_DECIMALS);
    uint256 private constant TOP_UP_AMOUNT = 100 * (10 ** TOKEN_DECIMALS);

    event ToppedUp(address indexed toAddress);

    constructor() ERC20("CoopCoin", "COOP") ERC20Capped(CAP_AMOUNT) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    function issueMeSomeTokens() public {
        _mint(msg.sender, TOP_UP_AMOUNT);
        emit ToppedUp(msg.sender);
    }

    // Necessary because ERC20Capped declares _update differently to ERC20
    // We need to provide our own definition, overriding the inherited methods
    function _update(
        address from,
        address to,
        uint256 value
    ) internal virtual override(ERC20, ERC20Capped) {
        super._update(from, to, value);
    }
}

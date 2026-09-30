// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @dev Mirrors the TIP-20 memo surface (6 decimals, memo'd transfers) for local tests.
contract MockTIP20 is ERC20Permit {
    event TransferWithMemo(address indexed from, address indexed to, uint256 amount, bytes32 indexed memo);

    constructor() ERC20("Mock USD", "mUSD") ERC20Permit("Mock USD") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function transferWithMemo(address to, uint256 amount, bytes32 memo) external {
        _transfer(msg.sender, to, amount);
        emit TransferWithMemo(msg.sender, to, amount, memo);
    }

    function transferFromWithMemo(address from, address to, uint256 amount, bytes32 memo) external returns (bool) {
        _spendAllowance(from, msg.sender, amount);
        _transfer(from, to, amount);
        emit TransferWithMemo(from, to, amount, memo);
        return true;
    }
}

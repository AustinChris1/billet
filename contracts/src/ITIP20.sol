// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Subset of Tempo's TIP-20 precompile interface (tempoxyz/tempo crates/contracts/src/precompiles/tip20.rs).
interface ITIP20 {
    function transferFromWithMemo(address from, address to, uint256 amount, bytes32 memo) external returns (bool);
    function transferWithMemo(address to, uint256 amount, bytes32 memo) external;
    function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)
        external;
    function balanceOf(address account) external view returns (uint256);
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @title Pip Token
/// @notice Fixed-supply ERC-20 for Avalanche C-Chain.
/// The entire supply is minted once, in the constructor, to the allocation
/// addresses. There is no owner, no mint function, no pause, no blacklist and
/// no transfer tax, so nobody (including the deployer) can change balances
/// or supply after deployment. Holders can burn their own tokens.
contract PipToken is ERC20, ERC20Burnable, ERC20Permit {
    error LengthMismatch();
    error NoRecipients();
    error ZeroAmount();

    constructor(
        string memory name_,
        string memory symbol_,
        address[] memory recipients,
        uint256[] memory amounts
    ) ERC20(name_, symbol_) ERC20Permit(name_) {
        if (recipients.length != amounts.length) revert LengthMismatch();
        if (recipients.length == 0) revert NoRecipients();
        for (uint256 i = 0; i < recipients.length; i++) {
            if (amounts[i] == 0) revert ZeroAmount();
            // _mint reverts on the zero address.
            _mint(recipients[i], amounts[i]);
        }
    }
}

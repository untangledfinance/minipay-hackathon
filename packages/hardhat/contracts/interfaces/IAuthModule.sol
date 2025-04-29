// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

interface IAuthModule {
    function authenticate(address user) external view returns (bool);
}

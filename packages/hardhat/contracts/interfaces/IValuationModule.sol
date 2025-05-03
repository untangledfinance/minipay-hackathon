// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

interface IValuationModule {
    function addAsset(
        address asset,
        uint256 decimals,
        address priceOracle,
        bytes memory getPriceCall
    ) external;

    function updateAsset(address) external;
    function portfolioValue() external view returns (uint256);
}

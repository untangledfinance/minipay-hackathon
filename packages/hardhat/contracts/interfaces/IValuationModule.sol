// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

interface IValuationModule {
    struct AssetInfo {
        uint256 balance;
        uint256 price;
        uint chainId;
        uint8 decimals;
        address oracle;
    }

    event AssetAdded(
        address asset,
        address oracle,
        uint256 chainId,
        uint256 timestamp
    );
    event AssetRemoved(address asset, uint256 timestamp);
    event AssetUpdated(
        address asset,
        address oracle,
        uint256 balance,
        uint256 price,
        uint256 decimals,
        uint256 timestamp
    );

    event OracleUpdated(address asset, address newOracle, uint256 timestamp);

    error AssetExisted(address asset);
    error InvalidChainId();
    error InvalidOracle();
    error InvalidAsset();
    error NoAssetFound(address asset);
    error CrosschainDisabled();
    error OnlyCrosschainModule(address caller, address crosschainModule);
    error InvalidCaller(address caller);

    function portfolioValue() external view returns (uint256);

    function addAsset(
        address asset,
        address oracle,
        uint256 chainId
    ) external payable;

    function removeAsset(address asset) external;

    function updateAsset(address asset) external payable;

    function forceUpdate(address asset, uint256 amount) external;

    function fulfillUpdateRequest(
        address asset,
        uint256 balance,
        uint256 price,
        uint8 decimals
    ) external;

    function updateOracle(address asset, address newOracle) external;
}

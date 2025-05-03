// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {IValuationModule} from "./interfaces/IValuationModule.sol";

import {IVault} from "./interfaces/IVault.sol";

contract Valuation {
    struct AssetInfo {
        uint256 decimals;
        address priceOracle;
        bytes getPriceCall;
    }

    error AssetAlreadyExists(address asset);
    error AssetNotFound(address asset);
    error PriceCallFailed(address asset);
    error BalanceCallFailed(address asset);
    error Unauthorized(address asset);
    error InvalidPriceMethod(address asset, bytes4 method);
    error ZeroAddress();

    address public immutable vault;
    address public immutable treasury;

    mapping(address => AssetInfo) public assetsInfo;
    address[] public assets;

    constructor(address _vault) {
        vault = _vault;
        treasury = IVault(_vault).getTreasury();
    }

    modifier onlyTreasury() {
        require(msg.sender == treasury, "AsyncWithdraw: Only Treasury");
        _;
    }

    modifier onlyVault() {
        require(msg.sender == vault, "AsyncWithdraw: Only Vault");
        _;
    }

    function addAsset(
        address asset,
        uint256 decimals,
        address priceOracle,
        bytes memory getPriceCall
    ) external onlyTreasury {
        if (asset == address(0)) {
            revert ZeroAddress();
        }

        if (assetsInfo[asset].priceOracle != address(0)) {
            revert AssetAlreadyExists(asset);
        }

        assets.push(asset);

        assetsInfo[asset] = AssetInfo({
            decimals: decimals,
            priceOracle: priceOracle,
            getPriceCall: getPriceCall
        });
    }

    function assetValue(address asset) public view returns (uint256 value) {
        AssetInfo memory assetInfo = assetsInfo[asset];
        if (assetInfo.priceOracle == address(0)) {
            revert AssetNotFound(asset);
        }

        uint256 balance = getBalance(asset);
        uint256 price = getPrice(asset);

        value = (balance * price) / 10 ** assetInfo.decimals;
    }

    function getBalance(address asset) public view returns (uint256 balance) {
        (bool _getBalance, bytes memory balanceData) = asset.staticcall(
            abi.encodeWithSelector(0x70a08231, treasury)
        );
        if (!_getBalance) {
            revert BalanceCallFailed(asset);
        }
        balance = abi.decode(balanceData, (uint256));
    }

    function getPrice(address asset) public view returns (uint256 price) {
        AssetInfo memory assetInfo = assetsInfo[asset];
        if (assetInfo.priceOracle == address(0)) {
            revert AssetNotFound(asset);
        }
        (bool _getPrice, bytes memory priceData) = assetInfo
            .priceOracle
            .staticcall(assetInfo.getPriceCall);
        if (!_getPrice) {
            revert PriceCallFailed(asset);
        }
        price = abi.decode(priceData, (uint256));
    }

    function portfolioValue() external view returns (uint256 totalValue) {
        for (uint256 i = 0; i < assets.length; i++) {
            totalValue += assetValue(assets[i]);
        }
    }

    function updateAsset(address) external onlyVault {}
}

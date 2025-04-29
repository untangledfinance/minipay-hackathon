// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

interface ICrosschainModule {
    event CrosschainDeposit(
        address asset,
        uint256 amount,
        address receiver,
        uint256 chainId
    );

    event NewRemoteTreasury(
        address newRemoteTreasury,
        uint chainId,
        uint256 timestamp
    );

    event CrosschainHookUpdated(
        address hookAddress,
        bool state,
        uint256 timestamp
    );

    error NotApprovedByGateway();
    error InvalidSourceAddress();
    error AlreadySet();

    function execute(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload
    ) external;

    function requestUpdateAsset(
        address asset,
        address oracle,
        uint256 chainId
    ) external payable;
}

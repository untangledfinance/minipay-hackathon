// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

interface IVault {
    event ModuleUpdated(
        address moduleAddress,
        uint256 moduleType,
        uint256 timestamp
    );
    event FeeClaimed(uint256 amount, address beneficiary, uint256 timestamp);
    event ForceBurn(uint256 shares, uint256 timestamp);
    event ForceMint(address receiver, uint256 shares, uint256 timestamp);
    event SetLockDeposit(bool state, uint256 timestamp);

    error Unauthorized(address user);
    error OnlyWithdrawModule();
    error InsufficientBalance(uint256 amount, uint256 balance);
    error OnlyFeeModule();
    error OnlyCrosschainModule();
    error InvalidBeneficiary();
    error WithdrawModuleInitialized(address withdrawModule);
    error InvalidModuleType(uint256 moduleType);
    error LengthMismatch();
    error DepositLocked();
    error AlreadySet();

    function requestRedeem(
        uint256 shares,
        address sender,
        address owner
    ) external;

    function forceMint(address receiver, uint256 amount) external;

    function forceBurn(uint256 shares) external;

    function getTreasury() external view returns (address);

    function claimFee(uint256 amount, address beneficiary) external;

    function getModules()
        external
        view
        returns (address, address, address, address, address);
}

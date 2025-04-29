// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

interface IFeeModule {
    event FeeUpdated(uint256 feeIndex, uint256 timestamp);
    event BeneficiaryUpdated(address newBeneficiary, uint256 timestamp);

    error InvalidFeeIndex();
    error InvalidBeneficiary();

    function accrueFee() external;

    function claimFee() external;

    function setFeeIndex(uint256 newFeeIndex) external;

    function setBeneficiary(address newBeneficiary) external;

    function getFeeAccrued() external view returns (uint256);
}

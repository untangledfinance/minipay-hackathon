// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;
import {IERC20, ERC20, ERC4626, SafeERC20} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

import {IVault} from "./interfaces/IVault.sol";
import {IERC7540Redeem} from "./interfaces/IAsyncModule.sol";
import {IAuthModule} from "./interfaces/IAuthModule.sol";
import {IValuationModule} from "./interfaces/IValuationModule.sol";
import {IFeeModule} from "./interfaces/IFeeModule.sol";
import {ITreasury} from "./interfaces/ITreasury.sol";

contract Keeper {
    constructor(IERC20 underlying) {
        underlying.approve(msg.sender, type(uint256).max);
    }
}

contract Vault is ERC4626, IVault {
    address public treasury;

    // module addresses
    address withdrawModule;
    address valuationModule;
    address authModule;
    address feeModule;
    address crosschainModule;

    address public claimableKeeper;

    bool public lockDeposit;

    constructor(
        address _asset,
        string memory _name,
        string memory _symbol,
        address _safeWalet
    ) ERC4626(IERC20(_asset)) ERC20(_name, _symbol) {
        treasury = _safeWalet;
        claimableKeeper = treasury;
    }

    modifier onlyTreasury() {
        require(msg.sender == treasury, "Vault: Only Treasury");
        _;
    }

    // inheritdoc ERC20
    function transfer(
        address to,
        uint256 value
    ) public override(ERC20, IERC20) returns (bool) {
        if (
            authModule != address(0) &&
            !IAuthModule(authModule).authenticate(to)
        ) revert Unauthorized(to);

        address owner = _msgSender();
        _transfer(owner, to, value);
        return true;
    }

    // inheritdoc ERC20
    function transferFrom(
        address from,
        address to,
        uint256 value
    ) public override(ERC20, IERC20) returns (bool) {
        if (
            authModule != address(0) &&
            !IAuthModule(authModule).authenticate(to)
        ) revert Unauthorized(to);

        address spender = _msgSender();
        _spendAllowance(from, spender, value);
        _transfer(from, to, value);
        return true;
    }

    /**
     * @dev Return the total value of the assets that the vault is currently holding, minus the fee (if have) accured within this vault.
     */
    function totalAssets() public view override returns (uint256) {
        uint256 fee;
        uint256 totalValue;
        if (feeModule != address(0)) {
            fee = IFeeModule(feeModule).getFeeAccrued();
        }

        if (valuationModule != address(0)) {
            totalValue = IValuationModule(valuationModule).portfolioValue();
        } else {
            totalValue = getVaultBalance();
        }

        return totalValue - fee;
    }

    /**
     * @dev Override the original function to apply authentication condition (if have) on the receiver.
     * @param caller address of the caller
     * @param receiver address of the share receiver
     * @param assets amount of assets to be deposited
     * @param shares amount of shares to be minted
     */
    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal override {
        if (lockDeposit) revert DepositLocked();
        // checking KYC condition
        if (
            authModule != address(0) &&
            !IAuthModule(authModule).authenticate(receiver)
        ) revert Unauthorized(receiver);

        if (feeModule != address(0)) {
            IFeeModule(feeModule).accrueFee();
        }

        SafeERC20.safeTransferFrom(IERC20(asset()), caller, treasury, assets);

        _mint(receiver, shares);

        ITreasury(treasury).useDeposit(assets);

        if (valuationModule != address(0)) {
            IValuationModule(valuationModule).updateAsset(asset());
        }

        emit Deposit(caller, receiver, assets, shares);
    }

    /**
     * @dev Override the original function to apply asynchronous withdraw (if enabled)
     * @param caller address of the caller
     * @param receiver address of the receiver
     * @param owner address of the owner of the share
     * @param assets amount of asset to be withdrawn
     * @param shares amount of share to be burned
     */
    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal override {
        if (feeModule != address(0)) {
            IFeeModule(feeModule).accrueFee();
        }

        if (caller != owner) {
            _spendAllowance(owner, caller, shares);
        }

        if (withdrawModule != address(0) && msg.sender != withdrawModule)
            revert OnlyWithdrawModule();

        _burn(owner, shares);

        SafeERC20.safeTransferFrom(
            IERC20(asset()),
            claimableKeeper,
            receiver,
            assets
        );

        if (valuationModule != address(0)) {
            IValuationModule(valuationModule).updateAsset(asset());
        }

        emit Withdraw(caller, receiver, owner, assets, shares);
    }

    /**
     * @dev function to transfer share from owner to Keeper contract when create redeem request.
     * @notice can only be call from withdraw module contract
     * @param shares amount of share to be transferred to the Keeper contract
     * @param sender address of the sender
     * @param owner address of share's owner
     */
    function requestRedeem(
        uint256 shares,
        address sender,
        address owner
    ) external {
        if (msg.sender != withdrawModule) {
            revert OnlyWithdrawModule();
        }
        if (owner != sender) {
            _spendAllowance(owner, sender, shares);
        }

        _update(
            owner,
            IERC7540Redeem(withdrawModule).getPendingKeeper(),
            shares
        );
    }

    /**
     * @dev function to burn when fulfill the redeem request at the end of epoch
     * @param shares the amount of share to be burned
     */
    function forceBurn(uint256 shares) external {
        if (msg.sender != withdrawModule) revert OnlyWithdrawModule();
        address pendingKeeper = IERC7540Redeem(withdrawModule)
            .getPendingKeeper();

        _burn(pendingKeeper, shares);
        emit ForceBurn(shares, block.timestamp);
    }

    /**
     * @dev function to mint share for a receiver of a crosschain deposit.
     * @notice can only be call from crosschain module
     * @param receiver address of the share receiver
     * @param shares the amount of share to be minted
     */
    function forceMint(address receiver, uint256 shares) external {
        if (msg.sender != crosschainModule) revert OnlyCrosschainModule();

        _mint(receiver, shares);

        emit ForceMint(receiver, shares, block.timestamp);
    }

    /**
     * function to claim fee that is accrued within this vault.
     * @param amount amount of underlying asset to be claimed
     * @param beneficiary address of the fee's beneficiary
     */
    function claimFee(uint256 amount, address beneficiary) external {
        if (msg.sender != feeModule) revert OnlyFeeModule();

        uint256 vaultBalance = getVaultBalance();
        if (amount > vaultBalance)
            revert InsufficientBalance(amount, vaultBalance);
        if (beneficiary == address(0)) revert InvalidBeneficiary();

        SafeERC20.safeTransferFrom(
            IERC20(asset()),
            treasury,
            beneficiary,
            amount
        );

        emit FeeClaimed(amount, beneficiary, block.timestamp);
    }

    /**
     * return the current balance of the treasury that holding Vault's fund.
     */
    function getVaultBalance() public view returns (uint256) {
        return ERC20(asset()).balanceOf(treasury);
    }

    function getTreasury() public view returns (address) {
        return treasury;
    }

    function _setModule(address newModuleAddress, uint256 moduleType) internal {
        if (moduleType == 0) {
            withdrawModule = newModuleAddress;
        } else if (moduleType == 1) {
            valuationModule = newModuleAddress;
        } else if (moduleType == 2) {
            authModule = newModuleAddress;
        } else if (moduleType == 3) {
            feeModule = newModuleAddress;
        } else if (moduleType == 4) {
            crosschainModule = newModuleAddress;
        } else {
            revert InvalidModuleType(moduleType);
        }
        emit ModuleUpdated(newModuleAddress, moduleType, block.timestamp);
    }

    function setModule(
        address newModuleAddress,
        uint256 moduleType
    ) external onlyTreasury {
        _setModule(newModuleAddress, moduleType);
    }

    function setLockDeposit(bool state) external onlyTreasury {
        if (lockDeposit == state) revert AlreadySet();

        lockDeposit = state;

        emit SetLockDeposit(state, block.timestamp);
    }

    function setModules(
        address[] memory moduleAddresses,
        uint256[] memory moduleTypes
    ) external onlyTreasury {
        if (moduleAddresses.length != moduleTypes.length)
            revert LengthMismatch();

        for (uint256 i = 0; i < moduleAddresses.length; i++) {
            _setModule(moduleAddresses[i], moduleTypes[i]);
        }
    }

    function getModules()
        external
        view
        returns (address, address, address, address, address)
    {
        return (
            withdrawModule,
            valuationModule,
            authModule,
            feeModule,
            crosschainModule
        );
    }
}

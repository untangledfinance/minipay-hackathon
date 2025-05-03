pragma solidity 0.8.22;
// SPDX-License-Identifier: MIT
import {IERC20, ERC20, ERC4626, SafeERC20} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IVault} from "./interfaces/IVault.sol";
import {IERC7540Redeem} from "./interfaces/IAsyncModule.sol";
import {ITreasury} from "./interfaces/ITreasury.sol";
import {IValuationModule} from "./interfaces/IValuationModule.sol";
import {BytesLib} from "./libraries/BytesLib.sol";

contract Treasury is ITreasury {
    using BytesLib for bytes;

    struct Call {
        address target;
        bytes4 selector;
        bytes conditions;
        bytes mask;
    }

    event CallApproved(
        bytes32 indexed callId,
        address indexed target,
        bytes4 indexed selector,
        bytes conditions,
        bytes mask
    );

    event CallExecuted(
        bytes32 indexed callId,
        address indexed target,
        bytes4 indexed selector,
        bytes data
    );

    error CallAlreadyApproved(bytes32 callId);
    error CallNotApproved(bytes32 callId);
    error TargetDoesNotMatch(
        bytes32 callId,
        address target,
        address expectedTarget
    );
    error SelectorDoesNotMatch(
        bytes32 callId,
        bytes4 selector,
        bytes4 expectedSelector
    );
    error ConditionNotMet(bytes32 callId, bytes4 selector, bytes callData);
    error Unauthorized(address sender, address expectedSender);

    address public vault;
    address public owner;
    address public curator;
    address public asset;

    mapping(bytes32 => bool) public approvedCalls;
    mapping(bytes32 => Call) public calls;

    uint256 public totalAllocationRate;
    mapping(address => uint256) public allocationRates;

    function initialize(address _asset) external {
        require(owner == address(0), "Already initialized");
        owner = msg.sender;
        curator = msg.sender;
        asset = _asset;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized(msg.sender, owner);
        _;
    }

    modifier onlyVault() {
        if (msg.sender != vault) revert Unauthorized(msg.sender, vault);
        _;
    }

    modifier onlyCuratorOrOwner() {
        if (msg.sender != curator && msg.sender != owner)
            revert Unauthorized(msg.sender, curator);
        _;
    }

    function setAllocationRate(
        address target,
        uint256 rate
    ) public onlyCuratorOrOwner {
        require(
            totalAllocationRate - allocationRates[target] + rate <= 100,
            "Total allocation rate exceeds 100%"
        );
        totalAllocationRate =
            totalAllocationRate -
            allocationRates[target] +
            rate;
        allocationRates[target] = rate;
    }

    function getCallId(
        address _target,
        bytes4 _selector,
        bytes memory _conditions,
        bytes memory _mask
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(_target, _selector, _conditions, _mask));
    }

    function addApprovedCall(
        address _target,
        bytes4 _selector,
        bytes memory _conditions,
        bytes memory _mask
    ) external onlyOwner {
        bytes32 callId = getCallId(_target, _selector, _conditions, _mask);
        if (approvedCalls[callId]) {
            revert CallAlreadyApproved(callId);
        }
        approvedCalls[callId] = true;
        calls[callId] = Call(_target, _selector, _conditions, _mask);

        emit CallApproved(callId, _target, _selector, _conditions, _mask);
    }

    function call(
        address _target,
        bytes4 _selector,
        bytes memory _data,
        bytes32 callId
    ) public onlyCuratorOrOwner {
        if (!approvedCalls[callId]) {
            revert CallNotApproved(callId);
        }

        Call memory callData = calls[callId];
        if (_target != callData.target) {
            revert TargetDoesNotMatch(callId, _target, callData.target);
        }
        if (_selector != callData.selector) {
            revert SelectorDoesNotMatch(callId, _selector, callData.selector);
        }

        if (
            !BytesLib.compareCondition(
                _data,
                callData.conditions,
                callData.mask
            )
        ) revert ConditionNotMet(callId, _selector, _data);

        (bool success, ) = _target.call(
            abi.encodeWithSelector(_selector, _data)
        );
        if (!success) {
            revert("Call failed");
        }

        emit CallExecuted(callId, _target, _selector, _data);
    }

    function setVault(address _vault) external onlyOwner {
        require(vault == address(0), "Vault already set");
        vault = _vault;
        IERC20(asset).approve(_vault, type(uint256).max);
    }

    function setValuationModule(address valuationModule) external onlyOwner {
        IVault(vault).setModule(valuationModule, 1);
    }

    // function setAllocationRate(uint256 _allocationRate) external onlyOwner {
    //     require(_allocationRate > 0, "Allocation rate must be greater than 0");
    //     require(
    //         _allocationRate <= 100,
    //         "Allocation rate must be less than or equal to 100"
    //     );
    //     allocationRate = _allocationRate;
    // }

    function useDeposit(uint256 assets) external onlyVault {
        require(assets > 0, "Assets must be greater than 0");
        address target0 = 0x3E59A31363E2ad014dcbc521c4a0d5757d9f3402;
        uint256 allocation0 = (assets * allocationRates[target0]) / 100;
        {
            (bool approveCall, ) = asset.call(
                abi.encodeWithSelector(bytes4(0x095ea7b3), target0, allocation0)
            );
            require(approveCall, "Approve0 call failed");

            (bool depositCall, ) = target0.call(
                abi.encodeWithSelector(
                    bytes4(0xe8eda9df),
                    asset,
                    allocation0,
                    address(this),
                    0
                )
            );
            require(depositCall, "Deposit0 call failed");
        }

        address target1 = 0x2A68c98bD43AA24331396F29166aeF2Bfd51343f;
        uint256 allocation1 = (assets * allocationRates[target1]) / 100;
        {
            (bool approveCall, ) = asset.call(
                abi.encodeWithSelector(bytes4(0x095ea7b3), target1, allocation1)
            );

            require(approveCall, "Approve1 call failed");

            (bool depositCall, ) = target1.call(
                abi.encodeWithSelector(
                    bytes4(0x6e553f65),
                    allocation1,
                    address(this)
                )
            );
            require(depositCall, "Deposit1 call failed");
        }
    }

    function withdraw0(uint256 assets) external onlyOwner {
        require(assets > 0, "Assets must be greater than 0");
        address target0 = 0x3E59A31363E2ad014dcbc521c4a0d5757d9f3402;
        address aToken = 0xFF8309b9e99bfd2D4021bc71a362aBD93dBd4785;

        // approve aToken to be spent by pool
        (bool approveCall, ) = aToken.call(
            abi.encodeWithSelector(bytes4(0x095ea7b3), target0, assets)
        );
        // withdraw from pool
        require(approveCall, "Approve call failed");
        (bool withdrawCall, ) = target0.call(
            abi.encodeWithSelector(
                bytes4(0x69328dec),
                asset,
                assets,
                address(this)
            )
        );
        require(withdrawCall, "Withdraw call failed");
    }

    function withdraw1(uint256 shares) external onlyOwner {
        require(shares > 0, "Assets must be greater than 0");
        address target1 = 0x3EaF7d86EaEe61d1c25bA4a68c2b5E291F209dc5;
        (bool withdrawCall, ) = target1.call(
            abi.encodeWithSelector(
                bytes4(0x7d41c86e),
                shares,
                address(this),
                address(this)
            )
        );
        require(withdrawCall, "Withdraw call failed");
    }

    function addAsset(
        address _asset,
        uint256 decimals,
        address priceOracle,
        bytes memory getPriceCall
    ) external onlyOwner {
        (, address valuation, , , ) = IVault(vault).getModules();
        IValuationModule(valuation).addAsset(
            _asset,
            decimals,
            priceOracle,
            getPriceCall
        );
    }

    // function withdrawInvestment(uint256 shares) external onlyOwner {
    //     (address withdrawModule, , , , ) = IVault(target).getModules();
    //     if (withdrawModule != address(0)) {
    //         IERC7540Redeem(withdrawModule).requestRedeem(
    //             shares,
    //             address(this),
    //             address(this)
    //         );
    //     } else {
    //         IERC20(target).approve(target, shares);
    //         ERC4626(target).redeem(shares, address(this), address(this));
    //     }
    // }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4) {
        return
            bytes4(
                keccak256(
                    "onERC1155Received(address,address,uint256,uint256,bytes)"
                )
            );
    }
}

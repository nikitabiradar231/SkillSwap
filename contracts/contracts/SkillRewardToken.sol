// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SkillRewardToken (SKILL)
 * @notice ERC-20 token rewarding peer mentors and dedicated learners upon verified skill completions.
 */
contract SkillRewardToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18; // 100M tokens
    uint256 public constant FAUCET_AMOUNT = 100 * 10**18;      // 100 tokens max per faucet request

    error MaxSupplyExceeded();
    error InvalidAddress();
    error FaucetCooldownActive();
    error FaucetAmountExceeded();

    mapping(address => uint256) public lastFaucetRequest;

    event TokensRewarded(address indexed mentor, address indexed learner, uint256 mentorAmount, uint256 learnerAmount);
    event FaucetDripped(address indexed recipient, uint256 amount);

    constructor(address defaultAdmin) ERC20("SkillS Community Token", "SKILL") {
        if (defaultAdmin == address(0)) revert InvalidAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(MINTER_ROLE, defaultAdmin);

        // Initial ecosystem pool: 1,000,000 SKILL to defaultAdmin
        _mint(defaultAdmin, 1_000_000 * 10**decimals());
    }

    /**
     * @notice Mint rewards for mentor and learner upon verified session completion.
     * @dev Restricted to MINTER_ROLE (e.g. SkillProtocolRegistry).
     */
    function rewardParticipation(
        address mentor,
        address learner,
        uint256 mentorAmount,
        uint256 learnerAmount
    ) external onlyRole(MINTER_ROLE) {
        if (mentor == address(0) || learner == address(0)) revert InvalidAddress();

        if (totalSupply() + mentorAmount + learnerAmount > MAX_SUPPLY) {
            revert MaxSupplyExceeded();
        }

        if (mentorAmount > 0) {
            _mint(mentor, mentorAmount);
        }
        if (learnerAmount > 0) {
            _mint(learner, learnerAmount);
        }

        emit TokensRewarded(mentor, learner, mentorAmount, learnerAmount);
    }

    /**
     * @notice Testnet community faucet allowing users to request test tokens once every 24 hours.
     */
    function requestFaucet(address recipient) external {
        if (recipient == address(0)) revert InvalidAddress();
        if (block.timestamp < lastFaucetRequest[recipient] + 1 days) {
            revert FaucetCooldownActive();
        }
        if (totalSupply() + FAUCET_AMOUNT > MAX_SUPPLY) {
            revert MaxSupplyExceeded();
        }

        lastFaucetRequest[recipient] = block.timestamp;
        _mint(recipient, FAUCET_AMOUNT);

        emit FaucetDripped(recipient, FAUCET_AMOUNT);
    }

    /**
     * @notice Direct mint for authorized admin/governance.
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (to == address(0)) revert InvalidAddress();
        if (totalSupply() + amount > MAX_SUPPLY) revert MaxSupplyExceeded();
        _mint(to, amount);
    }
}

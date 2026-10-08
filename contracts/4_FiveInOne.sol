// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DGFiveInOne
 * @notice On-chain counterpart of the "6-in-1" button in the DGDreams UI: it
 *         records that a wallet completed each of the six steps (Check-in, GM,
 *         GN, Simple, Token, NFT), so the run is provable without trusting the UI.
 *
 * Deliberately dependency-free — deployer/deploy-all.mjs compiles each
 * contract as a single-file standard-json input with no import resolver.
 *
 * Every step is idempotent per wallet per UTC day, so re-running the sequence
 * costs gas but cannot double-count. Uses no post-Paris opcodes.
 *
 * History: shipped as 5 steps (GM, GN, Simple, Token, NFT). Check-in was
 * appended as STEP_CHECKIN = 5 (STEP_COUNT 5 -> 6); existing indices 0-4 are
 * unchanged so data recorded by the old version keeps its meaning.
 */
contract DGFiveInOne {
    address public deployer;

    /// day bucket -> wallet -> step -> done
    mapping(uint256 => mapping(address => mapping(uint8 => bool))) public done;
    /// total steps recorded across all wallets and days
    uint256 public actionCount;

    uint8 public constant STEP_GM = 0;
    uint8 public constant STEP_GN = 1;
    uint8 public constant STEP_SIMPLE = 2;
    uint8 public constant STEP_TOKEN = 3;
    uint8 public constant STEP_NFT = 4;
    uint8 public constant STEP_CHECKIN = 5;
    uint8 public constant STEP_COUNT = 6;

    event Step(address indexed wallet, uint8 indexed step, uint256 indexed day);
    event AllDone(address indexed wallet, uint256 indexed day);

    constructor() {
        deployer = msg.sender;
    }

    function gm() external {
        _mark(msg.sender, STEP_GM);
    }

    function gn() external {
        _mark(msg.sender, STEP_GN);
    }

    function simple() external {
        _mark(msg.sender, STEP_SIMPLE);
    }

    function token() external {
        _mark(msg.sender, STEP_TOKEN);
    }

    function nft() external {
        _mark(msg.sender, STEP_NFT);
    }

    function checkIn() external {
        _mark(msg.sender, STEP_CHECKIN);
    }

    /// Record a step by index, for callers that prefer one entry point.
    function mark(uint8 step) external {
        require(step < STEP_COUNT, "bad step");
        _mark(msg.sender, step);
    }

    /// How many of the six steps this wallet has completed today (UTC day).
    // Public, not external: allDoneToday() and _mark() call this and stepsDoneOn()
    // from inside the contract, and an external function is not reachable by a
    // plain name internally — it would need a `this.` call plus a gas-hungry hop.
    function stepsDoneToday(address wallet) public view returns (uint256 count) {
        uint256 day = block.timestamp / 1 days;
        for (uint8 i = 0; i < STEP_COUNT; i++) {
            if (done[day][wallet][i]) count++;
        }
    }

    function allDoneToday(address wallet) external view returns (bool) {
        return stepsDoneToday(wallet) == STEP_COUNT;
    }

    /// Same check for an arbitrary day (pass block.timestamp to mean today).
    function stepsDoneOn(address wallet, uint256 day) public view returns (uint256 count) {
        for (uint8 i = 0; i < STEP_COUNT; i++) {
            if (done[day][wallet][i]) count++;
        }
    }

    function allDoneOn(address wallet, uint256 day) external view returns (bool) {
        return stepsDoneOn(wallet, day) == STEP_COUNT;
    }

    function _mark(address wallet, uint8 step) private {
        uint256 day = block.timestamp / 1 days;
        if (done[day][wallet][step]) return; // already recorded today
        done[day][wallet][step] = true;
        actionCount++;
        emit Step(wallet, step, day);
        if (stepsDoneOn(wallet, day) == STEP_COUNT) {
            emit AllDone(wallet, day);
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NikBase is ReentrancyGuard {
    address public owner;
    bool public paused;

    uint256 public constant MAX_SPINS = 3;
    uint256 public constant MAX_ACTIONS = 15;
    uint256 public constant REPEAT_3 = 3;

    mapping(address => uint256) public streaks;
    mapping(address => uint256) public totalCheckIns;
    mapping(address => uint256) public lastActionDay;
    mapping(address => uint256) public actionCount;
    mapping(address => bool) public checkedIn;
    mapping(address => bool) public receptionDone;
    mapping(address => bool) public gmDone;
    mapping(address => bool) public gnDone;
    mapping(address => uint256) public doseCount;
    mapping(address => uint256) public moodCount;
    mapping(address => uint256) public sanitizeCount;
    mapping(address => uint256) public counterCount;
    mapping(address => uint256) public spinCount;

    error Unauthorized();
    error ContractPaused();
    error AlreadyDone();
    error LimitReached();
    error NotAllowed();
    error AlreadyExecutedToday();
    error InvalidMood();

    event CheckedIn(address indexed user, uint256 streak);
    event Reception(address indexed user);
    event GM(address indexed user);
    event GN(address indexed user);
    event DoseTaken(address indexed user);
    event MoodCheck(address indexed user, string mood);
    event Sanitized(address indexed user);
    event CounterIncremented(address indexed user, uint256 count);
    event SpinCompleted(address indexed user, uint256 result);
    event DailyTasksExecuted(address indexed user);
    event Paused(address account);
    event Unpaused(address account);

    modifier onlyOwner() { if (msg.sender != owner) revert Unauthorized(); _; }
    modifier whenNotPaused() { if (paused) revert ContractPaused(); _; }

    modifier resetDay() {
        uint256 day = block.timestamp / 1 days;
        if (lastActionDay[msg.sender] != day) {
            _resetState(msg.sender, day);
        }
        _;
    }

    constructor() { owner = msg.sender; }

    function _resetState(address user, uint256 day) internal {
        lastActionDay[user] = day;
        checkedIn[user] = false;
        receptionDone[user] = false;
        gmDone[user] = false;
        gnDone[user] = false;
        doseCount[user] = 0;
        moodCount[user] = 0;
        sanitizeCount[user] = 0;
        counterCount[user] = 0;
        spinCount[user] = 0;
        actionCount[user] = 0;
    }

    function _validMood(string calldata mood) internal pure returns (bool) {
        bytes32 h = keccak256(bytes(mood));
        return h == keccak256(bytes("happy"))
            || h == keccak256(bytes("sad"))
            || h == keccak256(bytes("angry"))
            || h == keccak256(bytes("surprised"));
    }

    // ──────────────────────────────────────────────
    //  BATCH: all 15 tasks in ONE transaction
    // ──────────────────────────────────────────────

    function executeDailyTasks(string[3] calldata moods)
        external
        whenNotPaused
        nonReentrant
    {
        uint256 day = block.timestamp / 1 days;
        if (lastActionDay[msg.sender] != day) {
            _resetState(msg.sender, day);
        }
        if (actionCount[msg.sender] > 0) revert AlreadyExecutedToday();

        for (uint256 i = 0; i < moods.length; i++) {
            if (!_validMood(moods[i])) revert InvalidMood();
        }

        _execCheckIn(day);
        _execReception();
        _execGM();
        _execGN();

        for (uint256 i = 0; i < REPEAT_3; i++) {
            _execDose();
            _execMood(moods[i]);
            _execSanitize();
            _execCounter();
            _execSpin(i);
        }

        actionCount[msg.sender] = MAX_ACTIONS;
        emit DailyTasksExecuted(msg.sender);
    }

    function _execCheckIn(uint256 day) internal {
        uint256 s = streaks[msg.sender];
        if (s > 0 && s < day - 1) s = 0;
        unchecked { s += 1; }
        streaks[msg.sender] = s;
        unchecked { totalCheckIns[msg.sender] += 1; }
        checkedIn[msg.sender] = true;
        emit CheckedIn(msg.sender, s);
    }

    function _execReception() internal {
        receptionDone[msg.sender] = true;
        emit Reception(msg.sender);
    }

    function _execGM() internal {
        gmDone[msg.sender] = true;
        emit GM(msg.sender);
    }

    function _execGN() internal {
        gnDone[msg.sender] = true;
        emit GN(msg.sender);
    }

    function _execDose() internal {
        unchecked { doseCount[msg.sender] += 1; }
        emit DoseTaken(msg.sender);
    }

    function _execMood(string calldata mood) internal {
        unchecked { moodCount[msg.sender] += 1; }
        emit MoodCheck(msg.sender, mood);
    }

    function _execSanitize() internal {
        unchecked { sanitizeCount[msg.sender] += 1; }
        emit Sanitized(msg.sender);
    }

    function _execCounter() internal {
        unchecked { counterCount[msg.sender] += 1; }
        emit CounterIncremented(msg.sender, counterCount[msg.sender]);
    }

    function _execSpin(uint256 index) internal {
        unchecked { spinCount[msg.sender] += 1; }
        uint256 result = uint256(
            keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender, index))
        ) % 100;
        emit SpinCompleted(msg.sender, result);
    }

    // ──────────────────────────────────────────────
    //  INDIVIDUAL ACTIONS (backward compatible)
    // ──────────────────────────────────────────────

    function dailyCheckIn() external whenNotPaused resetDay returns (uint256) {
        if (checkedIn[msg.sender]) revert AlreadyDone();
        if (actionCount[msg.sender] >= MAX_ACTIONS) revert LimitReached();
        uint256 day = block.timestamp / 1 days;
        if (streaks[msg.sender] > 0 && streaks[msg.sender] < day - 1) streaks[msg.sender] = 0;
        unchecked { streaks[msg.sender] += 1; totalCheckIns[msg.sender] += 1; }
        checkedIn[msg.sender] = true;
        unchecked { actionCount[msg.sender] += 1; }
        emit CheckedIn(msg.sender, streaks[msg.sender]);
        return streaks[msg.sender];
    }

    function reception() external whenNotPaused resetDay {
        if (receptionDone[msg.sender]) revert AlreadyDone();
        if (actionCount[msg.sender] >= MAX_ACTIONS) revert LimitReached();
        receptionDone[msg.sender] = true;
        unchecked { actionCount[msg.sender] += 1; }
        emit Reception(msg.sender);
    }

    function gm() external whenNotPaused resetDay {
        if (gmDone[msg.sender]) revert AlreadyDone();
        if (actionCount[msg.sender] >= MAX_ACTIONS) revert LimitReached();
        gmDone[msg.sender] = true;
        unchecked { actionCount[msg.sender] += 1; }
        emit GM(msg.sender);
    }

    function gn() external whenNotPaused resetDay {
        if (gnDone[msg.sender]) revert AlreadyDone();
        if (actionCount[msg.sender] >= MAX_ACTIONS) revert LimitReached();
        gnDone[msg.sender] = true;
        unchecked { actionCount[msg.sender] += 1; }
        emit GN(msg.sender);
    }

    function takeDose() external whenNotPaused resetDay {
        if (doseCount[msg.sender] >= REPEAT_3) revert LimitReached();
        if (actionCount[msg.sender] >= MAX_ACTIONS) revert LimitReached();
        unchecked { doseCount[msg.sender] += 1; actionCount[msg.sender] += 1; }
        emit DoseTaken(msg.sender);
    }

    function moodCheck(string calldata _mood) external whenNotPaused resetDay {
        if (moodCount[msg.sender] >= REPEAT_3) revert LimitReached();
        if (actionCount[msg.sender] >= MAX_ACTIONS) revert LimitReached();
        if (!_validMood(_mood)) revert NotAllowed();
        unchecked { moodCount[msg.sender] += 1; actionCount[msg.sender] += 1; }
        emit MoodCheck(msg.sender, _mood);
    }

    function sanitizeWallet() external whenNotPaused resetDay {
        if (sanitizeCount[msg.sender] >= REPEAT_3) revert LimitReached();
        if (actionCount[msg.sender] >= MAX_ACTIONS) revert LimitReached();
        unchecked { sanitizeCount[msg.sender] += 1; actionCount[msg.sender] += 1; }
        emit Sanitized(msg.sender);
    }

    function incrementCounter() external whenNotPaused resetDay {
        if (counterCount[msg.sender] >= REPEAT_3) revert LimitReached();
        if (actionCount[msg.sender] >= MAX_ACTIONS) revert LimitReached();
        unchecked { counterCount[msg.sender] += 1; actionCount[msg.sender] += 1; }
        emit CounterIncremented(msg.sender, counterCount[msg.sender]);
    }

    function luckySpin() external whenNotPaused resetDay returns (uint256) {
        if (spinCount[msg.sender] >= MAX_SPINS) revert LimitReached();
        if (actionCount[msg.sender] >= MAX_ACTIONS) revert LimitReached();
        unchecked { spinCount[msg.sender] += 1; actionCount[msg.sender] += 1; }
        uint256 result = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender, spinCount[msg.sender]))) % 100;
        emit SpinCompleted(msg.sender, result);
        return result;
    }

    // ──────────────────────────────────────────────
    //  OWNER / PAUSE
    // ──────────────────────────────────────────────

    function pause() external onlyOwner { paused = true; emit Paused(msg.sender); }
    function unpause() external onlyOwner { paused = false; emit Unpaused(msg.sender); }
    function transferOwnership(address newOwner) external onlyOwner { if (newOwner == address(0)) revert NotAllowed(); owner = newOwner; }

    // ──────────────────────────────────────────────
    //  VIEW FUNCTIONS
    // ──────────────────────────────────────────────

    function getActionCounts(address user) external view returns (uint256 actCount, uint256 dose, uint256 mood, uint256 sanitize, uint256 counter, uint256 spin) {
        uint256 day = block.timestamp / 1 days;
        if (lastActionDay[user] != day) return (0, 0, 0, 0, 0, 0);
        return (actionCount[user], doseCount[user], moodCount[user], sanitizeCount[user], counterCount[user], spinCount[user]);
    }

    function getFlags(address user) external view returns (bool cIn, bool rec, bool gmDone_, bool gnDone_) {
        uint256 day = block.timestamp / 1 days;
        if (lastActionDay[user] != day) return (false, false, false, false);
        return (checkedIn[user], receptionDone[user], gmDone[user], gnDone[user]);
    }

    function getUserData(address user) external view returns (uint256, uint256, uint256) {
        return (streaks[user], totalCheckIns[user], 0);
    }

    function canCheckIn() external view returns (bool) {
        uint256 day = block.timestamp / 1 days;
        if (lastActionDay[msg.sender] != day) return true;
        return !checkedIn[msg.sender] && actionCount[msg.sender] < MAX_ACTIONS;
    }

    function getSpinsRemaining() external view returns (uint256) {
        uint256 day = block.timestamp / 1 days;
        if (lastActionDay[msg.sender] != day) return MAX_SPINS;
        if (actionCount[msg.sender] >= MAX_ACTIONS) return 0;
        return MAX_SPINS - spinCount[msg.sender];
    }

    function hasExecutedBatch(address user) external view returns (bool) {
        uint256 day = block.timestamp / 1 days;
        return lastActionDay[user] == day && actionCount[user] >= MAX_ACTIONS;
    }

    function version() external pure returns (string memory) { return "NikBase v3.0.0"; }
}

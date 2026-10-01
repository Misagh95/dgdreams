// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice v3.1.0 — fixes streak logic (streak was compared to the day number,
///         so it reset to 1 on every check-in). Streak now tracks lastCheckInDay.
contract NikBase is ReentrancyGuard {
    address public owner;
    bool public paused;

    uint256 public constant MAX_SPINS = 3;
    uint256 public constant MAX_ACTIONS = 15;
    uint256 public constant REPEAT_3 = 3;

    mapping(address => uint256) public streaks;
    mapping(address => uint256) public totalCheckIns;
    mapping(address => uint256) public lastActionDay;
    mapping(address => uint256) public lastCheckInDay; // NEW
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
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() { if (msg.sender != owner) revert Unauthorized(); _; }
    modifier whenNotPaused() { if (paused) revert ContractPaused(); _; }

    modifier resetDay() {
        uint256 day = _today();
        if (lastActionDay[msg.sender] != day) _resetState(msg.sender, day);
        _;
    }

    constructor() { owner = msg.sender; }

    function _today() internal view returns (uint256) { return block.timestamp / 1 days; }

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

    /// @dev Single source of truth for streak math.
    ///      Consecutive day  -> streak + 1
    ///      Missed >= 1 day  -> streak restarts at 1
    function _bumpStreak(uint256 day) internal returns (uint256 s) {
        uint256 last = lastCheckInDay[msg.sender];
        s = (last != 0 && last + 1 == day) ? streaks[msg.sender] + 1 : 1;
        streaks[msg.sender] = s;
        lastCheckInDay[msg.sender] = day;
        unchecked { totalCheckIns[msg.sender] += 1; }
        checkedIn[msg.sender] = true;
        emit CheckedIn(msg.sender, s);
    }

    /// @dev Streak as it should be displayed right now (0 if it already expired).
    function _liveStreak(address user) internal view returns (uint256) {
        uint256 last = lastCheckInDay[user];
        if (last == 0 || last + 1 < _today()) return 0;
        return streaks[user];
    }

    function _validMood(string calldata mood) internal pure returns (bool) {
        bytes32 h = keccak256(bytes(mood));
        return h == keccak256(bytes("happy"))
            || h == keccak256(bytes("sad"))
            || h == keccak256(bytes("angry"))
            || h == keccak256(bytes("surprised"));
    }

    // ──────────────────────────────────────────────
    // BATCH: all 15 tasks in ONE transaction
    // ──────────────────────────────────────────────

    function executeDailyTasks(string[3] calldata moods) external whenNotPaused nonReentrant {
        uint256 day = _today();
        if (lastActionDay[msg.sender] != day) _resetState(msg.sender, day);
        if (actionCount[msg.sender] > 0) revert AlreadyExecutedToday();

        for (uint256 i = 0; i < moods.length; i++) {
            if (!_validMood(moods[i])) revert InvalidMood();
        }

        _bumpStreak(day);
        receptionDone[msg.sender] = true; emit Reception(msg.sender);
        gmDone[msg.sender] = true;        emit GM(msg.sender);
        gnDone[msg.sender] = true;        emit GN(msg.sender);

        for (uint256 i = 0; i < REPEAT_3; i++) {
            unchecked {
                doseCount[msg.sender] += 1;
                moodCount[msg.sender] += 1;
                sanitizeCount[msg.sender] += 1;
                counterCount[msg.sender] += 1;
                spinCount[msg.sender] += 1;
            }
            emit DoseTaken(msg.sender);
            emit MoodCheck(msg.sender, moods[i]);
            emit Sanitized(msg.sender);
            emit CounterIncremented(msg.sender, counterCount[msg.sender]);
            emit SpinCompleted(msg.sender, _spin(i));
        }

        actionCount[msg.sender] = MAX_ACTIONS;
        emit DailyTasksExecuted(msg.sender);
    }

    function _spin(uint256 salt) internal view returns (uint256) {
        // NOTE: not secure randomness. Fine for a cosmetic spin, never for prizes.
        return uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender, salt))) % 100;
    }

    // ──────────────────────────────────────────────
    // INDIVIDUAL ACTIONS
    // ──────────────────────────────────────────────

    function dailyCheckIn() external whenNotPaused resetDay returns (uint256) {
        if (checkedIn[msg.sender]) revert AlreadyDone();
        if (actionCount[msg.sender] >= MAX_ACTIONS) revert LimitReached();
        uint256 s = _bumpStreak(_today());
        unchecked { actionCount[msg.sender] += 1; }
        return s;
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
        if (!_validMood(_mood)) revert InvalidMood();
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
        uint256 result = _spin(spinCount[msg.sender]);
        emit SpinCompleted(msg.sender, result);
        return result;
    }

    // ──────────────────────────────────────────────
    // OWNER / PAUSE
    // ──────────────────────────────────────────────

    function pause() external onlyOwner { paused = true; emit Paused(msg.sender); }
    function unpause() external onlyOwner { paused = false; emit Unpaused(msg.sender); }
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert NotAllowed();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ──────────────────────────────────────────────
    // VIEW FUNCTIONS (same signatures as v3.0.0)
    // ──────────────────────────────────────────────

    function getActionCounts(address user) external view returns (uint256 actCount, uint256 dose, uint256 mood, uint256 sanitize, uint256 counter, uint256 spin) {
        if (lastActionDay[user] != _today()) return (0, 0, 0, 0, 0, 0);
        return (actionCount[user], doseCount[user], moodCount[user], sanitizeCount[user], counterCount[user], spinCount[user]);
    }

    function getFlags(address user) external view returns (bool cIn, bool rec, bool gmDone_, bool gnDone_) {
        if (lastActionDay[user] != _today()) return (false, false, false, false);
        return (checkedIn[user], receptionDone[user], gmDone[user], gnDone[user]);
    }

    /// @return streak live streak (0 if expired), totalCheckIns, lastCheckInDay
    function getUserData(address user) external view returns (uint256, uint256, uint256) {
        return (_liveStreak(user), totalCheckIns[user], lastCheckInDay[user]);
    }

    function canCheckIn() external view returns (bool) {
        if (lastActionDay[msg.sender] != _today()) return true;
        return !checkedIn[msg.sender] && actionCount[msg.sender] < MAX_ACTIONS;
    }

    function getSpinsRemaining() external view returns (uint256) {
        if (lastActionDay[msg.sender] != _today()) return MAX_SPINS;
        if (actionCount[msg.sender] >= MAX_ACTIONS) return 0;
        return MAX_SPINS - spinCount[msg.sender];
    }

    function hasExecutedBatch(address user) external view returns (bool) {
        return lastActionDay[user] == _today() && actionCount[user] >= MAX_ACTIONS;
    }

    function version() external pure returns (string memory) { return "NikBase v3.1.0"; }
}

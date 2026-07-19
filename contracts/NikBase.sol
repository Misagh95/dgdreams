// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract NikBase {
    address public owner;
    bool public paused;

    uint256 public constant MAX_SPINS = 3;
    uint256 public constant MAX_ACTIONS = 15;

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

    event CheckedIn(address indexed user, uint256 streak);
    event Reception(address indexed user);
    event GM(address indexed user);
    event GN(address indexed user);
    event DoseTaken(address indexed user);
    event MoodCheck(address indexed user, string mood);
    event Sanitized(address indexed user);
    event CounterIncremented(address indexed user, uint256 count);
    event SpinCompleted(address indexed user, uint256 result);
    event Paused(address account);
    event Unpaused(address account);

    modifier onlyOwner() { if (msg.sender != owner) revert Unauthorized(); _; }
    modifier whenNotPaused() { if (paused) revert ContractPaused(); _; }

    modifier resetDay() {
        uint256 day = block.timestamp / 1 days;
        if (lastActionDay[msg.sender] != day) {
            lastActionDay[msg.sender] = day;
            checkedIn[msg.sender] = false;
            receptionDone[msg.sender] = false;
            gmDone[msg.sender] = false;
            gnDone[msg.sender] = false;
            doseCount[msg.sender] = 0;
            moodCount[msg.sender] = 0;
            sanitizeCount[msg.sender] = 0;
            counterCount[msg.sender] = 0;
            spinCount[msg.sender] = 0;
            actionCount[msg.sender] = 0;
        }
        _;
    }

    constructor() { owner = msg.sender; }

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
        if (doseCount[msg.sender] >= 3) revert LimitReached();
        if (actionCount[msg.sender] >= MAX_ACTIONS) revert LimitReached();
        unchecked { doseCount[msg.sender] += 1; actionCount[msg.sender] += 1; }
        emit DoseTaken(msg.sender);
    }

    function moodCheck(string calldata _mood) external whenNotPaused resetDay {
        if (moodCount[msg.sender] >= 3) revert LimitReached();
        if (actionCount[msg.sender] >= MAX_ACTIONS) revert LimitReached();
        bytes32 h = keccak256(bytes(_mood));
        if (h != keccak256(bytes("happy")) && h != keccak256(bytes("sad")) && h != keccak256(bytes("angry")) && h != keccak256(bytes("surprised"))) revert NotAllowed();
        unchecked { moodCount[msg.sender] += 1; actionCount[msg.sender] += 1; }
        emit MoodCheck(msg.sender, _mood);
    }

    function sanitizeWallet() external whenNotPaused resetDay {
        if (sanitizeCount[msg.sender] >= 3) revert LimitReached();
        if (actionCount[msg.sender] >= MAX_ACTIONS) revert LimitReached();
        unchecked { sanitizeCount[msg.sender] += 1; actionCount[msg.sender] += 1; }
        emit Sanitized(msg.sender);
    }

    function incrementCounter() external whenNotPaused resetDay {
        if (counterCount[msg.sender] >= 3) revert LimitReached();
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

    function pause() external onlyOwner { paused = true; emit Paused(msg.sender); }
    function unpause() external onlyOwner { paused = false; emit Unpaused(msg.sender); }
    function transferOwnership(address newOwner) external onlyOwner { if (newOwner == address(0)) revert NotAllowed(); owner = newOwner; }

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

    function version() external pure returns (string memory) { return "NikBase v2.1.0"; }
}

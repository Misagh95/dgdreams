// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract LitePrediction {
    struct Prediction {
        bool outcome; // true = YES, false = NO
        uint256 amount;
        bool claimed;
    }

    struct Market {
        uint256 id;
        string question;
        uint256 yesPool;
        uint256 noPool;
        uint256 resolvesAt;
        bool resolved;
        bool outcome; // true = YES won, false = NO won
        address creator;
    }

    uint256 public nextId;
    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Prediction)) public predictions;

    event MarketCreated(uint256 indexed id, string question, uint256 resolvesAt, address creator);
    event Predicted(uint256 indexed id, address indexed user, bool outcome, uint256 amount);
    event Resolved(uint256 indexed id, bool outcome);

    constructor() {
        nextId = 1;
    }

    function createMarket(string calldata _question, uint256 _resolvesAt) external {
        require(_resolvesAt > block.timestamp, "resolvesAt must be future");
        uint256 id = nextId++;
        markets[id] = Market(id, _question, 0, 0, _resolvesAt, false, false, msg.sender);
        emit MarketCreated(id, _question, _resolvesAt, msg.sender);
    }

    function predict(uint256 _id, bool _outcome) external payable {
        require(msg.value > 0, "stake must be > 0");
        Market storage m = markets[_id];
        require(_id > 0 && _id < nextId, "market not found");
        require(!m.resolved, "already resolved");
        require(block.timestamp < m.resolvesAt, "market expired");
        Prediction storage p = predictions[_id][msg.sender];
        require(p.amount == 0, "already predicted");

        p.outcome = _outcome;
        p.amount = msg.value;
        if (_outcome) {
            m.yesPool += msg.value;
        } else {
            m.noPool += msg.value;
        }
        emit Predicted(_id, msg.sender, _outcome, msg.value);
    }

    function resolveMarket(uint256 _id, bool _outcome) external {
        Market storage m = markets[_id];
        require(_id > 0 && _id < nextId, "market not found");
        require(!m.resolved, "already resolved");
        require(msg.sender == m.creator, "only creator can resolve");
        require(block.timestamp >= m.resolvesAt, "market not yet expired");

        m.resolved = true;
        m.outcome = _outcome;
        emit Resolved(_id, _outcome);
    }

    function claim(uint256 _id) external {
        Market storage m = markets[_id];
        require(m.resolved, "not resolved yet");
        Prediction storage p = predictions[_id][msg.sender];
        require(p.amount > 0, "no prediction");
        require(!p.claimed, "already claimed");

        uint256 pool = m.outcome == true ? m.yesPool : m.noPool;
        uint256 totalWinningPool = m.outcome == true ? (m.yesPool + m.noPool) : (m.noPool + m.yesPool);
        require(pool > 0, "no winners");

        p.claimed = true;
        uint256 reward = (p.amount * totalWinningPool) / pool;
        payable(msg.sender).transfer(reward);
    }

    function getMarket(uint256 _id) external view returns (Market memory) {
        return markets[_id];
    }

    function getPrediction(uint256 _id, address _user) external view returns (Prediction memory) {
        return predictions[_id][_user];
    }

    function getActiveMarkets() external view returns (Market[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i < nextId; i++) {
            if (!markets[i].resolved) count++;
        }
        Market[] memory result = new Market[](count);
        uint256 idx = 0;
        for (uint256 i = 1; i < nextId; i++) {
            if (!markets[i].resolved) {
                result[idx++] = markets[i];
            }
        }
        return result;
    }
}

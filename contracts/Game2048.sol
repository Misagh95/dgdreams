// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Game2048 {
    event PlayRecorded(address indexed user, uint256 score, uint256 moves);

    mapping(address => uint256) public playCount;
    mapping(address => uint256) public highScore;

    function recordPlay(uint256 _score, uint256 _moves) external {
        playCount[msg.sender]++;
        if (_score > highScore[msg.sender]) {
            highScore[msg.sender] = _score;
        }
        emit PlayRecorded(msg.sender, _score, _moves);
    }
}

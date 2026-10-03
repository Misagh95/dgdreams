// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * One-click edition of the 5-in-1 runner's three deployables.
 *
 * These are intentionally NOT the full-featured SimpleToken / SimpleNft /
 * LitePrediction contracts. Deployment cost is dominated by code size, at
 * 200 gas per byte of runtime code, plus the creation calldata at 16 gas per
 * non-zero byte. Every unused function is paid for on every deployment, so
 * these three carry only what the one-click flow exercises.
 *
 * Sizes and gas are measured by `node scripts/measure-deploy-cost.mjs`.
 */

/**
 * @title DGDemo
 * @notice The "Simple" step of the 5-in-1 runner: a greeter that counts calls.
 * @dev Dependency-free and 639 bytes at deploy time. No owner, no admin
 *      functions, no revert strings, nothing that would be billed on every run.
 */
contract DGDemo {
    string public greeting;
    uint256 public calls;

    event Greeted(address indexed caller, uint256 indexed callNumber);

    constructor(string memory greeting_) {
        greeting = greeting_;
    }

    function gm() external returns (string memory) {
        calls++;
        emit Greeted(msg.sender, calls);
        return greeting;
    }
}

/**
 * @title DGLiteToken
 * @notice The "Token" step of the 5-in-1 runner: a minimal ERC-20.
 * @dev Own, transfer, approve, transferFrom, nothing else. Custom errors
 *      instead of revert strings, and unchecked arithmetic on the hot paths.
 *      Constructor shape: (string name, string symbol, uint256 initialSupply).
 */
contract DGLiteToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    error InsufficientBalance();
    error InsufficientAllowance();

    constructor(string memory name_, string memory symbol_, uint256 initialSupply) {
        name = name_;
        symbol = symbol_;
        totalSupply = initialSupply;
        if (initialSupply > 0) {
            balanceOf[msg.sender] = initialSupply;
            emit Transfer(address(0), msg.sender, initialSupply);
        }
    }

    function transfer(address to, uint256 value) external returns (bool) {
        uint256 bal = balanceOf[msg.sender];
        if (bal < value) revert InsufficientBalance();
        unchecked {
            balanceOf[msg.sender] = bal - value;
        }
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            if (allowed < value) revert InsufficientAllowance();
            unchecked {
                allowance[from][msg.sender] = allowed - value;
            }
        }
        uint256 bal = balanceOf[from];
        if (bal < value) revert InsufficientBalance();
        unchecked {
            balanceOf[from] = bal - value;
        }
        balanceOf[to] += value;
        emit Transfer(from, to, value);
        return true;
    }
}

/**
 * @title DGLiteNft
 * @notice The "NFT" step of the 5-in-1 runner: a minimal ERC-721.
 * @dev The single biggest byte saver here is dropping the on-chain tokenURI
 *      string building, and the uint-to-string helper it drags in with it.
 *      Metadata is served off-chain instead, so this contract only tracks
 *      ownership. Constructor shape: (string name, string symbol).
 */
contract DGLiteNft {
    string public name;
    string public symbol;

    uint256 public totalSupply;
    mapping(uint256 => address) private _ownerOf;
    mapping(address => uint256) private _balanceOf;
    mapping(uint256 => address) private _approved;

    event Transfer(address indexed from, address indexed to, uint256 indexed id);
    event Approval(address indexed owner, address indexed approved, uint256 indexed id);

    error NotAuthorized();
    error NotOwner();

    constructor(string memory name_, string memory symbol_) {
        name = name_;
        symbol = symbol_;
    }

    function balanceOf(address owner) external view returns (uint256) {
        return _balanceOf[owner];
    }

    function ownerOf(uint256 id) public view returns (address) {
        address owner = _ownerOf[id];
        if (owner == address(0)) revert NotOwner();
        return owner;
    }

    function approve(address spender, uint256 id) external {
        address owner = ownerOf(id);
        if (msg.sender != owner) revert NotAuthorized();
        _approved[id] = spender;
        emit Approval(owner, spender, id);
    }

    function mint(address to) external returns (uint256) {
        unchecked {
            totalSupply++;
        }
        uint256 id = totalSupply;
        _ownerOf[id] = to;
        _balanceOf[to]++;
        emit Transfer(address(0), to, id);
        return id;
    }

    function transferFrom(address from, address to, uint256 id) external {
        address owner = ownerOf(id);
        if (msg.sender != owner && msg.sender != _approved[id]) revert NotAuthorized();
        unchecked {
            _balanceOf[from]--;
        }
        _balanceOf[to]++;
        delete _approved[id];
        _ownerOf[id] = to;
        emit Transfer(from, to, id);
    }
}

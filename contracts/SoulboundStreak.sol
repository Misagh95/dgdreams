// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

/** Minimal view of the daily-mission contract (NikBase). */
interface INikBase {
    function getActionCounts(address user)
        external
        view
        returns (uint256 actCount, uint256 dose, uint256 mood, uint256 sanitize, uint256 counter, uint256 spin);

    function getUserData(address user)
        external
        view
        returns (uint256 streak, uint256 totalCheckIns, uint256 totalAct);
}

/**
 * @title SoulboundStreak
 * @notice Non-transferable streak badge. Anyone who completes the full daily
 *         mission set (GM + Check + GN) on the paired NikBase contract can
 *         mint exactly one badge, paying only gas. Tier and streak are read
 *         live from NikBase, so the badge always mirrors on-chain activity.
 */
contract SoulboundStreak is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    using Base64 for bytes;
    // ── tiers ──────────────────────────────────────────────────────────
    uint8 public constant TIER_NONE = 0;
    uint8 public constant TIER_BRONZE = 1;
    uint8 public constant TIER_SILVER = 2;
    uint8 public constant TIER_GOLD = 3;
    uint8 public constant TIER_DIAMOND = 4;
    uint8 public constant TIER_LEGEND = 5;

    uint256 public constant STREAK_SILVER = 7;
    uint256 public constant STREAK_GOLD = 30;
    uint256 public constant STREAK_DIAMOND = 100;
    uint256 public constant STREAK_LEGEND = 365;

    /// Daily actions required before minting (GM + Check + GN).
    uint256 public constant MIN_TODAY_ACTIONS = 3;

    INikBase public immutable nikBase;
    string public constant VERSION = "1.0.0";

    uint256 private _nextId = 1;

    struct TierData {
        uint8 tier;
        uint256 streak;
    }

    /// user => tokenId (0 = no badge)
    mapping(address => uint256) public userTokenId;
    /// tokenId => tier + streak at mint/upgrade time
    mapping(uint256 => TierData) public tokenData;

    error SoulboundToken();
    error AlreadyMinted();
    error NoBadge();
    error MissionsIncomplete(uint256 done, uint256 required);
    error NoStreak();
    error ZeroAddress();
    error NoTierUpgrade(uint8 current, uint8 updated);

    event BadgeMinted(address indexed user, uint256 indexed tokenId, uint8 tier, uint256 streak);
    event BadgeUpgraded(address indexed user, uint256 indexed tokenId, uint8 fromTier, uint8 toTier, uint256 streak);

    constructor(address nikBaseAddress, address initialOwner)
        ERC721("DGDreams Streak Badge", "DGSB")
        Ownable(initialOwner)
    {
        if (nikBaseAddress == address(0) || initialOwner == address(0)) revert ZeroAddress();
        nikBase = INikBase(nikBaseAddress);
    }

    // ── mint / upgrade ────────────────────────────────────────────────
    /// Mint the caller's badge. Permissionless, gas only, one per wallet.
    function mint() external nonReentrant {
        if (userTokenId[msg.sender] != 0) revert AlreadyMinted();

        (uint256 streak, ) = _userStreak(msg.sender);
        if (streak == 0) revert NoStreak();

        uint256 done = _todayActions(msg.sender);
        if (done < MIN_TODAY_ACTIONS) revert MissionsIncomplete(done, MIN_TODAY_ACTIONS);

        uint8 tier = _tierFor(streak);
        uint256 tokenId = _nextId++;

        userTokenId[msg.sender] = tokenId;
        tokenData[tokenId] = TierData({tier: tier, streak: streak});

        _safeMint(msg.sender, tokenId);
        emit BadgeMinted(msg.sender, tokenId, tier, streak);
    }

    /// Refresh the caller's badge to their current streak/tier.
    function upgrade() external nonReentrant {
        uint256 tokenId = userTokenId[msg.sender];
        if (tokenId == 0) revert NoBadge();

        (uint256 streak, ) = _userStreak(msg.sender);
        if (streak == 0) revert NoStreak();

        uint8 updated = _tierFor(streak);
        uint8 current = tokenData[tokenId].tier;
        if (updated <= current) revert NoTierUpgrade(current, updated);

        tokenData[tokenId] = TierData({tier: updated, streak: streak});
        emit BadgeUpgraded(msg.sender, tokenId, current, updated, streak);
    }

    function _userStreak(address user) private view returns (uint256 streak, uint256 checkIns) {
        try nikBase.getUserData(user) returns (uint256 s, uint256 c, uint256) {
            return (s, c);
        } catch {
            return (0, 0);
        }
    }

    function _todayActions(address user) private view returns (uint256) {
        try nikBase.getActionCounts(user) returns (uint256 actCount, uint256, uint256, uint256, uint256, uint256) {
            return actCount;
        } catch {
            return 0;
        }
    }

    function _tierFor(uint256 streak) private pure returns (uint8) {
        if (streak == 0) return TIER_NONE;
        if (streak >= STREAK_LEGEND) return TIER_LEGEND;
        if (streak >= STREAK_DIAMOND) return TIER_DIAMOND;
        if (streak >= STREAK_GOLD) return TIER_GOLD;
        if (streak >= STREAK_SILVER) return TIER_SILVER;
        return TIER_BRONZE;
    }

    // ── soulbound ─────────────────────────────────────────────────────
    // Every ERC721 transfer path funnels through _update, so blocking
    // owner-to-owner moves here is enough to make the badge non-transferable
    // (no need to override each transfer function individually).
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert SoulboundToken();
        return super._update(to, tokenId, auth);
    }

    // Approvals are meaningless for a soulbound token — always rejected.
    function approve(address, uint256) public pure override(ERC721, IERC721) { revert SoulboundToken(); }
    function setApprovalForAll(address, bool) public pure override(ERC721, IERC721) { revert SoulboundToken(); }
    function isApprovedForAll(address, address) public pure override(ERC721, IERC721) returns (bool) { return false; }
    function transferFrom(address, address, uint256) public pure override(ERC721, IERC721) { revert SoulboundToken(); }

    // ── views ─────────────────────────────────────────────────────────
    function currentTier(address user) external view returns (uint8 tier, uint256 streak) {
        uint256 tokenId = userTokenId[user];
        if (tokenId == 0) return (TIER_NONE, 0);
        TierData storage d = tokenData[tokenId];
        return (d.tier, d.streak);
    }

    /// True when the user has a streak and has finished today's missions.
    function canMint(address user) external view returns (bool) {
        if (userTokenId[user] != 0) return false;
        (uint256 streak, ) = _userStreak(user);
        if (streak == 0) return false;
        return _todayActions(user) >= MIN_TODAY_ACTIONS;
    }

    function totalMinted() external view returns (uint256) { return _nextId - 1; }
    function version() external pure returns (string memory) { return VERSION; }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // ── on-chain metadata (self-contained SVG, no IPFS needed) ────────
    function _baseURI() internal pure override returns (string memory) {
        return "data:application/json;base64,";
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert SoulboundToken();
        TierData storage d = tokenData[tokenId];
        string memory json = string.concat(
            '{"name":"DGDreams Streak Badge #',
            _toString(tokenId),
            '","description":"Non-transferable on-chain streak badge. Tier and streak are read from the NikBase daily-mission contract.","image":"data:image/svg+xml;base64,',
            Base64.encode(abi.encodePacked(_badgeSvg(tokenId, d.tier, d.streak))),
            '","attributes":[{"trait_type":"Tier","value":',
            _tierName(d.tier),
            '},{"trait_type":"Streak","value":',
            _toString(d.streak),
            '}]}'
        );
        return string.concat(_baseURI(), Base64.encode(bytes(json)), "");
    }

    function _tierName(uint8 tier) private pure returns (string memory) {
        if (tier == TIER_LEGEND) return '"Legend"';
        if (tier == TIER_DIAMOND) return '"Diamond"';
        if (tier == TIER_GOLD) return '"Gold"';
        if (tier == TIER_SILVER) return '"Silver"';
        if (tier == TIER_BRONZE) return '"Bronze"';
        return '"Unranked"';
    }

    function _tierColor(uint8 tier) private pure returns (string memory) {
        if (tier == TIER_LEGEND) return "#FFAA00";
        if (tier == TIER_DIAMOND) return "#7CE7FF";
        if (tier == TIER_GOLD) return "#F0B90B";
        if (tier == TIER_SILVER) return "#C9CFD6";
        return "#C08552";
    }

    function _badgeSvg(uint256 tokenId, uint8 tier, uint256 streak)
        private
        pure
        returns (string memory)
    {
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">',
            '<rect width="400" height="400" fill="#0A0E1A"/>',
            '<rect x="14" y="14" width="372" height="372" rx="28" fill="none" stroke="',
            _tierColor(tier),
            '" stroke-width="4"/>',
            '<circle cx="200" cy="180" r="86" fill="none" stroke="',
            _tierColor(tier),
            '" stroke-width="3" opacity="0.55"/>',
            '<text x="200" y="196" font-family="monospace" font-size="58" font-weight="bold" fill="',
            _tierColor(tier),
            '" text-anchor="middle">',
            _tierShort(tier),
            '</text>',
            '<text x="200" y="238" font-family="monospace" font-size="22" fill="#F2EDE4" text-anchor="middle">',
            _toString(streak),
            ' day streak</text>',
            '<text x="200" y="300" font-family="monospace" font-size="15" fill="#8B93A7" text-anchor="middle">DGDREAMS SOULBOUND</text>',
            '<text x="200" y="326" font-family="monospace" font-size="13" fill="#5A6178" text-anchor="middle">#',
            _toString(tokenId),
            '</text>',
            '</svg>'
        );
    }

    function _tierShort(uint8 tier) private pure returns (string memory) {
        if (tier == TIER_LEGEND) return "LEGEND";
        if (tier == TIER_DIAMOND) return "DIAMOND";
        if (tier == TIER_GOLD) return "GOLD";
        if (tier == TIER_SILVER) return "SILVER";
        if (tier == TIER_BRONZE) return "BRONZE";
        return "SEED";
    }

    function _toString(uint256 value) private pure returns (string memory) {
        if (value == 0) return "0";
        uint256 digits;
        uint256 tmp = value;
        while (tmp != 0) { digits++; tmp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + (value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}

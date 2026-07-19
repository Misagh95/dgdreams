// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

interface INikBase {
    function getUserData(address user) external view returns (uint256 streak, uint256 totalCI, uint256 totalAct);
}

contract NikSoulbound is ERC721 {

    INikBase public nikBase;
    address public owner;
    uint256 public totalSupply;

    struct NFTData {
        uint8 tier;
        uint256 streak;
    }

    mapping(uint256 => NFTData) public tokenData;
    mapping(address => uint256) public userTokenId;

    event Minted(address indexed user, uint256 indexed tokenId, uint8 tier, uint256 streak);
    event Upgraded(address indexed user, uint8 oldTier, uint8 newTier, uint256 newStreak);

    modifier onlyOwner() { if (msg.sender != owner) revert("Unauthorized"); _; }

    constructor(address _nikBase) ERC721("NikBase Membership", "NIK") {
        owner = msg.sender;
        nikBase = INikBase(_nikBase);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert("Invalid");
        owner = newOwner;
    }

    function setNikBase(address _nikBase) external onlyOwner {
        nikBase = INikBase(_nikBase);
    }

    function getTier(uint256 streak) public pure returns (uint8) {
        if (streak >= 100) return 5;
        if (streak >= 60) return 4;
        if (streak >= 30) return 3;
        if (streak >= 14) return 2;
        if (streak >= 7) return 1;
        return 0;
    }

    function mint() external {
        require(userTokenId[msg.sender] == 0, "Already minted");
        (uint256 streak,,) = nikBase.getUserData(msg.sender);
        uint8 t = getTier(streak);
        require(t >= 1, "Need 7+ day streak");

        unchecked { totalSupply++; }
        _safeMint(msg.sender, totalSupply);
        tokenData[totalSupply] = NFTData(t, streak);
        userTokenId[msg.sender] = totalSupply;

        emit Minted(msg.sender, totalSupply, t, streak);
    }

    function upgrade() external {
        uint256 id = userTokenId[msg.sender];
        require(id != 0, "No NFT");

        (uint256 streak,,) = nikBase.getUserData(msg.sender);
        uint8 newTier = getTier(streak);
        require(newTier > tokenData[id].tier, "No upgrade");

        uint8 oldTier = tokenData[id].tier;
        tokenData[id].tier = newTier;
        tokenData[id].streak = streak;

        emit Upgraded(msg.sender, oldTier, newTier, streak);
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert("Soulbound");
        return super._update(to, tokenId, auth);
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        NFTData memory d = tokenData[id];
        string memory tn = _tierName(d.tier);
        (string memory bg, string memory acc, string memory txt, string memory icc) = _tierColors(d.tier);

        string memory svg = string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560">',
            '<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">',
            '<stop offset="0%" stop-color="#111"/>',
            '<stop offset="100%" stop-color="', bg, '"/>',
            '</linearGradient></defs>',
            '<rect width="400" height="560" rx="20" fill="url(#g)"/>',
            '<rect x="8" y="8" width="384" height="544" rx="16" fill="none" stroke="', acc, '" stroke-width="2" opacity="0.8"/>',
            '<rect x="16" y="16" width="368" height="528" rx="12" fill="none" stroke="', acc, '" stroke-width="0.5" opacity="0.4"/>',
            '<circle cx="200" cy="110" r="40" fill="', acc, '" opacity="0.05"/>',
            '<text x="200" y="200" font-family="system-ui,sans-serif" font-size="52" font-weight="900" fill="', txt, '" text-anchor="middle">DGD</text>',
            '<text x="200" y="250" font-family="system-ui,sans-serif" font-size="22" font-weight="600" fill="', acc, '" text-anchor="middle" letter-spacing="3">', tn, '</text>',
            '<rect x="100" y="310" width="200" height="42" rx="21" fill="none" stroke="', acc, '" stroke-width="1.5" opacity="0.6"/>',
            '<text x="200" y="338" font-family="monospace" font-size="18" fill="', icc, '" text-anchor="middle">\xf0\x9f\x94\xa5 ', _uintToString(d.streak), ' Days</text>',
            '<text x="200" y="400" font-family="system-ui,sans-serif" font-size="13" fill="', acc, '" opacity="0.5" text-anchor="middle">NIKBASE MEMBERSHIP</text>',
            '<text x="200" y="425" font-family="system-ui,sans-serif" font-size="10" opacity="0.3" fill="', acc, '" text-anchor="middle">Soulbound \xe2\x80\xa2 Non-Transferable</text>',
            '<text x="200" y="500" font-family="monospace" font-size="13" opacity="0.4" fill="', acc, '" text-anchor="middle">#', _uintToString(id), '</text>',
            '</svg>'
        ));

        string memory json = string(abi.encodePacked(
            '{"name":"NikBase ', tn, ' #', _uintToString(id), '",',
            '"description":"NikBase Soulbound Membership NFT achieved after a ', _uintToString(d.streak), '-day streak on NikBase protocol.",',
            '"image":"data:image/svg+xml;base64,', _encode(bytes(svg)), '",',
            '"attributes":[',
            '{"trait_type":"Tier","value":"', tn, '"},',
            '{"trait_type":"Streak","value":', _uintToString(d.streak), '},',
            '{"trait_type":"Token ID","value":', _uintToString(id), '}',
            ']}'
        ));

        return string(abi.encodePacked('data:application/json;base64,', _encode(bytes(json))));
    }

    function _tierName(uint8 t) internal pure returns (string memory) {
        if (t == 5) return "Legend";
        if (t == 4) return "Diamond";
        if (t == 3) return "Gold";
        if (t == 2) return "Silver";
        if (t == 1) return "Bronze";
        return "None";
    }

    function _tierColors(uint8 t) internal pure returns (string memory bg, string memory acc, string memory txt, string memory icc) {
        if (t == 5) return ("#2d1b4e", "#d4af37", "#f0e0a0", "#ffd700");
        if (t == 4) return ("#0f1a3a", "#00bfff", "#87ceeb", "#00e5ff");
        if (t == 3) return ("#2d1f0e", "#ffd700", "#fff4c2", "#ffaa00");
        if (t == 2) return ("#1a1a2e", "#c0c0c0", "#e8e8e8", "#d0d0d0");
        if (t == 1) return ("#1a1410", "#cd7f32", "#deb887", "#e8964e");
        return ("#000", "#fff", "#fff", "#fff");
    }

    function _uintToString(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 l = 0;
        uint256 t = v;
        while (t > 0) { unchecked { l++; t /= 10; } }
        bytes memory s = new bytes(l);
        for (uint256 i = 0; i < l; i++) {
            unchecked {
                s[l - 1 - i] = bytes1(uint8(48 + v % 10));
                v /= 10;
            }
        }
        return string(s);
    }

    function _encode(bytes memory data) internal pure returns (string memory) {
        bytes memory table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        uint256 l = data.length;
        bytes memory result = new bytes(4 * ((l + 2) / 3));
        uint256 r = 0;
        for (uint256 i = 0; i < l; i += 3) {
            uint256 b = uint256(uint8(data[i])) << 16;
            if (i + 1 < l) b |= uint256(uint8(data[i + 1])) << 8;
            if (i + 2 < l) b |= uint256(uint8(data[i + 2]));
            result[r++] = bytes1(table[(b >> 18) & 0x3F]);
            result[r++] = bytes1(table[(b >> 12) & 0x3F]);
            if (i + 1 < l) result[r++] = bytes1(table[(b >> 6) & 0x3F]);
            if (i + 2 < l) result[r++] = bytes1(table[b & 0x3F]);
        }
        return string(result);
    }

    function version() external pure returns (string memory) {
        return "NikSoulbound v1.0.0";
    }
}

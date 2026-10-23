// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title ChainBadge
 * @notice Free, permissionless, gas-only soulbound badge — one per wallet.
 *         Every DGDreams network gets its own deployment with its own name
 *         and symbol, so a wallet's badge shelf mirrors the chains it has
 *         actually touched.
 *
 *         There is no minting gate and no fee: the badge proves "this wallet
 *         set foot on this chain through DGDreams", and that is worth exactly
 *         the gas it costs to plant. Metadata is served off-chain by the app's
 *         /api/badge route, which points the image at the network's logo —
 *         mirrors the DGLiteNft pattern ("metadata is served off-chain") and
 *         keeps on-chain bytes (and deploy gas) minimal.
 */
contract ChainBadge is ERC721, Ownable {
    using Strings for uint256;

    string public constant VERSION = "1.0.0";

    /// Prefix of the off-chain metadata URL, without a trailing slash.
    /// (Solidity immutables cannot be reference types like string, so this is
    /// plain storage — written once at deploy, never at mint time.)
    string public baseURI;

    /// user => tokenId (0 = no badge), so reads need no event scan.
    mapping(address => uint256) public userTokenId;

    uint256 public totalMinted;

    error SoulboundToken();
    error AlreadyMinted();
    error NoBadge();

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        address initialOwner
    ) ERC721(name_, symbol_) Ownable(initialOwner) {
        baseURI = baseURI_;
    }

    // ── mint ───────────────────────────────────────────────────────────
    /// Mint the caller's badge. Permissionless, gas only, one per wallet.
    function mint() external {
        if (userTokenId[msg.sender] != 0) revert AlreadyMinted();
        uint256 id = ++totalMinted;
        userTokenId[msg.sender] = id;
        _safeMint(msg.sender, id);
    }

    // ── soulbound ──────────────────────────────────────────────────────
    // Every ERC721 transfer path funnels through _update, so blocking
    // owner-to-owner moves here is enough to make the badge non-transferable.
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
    function approve(address, uint256) public pure override(ERC721) { revert SoulboundToken(); }
    function setApprovalForAll(address, bool) public pure override(ERC721) { revert SoulboundToken(); }
    function isApprovedForAll(address, address) public pure override(ERC721) returns (bool) { return false; }
    function transferFrom(address, address, uint256) public pure override(ERC721) { revert SoulboundToken(); }

    // ── views ──────────────────────────────────────────────────────────
    function version() external pure returns (string memory) { return VERSION; }

    /**
     * Off-chain metadata: `<baseURI>?chain=<id>&id=<tokenId>`. The chain id in
     * the query is the one thing an address map can never tell the app — the
     * same badge contract exists on 20+ chains, so the API routes on this.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert NoBadge();
        return string.concat(
            baseURI,
            "?chain=",
            Strings.toString(block.chainid),
            "&id=",
            tokenId.toString()
        );
    }
}

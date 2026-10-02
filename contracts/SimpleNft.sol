// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleNft
 * @notice A plain ERC-721 collection: owner mints, metadata comes from a base
 *         URI set at construction, and the owner can change it later.
 */
contract SimpleNft is ERC721, Ownable {
    string public baseURI;
    uint256 private _minted;

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        _setBaseURI(baseURI_);
    }

    function mint(address to) external onlyOwner returns (uint256) {
        _minted++;
        _safeMint(to, _minted);
        return _minted;
    }

    function mintBatch(address to, uint256 count) external onlyOwner {
        for (uint256 i = 0; i < count; i++) {
            _minted++;
            _safeMint(to, _minted);
        }
    }

    function setBaseURI(string calldata baseURI_) external onlyOwner {
        _setBaseURI(baseURI_);
    }

    function _setBaseURI(string memory baseURI_) internal {
        baseURI = baseURI_;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTMarketplace is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;

    /** VARIABLES **/
    Counters.Counter private tokenIds;
    Counters.Counter private itemsBurned;

    mapping(uint256 => MarketItem) private idToMarketItem;

    /** STRUCTS **/
    struct MarketItem {
        uint256 tokenId;
        address payable owner;
        uint256 price;
    }

    /** EVENTS **/
    event MarketItemCreated(
        uint256 indexed tokenId,
        address owner,
        uint256 price
    );

    /** CONSTRUCTOR **/
    constructor() ERC721("Marketplace Tokens", "MARKT") {}

    /** MAIN METHODS **/

    // Mints a token and lists it in the marketplace
    function createToken(string memory _tokenURI, uint256 _price)
        public
        payable
        onlyOwner
        returns (uint256)
    {
        tokenIds.increment();
        uint256 newTokenId = tokenIds.current();

        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);
        createMarketItem(newTokenId, _price);
        return newTokenId;
    }

    function createMarketItem(uint256 _tokenId, uint256 _price) private {
        require(_price > 0, "Price must be at least 1 wei");

        idToMarketItem[_tokenId] = MarketItem(
            _tokenId,
            payable(address(this)), // This contract will be the owner
            _price
        );

        _transfer(msg.sender, address(this), _tokenId); // The token from msg.sender to this contract
        emit MarketItemCreated(_tokenId, address(this), _price);
    }

    // Burn a token
    function burn(uint256 _tokenId) public onlyOwner {
        // Burn an original NFT token
        idToMarketItem[_tokenId].owner = payable(address(0)); // Set new owner
        itemsBurned.increment();
        _burn(_tokenId); // Transfer token to address(0), the new owner of it

        // Add a dummy to avoid geting issues
        idToMarketItem[_tokenId] = MarketItem(
            _tokenId,
            payable(address(0)), // This contract will be the owner
            0
        );
    }

    // Returns all unburnedyy market items
    function fetchMarketItems() public view returns (MarketItem[] memory) {
        uint256 itemCount = tokenIds.current();
        uint256 unburnedItemCount = tokenIds.current() - itemsBurned.current();
        uint256 currentIndex = 0;

        MarketItem[] memory items = new MarketItem[](unburnedItemCount); // Array of unburned items

        for (uint256 i = 0; i < itemCount; i++) {
            if (idToMarketItem[i + 1].owner == address(this)) {
                MarketItem storage currentItem = idToMarketItem[i + 1]; // i + 1 is the current ID
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }
}

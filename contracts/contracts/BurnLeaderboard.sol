// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title BurnLeaderboard
 * @dev A contract that tracks token burns and maintains a leaderboard of top burners
 */
contract BurnLeaderboard is Ownable, ReentrancyGuard {
    // Dead address for permanent burns
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    
    // Token to be burned
    IERC20 public tokenAddress;
    
    // Structure to store burner information
    struct Burner {
        address burnerAddress;
        uint256 amountBurned;
    }
    
    // Top burners leaderboard (limited size for gas efficiency)
    uint256 public constant MAX_LEADERBOARD_SIZE = 20;
    Burner[] public leaderboard;
    
    // Mapping to track burns for every address
    mapping(address => uint256) public burnsByAddress;
    
    // Total amount of tokens burned
    uint256 public totalBurned;
    
    // Events
    event TokensBurned(address indexed burner, uint256 amount, uint256 timestamp);
    event TokenAddressUpdated(address newTokenAddress);
    
    /**
     * @dev Constructor sets the token address and contract owner
     * @param _tokenAddress The ERC20 token that will be burned
     */
    constructor(address _tokenAddress) Ownable(msg.sender) {
        tokenAddress = IERC20(_tokenAddress);
    }
    
    /**
     * @dev Updates the token address (only owner)
     * @param _newTokenAddress New token address
     */
    function setTokenAddress(address _newTokenAddress) external onlyOwner {
        tokenAddress = IERC20(_newTokenAddress);
        emit TokenAddressUpdated(_newTokenAddress);
    }
    
    /**
     * @dev Burns tokens by transferring them to the dead address and updating leaderboard
     * @param _amount Amount of tokens to burn
     */
    function burnTokens(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Amount must be greater than zero");
        require(tokenAddress.transferFrom(msg.sender, address(this), _amount), "Transfer failed");
        
        // Track the burn
        burnsByAddress[msg.sender] += _amount;
        totalBurned += _amount;
        
        // Update leaderboard
        updateLeaderboard(msg.sender, burnsByAddress[msg.sender]);
        
        // Send tokens to dead address
        require(tokenAddress.transfer(DEAD_ADDRESS, _amount), "Burn transfer failed");
        
        emit TokensBurned(msg.sender, _amount, block.timestamp);
    }
    
    /**
     * @dev Updates the leaderboard with a new burn
     * @param _burner Address of the burner
     * @param _totalAmount Total amount burned by this address
     */
    function updateLeaderboard(address _burner, uint256 _totalAmount) internal {
        // Check if burner is already on leaderboard
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i].burnerAddress == _burner) {
                // Update existing entry
                leaderboard[i].amountBurned = _totalAmount;
                // Sort the leaderboard
                sortLeaderboard();
                return;
            }
        }
        
        // If not on leaderboard, try to add
        if (leaderboard.length < MAX_LEADERBOARD_SIZE) {
            // Leaderboard not full, add new entry
            leaderboard.push(Burner(_burner, _totalAmount));
        } else if (_totalAmount > leaderboard[leaderboard.length - 1].amountBurned) {
            // Leaderboard full but this burn is larger than the smallest on the board
            leaderboard[leaderboard.length - 1] = Burner(_burner, _totalAmount);
        } else {
            // Not eligible for leaderboard
            return;
        }
        
        // Sort the leaderboard
        sortLeaderboard();
    }
    
    /**
     * @dev Sorts the leaderboard in descending order by amount burned
     * Simple insertion sort since leaderboard is small
     */
    function sortLeaderboard() internal {
        for (uint256 i = 1; i < leaderboard.length; i++) {
            Burner memory key = leaderboard[i];
            int j = int(i) - 1;
            
            while (j >= 0 && leaderboard[uint256(j)].amountBurned < key.amountBurned) {
                leaderboard[uint256(j + 1)] = leaderboard[uint256(j)];
                j--;
            }
            
            leaderboard[uint256(j + 1)] = key;
        }
    }
    
    /**
     * @dev Returns the complete leaderboard
     * @return The array of top burners
     */
    function getLeaderboard() external view returns (Burner[] memory) {
        return leaderboard;
    }
    
    /**
     * @dev Returns the top N burners
     * @param _count Number of top burners to return
     * @return Top N burners
     */
    function getTopBurners(uint256 _count) external view returns (Burner[] memory) {
        uint256 count = Math.min(_count, leaderboard.length);
        Burner[] memory topBurners = new Burner[](count);
        
        for (uint256 i = 0; i < count; i++) {
            topBurners[i] = leaderboard[i];
        }
        
        return topBurners;
    }
    
    /**
     * @dev Get amount burned by a specific address
     * @param _address The address to check
     * @return The amount burned by the address
     */
    function getBurnedByAddress(address _address) external view returns (uint256) {
        return burnsByAddress[_address];
    }
    
    /**
     * @dev Get the rank of a specific address on the leaderboard
     * @param _address The address to check
     * @return The rank (1-based, 0 if not on leaderboard)
     */
    function getRankOfAddress(address _address) external view returns (uint256) {
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i].burnerAddress == _address) {
                return i + 1; // Rank is 1-based
            }
        }
        return 0; // Not on leaderboard
    }
}
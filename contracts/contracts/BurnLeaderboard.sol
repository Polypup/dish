// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title BurnLeaderboard
 * @dev A contract that tracks token burns with timestamps and maintains time-based leaderboards
 */
contract BurnLeaderboard is Ownable, ReentrancyGuard {
    // Dead address for permanent burns
    address public constant DEAD_ADDRESS =
        0x000000000000000000000000000000000000dEaD;

    // Token to be burned
    IERC20 public tokenAddress;

    // Structure to store individual burn events
    struct BurnEvent {
        address burner;
        uint256 amount;
        uint256 timestamp;
    }

    // Structure to store burner information for leaderboards
    struct Burner {
        address burnerAddress;
        uint256 amountBurned;
    }

    // All burn events
    BurnEvent[] public allBurns;

    // Mapping to track burns for every address
    mapping(address => uint256) public totalBurnsByAddress;

    // Mapping to track burn event indices for each address
    mapping(address => uint256[]) public userBurnIndices;

    // Total amount of tokens burned
    uint256 public totalBurned;

    // Events
    event TokensBurned(
        address indexed burner,
        uint256 amount,
        uint256 timestamp
    );
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
     * @dev Burns tokens by transferring them to the dead address and recording the event
     * @param _amount Amount of tokens to burn
     */
    function burnTokens(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Amount must be greater than zero");
        require(
            tokenAddress.transferFrom(msg.sender, address(this), _amount),
            "Transfer failed"
        );

        // Record the burn event
        BurnEvent memory newBurn = BurnEvent({
            burner: msg.sender,
            amount: _amount,
            timestamp: block.timestamp
        });

        // Add to allBurns array
        allBurns.push(newBurn);

        // Update user's burn indices
        userBurnIndices[msg.sender].push(allBurns.length - 1);

        // Update totals
        totalBurnsByAddress[msg.sender] += _amount;
        totalBurned += _amount;

        // Send tokens to dead address
        require(
            tokenAddress.transfer(DEAD_ADDRESS, _amount),
            "Burn transfer failed"
        );

        emit TokensBurned(msg.sender, _amount, block.timestamp);
    }

    /**
     * @dev Get the daily leaderboard (last 24 hours)
     * @return The daily leaderboard
     */
    function getDailyLeaderboard() external view returns (Burner[] memory) {
        uint256 dayStart = block.timestamp - 1 days;
        return _getLeaderboardForPeriod(dayStart, block.timestamp);
    }

    /**
     * @dev Get the weekly leaderboard (last 7 days)
     * @return The weekly leaderboard
     */
    function getWeeklyLeaderboard() external view returns (Burner[] memory) {
        uint256 weekStart = block.timestamp - 7 days;
        return _getLeaderboardForPeriod(weekStart, block.timestamp);
    }

    /**
     * @dev Get the monthly leaderboard (last 30 days)
     * @return The monthly leaderboard
     */
    function getMonthlyLeaderboard() external view returns (Burner[] memory) {
        uint256 monthStart = block.timestamp - 30 days;
        return _getLeaderboardForPeriod(monthStart, block.timestamp);
    }

    /**
     * @dev Get the all-time leaderboard
     * @return The all-time leaderboard
     */
    function getTotalLeaderboard() external view returns (Burner[] memory) {
        return _getTotalLeaderboard();
    }

    /**
     * @dev Internal function to get leaderboard for a specific time period
     * @param _startTime Start timestamp of the period
     * @param _endTime End timestamp of the period
     * @return Leaderboard for the specified period
     */
    function _getLeaderboardForPeriod(
        uint256 _startTime,
        uint256 _endTime
    ) internal view returns (Burner[] memory) {
        // Temporary mapping to aggregate burns by address
        mapping(address => uint256) storage tempBurns;
        address[] memory uniqueBurners = new address[](100); // Temp array, resize if needed
        uint256 uniqueBurnerCount = 0;

        // Iterate through all burns
        for (uint256 i = 0; i < allBurns.length; i++) {
            BurnEvent memory burn = allBurns[i];

            // Check if burn is within the time period
            if (burn.timestamp >= _startTime && burn.timestamp < _endTime) {
                // Add to temporary mapping
                if (
                    tempBurns[burn.burner] == 0 &&
                    !_addressExists(
                        uniqueBurners,
                        burn.burner,
                        uniqueBurnerCount
                    )
                ) {
                    uniqueBurners[uniqueBurnerCount] = burn.burner;
                    uniqueBurnerCount++;
                }
                tempBurns[burn.burner] += burn.amount;
            }
        }

        // Create result array
        Burner[] memory result = new Burner[](uniqueBurnerCount);

        // Populate result array
        for (uint256 i = 0; i < uniqueBurnerCount; i++) {
            address burner = uniqueBurners[i];
            result[i] = Burner({
                burnerAddress: burner,
                amountBurned: tempBurns[burner]
            });
        }

        // Sort the result
        _sortBurners(result);

        return result;
    }

    /**
     * @dev Internal function to get the all-time leaderboard
     * @return The all-time leaderboard
     */
    function _getTotalLeaderboard() internal view returns (Burner[] memory) {
        address[] memory uniqueBurners = new address[](100); // Temp array, resize if needed
        uint256 uniqueBurnerCount = 0;

        // Get all unique burners
        for (uint256 i = 0; i < allBurns.length; i++) {
            address burner = allBurns[i].burner;
            if (!_addressExists(uniqueBurners, burner, uniqueBurnerCount)) {
                uniqueBurners[uniqueBurnerCount] = burner;
                uniqueBurnerCount++;
            }
        }

        // Create result array
        Burner[] memory result = new Burner[](uniqueBurnerCount);

        // Populate result array
        for (uint256 i = 0; i < uniqueBurnerCount; i++) {
            address burner = uniqueBurners[i];
            result[i] = Burner({
                burnerAddress: burner,
                amountBurned: totalBurnsByAddress[burner]
            });
        }

        // Sort the result
        _sortBurners(result);

        return result;
    }

    /**
     * @dev Helper function to check if address exists in array
     */
    function _addressExists(
        address[] memory array,
        address addr,
        uint256 length
    ) internal pure returns (bool) {
        for (uint256 i = 0; i < length; i++) {
            if (array[i] == addr) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Helper function to sort burners by amount burned (descending)
     */
    function _sortBurners(Burner[] memory arr) internal pure {
        uint256 length = arr.length;
        for (uint256 i = 0; i < length; i++) {
            for (uint256 j = i + 1; j < length; j++) {
                if (arr[i].amountBurned < arr[j].amountBurned) {
                    Burner memory temp = arr[i];
                    arr[i] = arr[j];
                    arr[j] = temp;
                }
            }
        }
    }

    /**
     * @dev Get all burns for a specific address
     * @param _address Address to query
     * @return Array of burn events for the address
     */
    function getUserBurns(
        address _address
    ) external view returns (BurnEvent[] memory) {
        uint256[] memory indices = userBurnIndices[_address];
        BurnEvent[] memory userBurns = new BurnEvent[](indices.length);

        for (uint256 i = 0; i < indices.length; i++) {
            userBurns[i] = allBurns[indices[i]];
        }

        return userBurns;
    }

    /**
     * @dev Get total number of burn events
     * @return Total number of burn events
     */
    function getTotalBurnEvents() external view returns (uint256) {
        return allBurns.length;
    }
}

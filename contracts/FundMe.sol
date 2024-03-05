//SPDX-License-Identifier: MIT
//Pragma
pragma solidity ^0.8.8;

//Imports
import "./Converter.sol";

//Error Codes
error FundMe_NotOwner();

//Interfaces,libraries, contracts
/**
 * @title A contract for crowd funding
 * @author Bhupendra Gupta
 * @notice This contract is a demo
 * @dev This implements pricefeeds as library
 */

contract FundMe {
    //Type Declarations
    using PriceConverter for uint256;

    //State Variables
    uint256 public constant MINIMUM_USD = 50 * 1e18;
    address[] private s_funders;
    mapping(address => uint256) private s_addressToAmountFunded;
    address private immutable i_owner;
    AggregatorV3Interface public s_priceFeed;

    //Events - We don't have any
    // Modifiers

    modifier onlyOwner() {
        //require(msg.sender == i_owner, "Sender is not owner");
        if (msg.sender != i_owner) revert FundMe_NotOwner();
        _; // below underscore means all the code will be excuted after checking above condition.
    }

    // Functions
    //Constructor

    constructor(address priceFeedAddress) {
        i_owner = msg.sender;
        s_priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    //Receive and fallback

    receive() external payable {
        fund();
    }

    fallback() external payable {
        fund();
    }

    /**
     * @notice This is a fund function
     * @dev Don't have any parameter and no returns
     */
    function fund() public payable {
        // Want a minimum limit to set for funds in USD
        // Mark the function with payble keyword to be able to get paid
        // Contract can hold value like a wallet
        require(
            (msg.value.getConversionRate(s_priceFeed)) >= MINIMUM_USD,
            "Didn't send enough"
        );
        s_funders.push(msg.sender);
        s_addressToAmountFunded[msg.sender] = msg.value;
    }

    // Resetting the Funders amount
    function withdraw() public onlyOwner {
        for (
            uint256 funderIndex = 0;
            funderIndex < s_funders.length;
            funderIndex++
        ) {
            address funder = s_funders[funderIndex];
            s_addressToAmountFunded[funder] = 0;
        }
        // Restting array
        s_funders = new address[](0);
        // Three ways to whithdraw money from contract
        // transfer, send, call
        //call implementation
        // call returns two objects 1. Boolean 2. Bytes
        (bool callSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(callSuccess, "call failed");
    }

    function cheaperWithdraw() public payable {
        address[] memory funders = s_funders;
        // mapping can't be in memory
        for (
            uint256 funderIndex = 0;
            funderIndex < funders.length;
            funderIndex++
        ) {
            address funder = funders[funderIndex];
            s_addressToAmountFunded[funder] = 0;
        }
        s_funders = new address[](0);
        (bool success, ) = i_owner.call{value: address(this).balance}("");
        require(success);
    }

    // view/pure

    function getOwner() public view returns (address) {
        return i_owner;
    }

    function getFunder(uint256 index) public view returns (address) {
        return s_funders[index];
    }

    function getAddressToAmountFunded(
        address funder
    ) public view returns (uint256) {
        return s_addressToAmountFunded[funder];
    }

    function getPriceFeed() public view returns (AggregatorV3Interface) {
        return s_priceFeed;
    }
}

// What happens if someone send ETH this contract without calling fund funtion

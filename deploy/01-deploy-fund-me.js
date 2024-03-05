/*
function deployFunction(){
    console.log("Hi");
}

module.exports.default = deployFunction

module.exports = async (hre) => {
    const {getNamedAccounts, deployments} = hre
}*/

const { network } = require("hardhat");
const { verify } = require("../utils/verify");
require("dotenv");
const {
    networkConfig,
    developmentChains,
} = require("../helper-hardhat-config");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    //Mocking : simulating behavior of the complex object by another object

    //const ethUSDPriceFeedAddress = networkConfig[chainId]["ethUSDPriceFeed"];

    let ethUSDPriceFeedAddress;
    if (developmentChains.includes(network.name)) {
        const ethUsdAggregator = await deployments.get("MockV3Aggregator");
        ethUSDPriceFeedAddress = ethUsdAggregator.address;
    } else {
        ethUSDPriceFeedAddress = networkConfig[chainId]["ethUSDPriceFeed"];
    }
    const args = [ethUSDPriceFeedAddress];
    const fundMe = await deploy("FundMe", {
        from: deployer,
        args: args, // put price feed here
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });
    if (
        !developmentChains.includes(
            network.name && process.env.ETHERSCAN_API_KEY,
        )
    ) {
        await verify(fundMe.address, args);
    }
    log("-----------------------------------------------------");
    log("contract deployed");
};

module.exports.tags = ["all", "fundme"];

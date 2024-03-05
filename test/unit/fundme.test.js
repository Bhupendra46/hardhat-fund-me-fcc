const { deployments, ethers, getNamedAccounts } = require("hardhat");
const { assert, expect } = require("chai");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", async function () {
          let fundMe, deployer, mockV3Aggregator;
          let sendValue = ethers.parseEther("1");

          beforeEach(async function () {
              // Deploy Our FundMe contract
              // using hardhat-deploy
              //const accounts = await ethers.getSigner();

              deployer = (await getNamedAccounts()).deployer;
              await deployments.fixture(["all"]);
              fundMe = await ethers.getContract("FundMe", deployer);
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer,
              );
          });

          describe("constructor", async function () {
              it("Set the aggregator address correctly", async function () {
                  const response = await fundMe.getPriceFeed();
                  assert.equal(response, mockV3Aggregator.target);
              });
          });

          describe("fund", async function () {
              it("Fails if you don't send enough ETH", async function () {
                  await expect(fundMe.fund()).to.be.revertedWith(
                      "Didn't send enough",
                  );
              });

              it("updated the amount funded data structure", async function () {
                  await fundMe.fund({ value: sendValue });
                  const response =
                      await fundMe.getAddressToAmountFunded(deployer);
                  assert.equal(response.toString(), sendValue.toString());
              });
              it("Adds getFunder to array", async function () {
                  await fundMe.fund({ value: sendValue });
                  const getFunder = await fundMe.getFunder(0);
                  assert.equal(getFunder, deployer);
              });
          });

          describe("Withdraw", async function () {
              beforeEach(async function () {
                  await fundMe.fund({ value: sendValue });
              });

              it("withdraw ETH from a single getFunder", async function () {
                  //Arrange
                  const startingFundMeBalance =
                      await ethers.provider.getBalance(fundMe);
                  const startingDeployerBalance =
                      await ethers.provider.getBalance(deployer);
                  //Act

                  const transactionResonse = await fundMe.withdraw();
                  const transactionReceipt = await transactionResonse.wait(1);

                  const { gasUsed, gasPrice } = transactionReceipt;
                  const gasCost = gasUsed * gasPrice;

                  const endingFundMeBalance =
                      await ethers.provider.getBalance(fundMe);
                  const endingDeployerBalance =
                      await ethers.provider.getBalance(deployer);
                  //Assert

                  assert.equal(endingFundMeBalance, 0);
                  assert.equal(
                      (
                          startingFundMeBalance + startingDeployerBalance
                      ).toString(),
                      (endingDeployerBalance + gasCost).toString(),
                  );
              });

              it("cheaper_withdraw ETH from a single getFunder", async function () {
                  //Arrange
                  const startingFundMeBalance =
                      await ethers.provider.getBalance(fundMe);
                  const startingDeployerBalance =
                      await ethers.provider.getBalance(deployer);
                  //Act

                  const transactionResonse = await fundMe.cheaperWithdraw();
                  const transactionReceipt = await transactionResonse.wait(1);

                  const { gasUsed, gasPrice } = transactionReceipt;
                  const gasCost = gasUsed * gasPrice;

                  const endingFundMeBalance =
                      await ethers.provider.getBalance(fundMe);
                  const endingDeployerBalance =
                      await ethers.provider.getBalance(deployer);
                  //Assert

                  assert.equal(endingFundMeBalance, 0);
                  assert.equal(
                      (
                          startingFundMeBalance + startingDeployerBalance
                      ).toString(),
                      (endingDeployerBalance + gasCost).toString(),
                  );
              });
          });

          it("allows us to withdraw with multiple getFunder", async function () {
              //Arrange
              const accounts = await ethers.getSigners();
              for (let i = 1; i < 6; i++) {
                  const fundMeConnectedContract = await fundMe.connect(
                      accounts[i],
                  );
                  await fundMeConnectedContract.fund({ value: sendValue });
              }

              const startingFundMeBalance =
                  await ethers.provider.getBalance(fundMe);
              const startingDeployerBalance =
                  await ethers.provider.getBalance(deployer);
              //Act

              const transactionResonse = await fundMe.withdraw();
              const transactionReceipt = await transactionResonse.wait(1);

              const { gasUsed, gasPrice } = transactionReceipt;
              const gasCost = gasUsed * gasPrice;

              const endingFundMeBalance =
                  await ethers.provider.getBalance(fundMe);
              const endingDeployerBalance =
                  await ethers.provider.getBalance(deployer);
              //Assert

              assert.equal(endingFundMeBalance, 0);
              assert.equal(
                  (startingFundMeBalance + startingDeployerBalance).toString(),
                  (endingDeployerBalance + gasCost).toString(),
              );
              // Make sure getFunder are reset properly
              await expect(fundMe.getFunder(0)).to.be.reverted;

              for (i = 1; i < 6; i++) {
                  assert.equal(
                      await fundMe.getAddressToAmountFunded(accounts[i]),
                      0,
                  );
              }
          });

          it("Cheaper withdraw...", async function () {
              //Arrange
              const accounts = await ethers.getSigners();
              for (let i = 1; i < 6; i++) {
                  const fundMeConnectedContract = await fundMe.connect(
                      accounts[i],
                  );
                  await fundMeConnectedContract.fund({ value: sendValue });
              }

              const startingFundMeBalance =
                  await ethers.provider.getBalance(fundMe);
              const startingDeployerBalance =
                  await ethers.provider.getBalance(deployer);
              //Act

              const transactionResonse = await fundMe.cheaperWithdraw();
              const transactionReceipt = await transactionResonse.wait(1);

              const { gasUsed, gasPrice } = transactionReceipt;
              const gasCost = gasUsed * gasPrice;

              const endingFundMeBalance =
                  await ethers.provider.getBalance(fundMe);
              const endingDeployerBalance =
                  await ethers.provider.getBalance(deployer);
              //Assert

              assert.equal(endingFundMeBalance, 0);
              assert.equal(
                  (startingFundMeBalance + startingDeployerBalance).toString(),
                  (endingDeployerBalance + gasCost).toString(),
              );
              // Make sure getFunder are reset properly
              await expect(fundMe.getFunder(0)).to.be.reverted;

              for (i = 1; i < 6; i++) {
                  assert.equal(
                      await fundMe.getAddressToAmountFunded(accounts[i]),
                      0,
                  );
              }
          });

          it("only allow owner to withdraw", async function () {
              const accounts = ethers.getSigners();
              const attacker = accounts[1];
              const attackerConnectedAccounts = await fundMe.connect(attacker);
              expect(attackerConnectedAccounts.withdraw()).to.be.reverted;
          });
      });

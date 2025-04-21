const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BurnLeaderboard", function () {
  let BurnLeaderboard, burnLeaderboard;
  let MockToken, mockToken;
  let owner, addr1, addr2, addr3;
  let deadAddress;

  // Common test values
  const initialSupply = ethers.parseEther("1000000"); // 1 million tokens
  
  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
    
    // Deploy mock token
    MockToken = await ethers.getContractFactory("MockToken");
    mockToken = await MockToken.deploy(initialSupply);

    // Deploy the BurnLeaderboard contract
    BurnLeaderboard = await ethers.getContractFactory("BurnLeaderboard");
    burnLeaderboard = await BurnLeaderboard.deploy(await mockToken.getAddress());
    
    // Constants
    deadAddress = "0x000000000000000000000000000000000000dEaD";
    
    // Distribute tokens to test addresses
    await mockToken.transfer(addr1.address, ethers.parseEther("10000"));
    await mockToken.transfer(addr2.address, ethers.parseEther("20000"));
    await mockToken.transfer(addr3.address, ethers.parseEther("30000"));
  });

  describe("Deployment", function () {
    it("Should set the correct token address", async function () {
      expect(await burnLeaderboard.tokenAddress()).to.equal(await mockToken.getAddress());
    });

    it("Should set the right owner", async function () {
      expect(await burnLeaderboard.owner()).to.equal(owner.address);
    });
  });

  describe("Token burning", function () {
    it("Should burn tokens and update leaderboard", async function () {
      // Approve the contract to spend tokens
      await mockToken.connect(addr1).approve(await burnLeaderboard.getAddress(), ethers.parseEther("1000"));
      
      // Burn tokens
      await burnLeaderboard.connect(addr1).burnTokens(ethers.parseEther("1000"));
      
      // Check if the burn was recorded
      expect(await burnLeaderboard.burnsByAddress(addr1.address)).to.equal(ethers.parseEther("1000"));
      expect(await burnLeaderboard.totalBurned()).to.equal(ethers.parseEther("1000"));
      
      // Check leaderboard
      const leaderboard = await burnLeaderboard.getLeaderboard();
      expect(leaderboard.length).to.equal(1);
      expect(leaderboard[0].burnerAddress).to.equal(addr1.address);
      expect(leaderboard[0].amountBurned).to.equal(ethers.parseEther("1000"));
    });

    it("Should correctly sort the leaderboard", async function () {
      // Approve the contract to spend tokens
      await mockToken.connect(addr1).approve(await burnLeaderboard.getAddress(), ethers.parseEther("1000"));
      await mockToken.connect(addr2).approve(await burnLeaderboard.getAddress(), ethers.parseEther("2000"));
      await mockToken.connect(addr3).approve(await burnLeaderboard.getAddress(), ethers.parseEther("3000"));
      
      // Burn tokens
      await burnLeaderboard.connect(addr1).burnTokens(ethers.parseEther("1000"));
      await burnLeaderboard.connect(addr2).burnTokens(ethers.parseEther("2000"));
      await burnLeaderboard.connect(addr3).burnTokens(ethers.parseEther("3000"));
      
      // Check leaderboard is sorted
      const leaderboard = await burnLeaderboard.getLeaderboard();
      expect(leaderboard.length).to.equal(3);
      
      // Check order: addr3 > addr2 > addr1
      expect(leaderboard[0].burnerAddress).to.equal(addr3.address);
      expect(leaderboard[1].burnerAddress).to.equal(addr2.address);
      expect(leaderboard[2].burnerAddress).to.equal(addr1.address);
      
      // Check amounts
      expect(leaderboard[0].amountBurned).to.equal(ethers.parseEther("3000"));
      expect(leaderboard[1].amountBurned).to.equal(ethers.parseEther("2000"));
      expect(leaderboard[2].amountBurned).to.equal(ethers.parseEther("1000"));
    });

    it("Should correctly update rankings when an address burns more tokens", async function () {
      // Approve the contract to spend tokens
      await mockToken.connect(addr1).approve(await burnLeaderboard.getAddress(), ethers.parseEther("3000"));
      await mockToken.connect(addr2).approve(await burnLeaderboard.getAddress(), ethers.parseEther("2000"));
      
      // Initial burns
      await burnLeaderboard.connect(addr1).burnTokens(ethers.parseEther("1000"));
      await burnLeaderboard.connect(addr2).burnTokens(ethers.parseEther("2000"));
      
      // Initially, addr2 is ranked higher than addr1
      let leaderboard = await burnLeaderboard.getLeaderboard();
      expect(leaderboard[0].burnerAddress).to.equal(addr2.address);
      expect(leaderboard[1].burnerAddress).to.equal(addr1.address);
      
      // addr1 burns more tokens to overtake addr2
      await burnLeaderboard.connect(addr1).burnTokens(ethers.parseEther("2000"));
      
      // Check updated leaderboard
      leaderboard = await burnLeaderboard.getLeaderboard();
      expect(leaderboard[0].burnerAddress).to.equal(addr1.address);
      expect(leaderboard[1].burnerAddress).to.equal(addr2.address);
      
      // Check amounts
      expect(leaderboard[0].amountBurned).to.equal(ethers.parseEther("3000"));
      expect(leaderboard[1].amountBurned).to.equal(ethers.parseEther("2000"));
    });
  });

  describe("Getter functions", function () {
    beforeEach(async function () {
      // Set up some burns for testing getters
      await mockToken.connect(addr1).approve(await burnLeaderboard.getAddress(), ethers.parseEther("1000"));
      await mockToken.connect(addr2).approve(await burnLeaderboard.getAddress(), ethers.parseEther("2000"));
      await mockToken.connect(addr3).approve(await burnLeaderboard.getAddress(), ethers.parseEther("3000"));
      
      await burnLeaderboard.connect(addr1).burnTokens(ethers.parseEther("1000"));
      await burnLeaderboard.connect(addr2).burnTokens(ethers.parseEther("2000"));
      await burnLeaderboard.connect(addr3).burnTokens(ethers.parseEther("3000"));
    });
    
    it("Should return the correct amount burned by address", async function () {
      expect(await burnLeaderboard.getBurnedByAddress(addr1.address)).to.equal(ethers.parseEther("1000"));
      expect(await burnLeaderboard.getBurnedByAddress(addr2.address)).to.equal(ethers.parseEther("2000"));
      expect(await burnLeaderboard.getBurnedByAddress(addr3.address)).to.equal(ethers.parseEther("3000"));
    });
    
    it("Should return the correct rank for each address", async function () {
      expect(await burnLeaderboard.getRankOfAddress(addr3.address)).to.equal(1);
      expect(await burnLeaderboard.getRankOfAddress(addr2.address)).to.equal(2);
      expect(await burnLeaderboard.getRankOfAddress(addr1.address)).to.equal(3);
      expect(await burnLeaderboard.getRankOfAddress(owner.address)).to.equal(0); // Not on leaderboard
    });
    
    it("Should return the correct top burners", async function () {
      const top2 = await burnLeaderboard.getTopBurners(2);
      expect(top2.length).to.equal(2);
      expect(top2[0].burnerAddress).to.equal(addr3.address);
      expect(top2[1].burnerAddress).to.equal(addr2.address);
      
      const top1 = await burnLeaderboard.getTopBurners(1);
      expect(top1.length).to.equal(1);
      expect(top1[0].burnerAddress).to.equal(addr3.address);
    });
  });
});
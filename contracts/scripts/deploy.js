const hre = require("hardhat");

async function main() {
  // The predefined token address to be used for burning
  const tokenAddress = "0x40146E96EE5297187022D1ca62A3169B5e45B0a4";

  console.log("Deploying BurnLeaderboard contract...");
  console.log("Token Address:", tokenAddress);

  // Deploy the contract
  const BurnLeaderboard = await hre.ethers.getContractFactory("BurnLeaderboard");
  const burnLeaderboard = await BurnLeaderboard.deploy(tokenAddress);

  await burnLeaderboard.waitForDeployment();

  const deployedAddress = await burnLeaderboard.getAddress();
  console.log(`BurnLeaderboard deployed to: ${deployedAddress}`);

  // Verify the contract if not on a local network
  const network = hre.network.name;
  if (network !== "hardhat" && network !== "localhost") {
    console.log("Waiting for block confirmations...");
    // Wait for a few block confirmations to ensure the contract is deployed
    await burnLeaderboard.deploymentTransaction().wait(6);

    console.log("Verifying contract on Etherscan...");
    await hre.run("verify:verify", {
      address: deployedAddress,
      constructorArguments: [tokenAddress],
    });
    console.log("Contract verified on Etherscan!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
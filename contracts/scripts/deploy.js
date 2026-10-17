const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("==================================================");
  console.log("🚀 Deploying SkillS Smart Contracts");
  console.log("Deployer Address:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer Balance:", ethers.formatEther(balance), "ETH");
  console.log("==================================================");

  // 1. Deploy SkillCredentialNFT
  console.log("\n1. Deploying SkillCredentialNFT (Soulbound ERC-721)...");
  const SkillCredentialNFT = await ethers.getContractFactory("SkillCredentialNFT");
  const credentialNFT = await SkillCredentialNFT.deploy(deployer.address);
  await credentialNFT.waitForDeployment();
  const credentialAddress = await credentialNFT.getAddress();
  console.log("✅ SkillCredentialNFT deployed to:", credentialAddress);

  // 2. Deploy SkillRewardToken
  console.log("\n2. Deploying SkillRewardToken (ERC-20 SKILL)...");
  const SkillRewardToken = await ethers.getContractFactory("SkillRewardToken");
  const rewardToken = await SkillRewardToken.deploy(deployer.address);
  await rewardToken.waitForDeployment();
  const rewardAddress = await rewardToken.getAddress();
  console.log("✅ SkillRewardToken deployed to:", rewardAddress);

  // 3. Deploy SkillProtocolRegistry
  console.log("\n3. Deploying SkillProtocolRegistry...");
  const SkillProtocolRegistry = await ethers.getContractFactory("SkillProtocolRegistry");
  const registry = await SkillProtocolRegistry.deploy(
    credentialAddress,
    rewardAddress,
    deployer.address
  );
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("✅ SkillProtocolRegistry deployed to:", registryAddress);

  // 4. Configure Roles
  console.log("\n4. Configuring AccessControl Roles...");
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));

  // Grant MINTER_ROLE on SkillCredentialNFT to SkillProtocolRegistry
  let tx = await credentialNFT.grantRole(MINTER_ROLE, registryAddress);
  await tx.wait();
  console.log("✅ Granted MINTER_ROLE on CredentialNFT to ProtocolRegistry");

  // Grant MINTER_ROLE on SkillRewardToken to SkillProtocolRegistry
  tx = await rewardToken.grantRole(MINTER_ROLE, registryAddress);
  await tx.wait();
  console.log("✅ Granted MINTER_ROLE on RewardToken to ProtocolRegistry");

  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  // Read existing deployment file to preserve multi-network records
  const clientContractsDir = path.join(__dirname, "../../client/src/contracts");
  if (!fs.existsSync(clientContractsDir)) {
    fs.mkdirSync(clientContractsDir, { recursive: true });
  }

  const outputPath = path.join(clientContractsDir, "deployedContracts.json");
  let existingData = {};
  if (fs.existsSync(outputPath)) {
    try {
      existingData = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    } catch {
      existingData = {};
    }
  }

  const networks = existingData.networks || {};
  const currentNetworkData = {
    network: network.name,
    chainId: chainId,
    deployer: deployer.address,
    contracts: {
      SkillCredentialNFT: {
        address: credentialAddress,
        abi: JSON.parse(credentialNFT.interface.formatJson()),
      },
      SkillRewardToken: {
        address: rewardAddress,
        abi: JSON.parse(rewardToken.interface.formatJson()),
      },
      SkillProtocolRegistry: {
        address: registryAddress,
        abi: JSON.parse(registry.interface.formatJson()),
      },
    },
    deployedAt: new Date().toISOString(),
  };

  networks[chainId] = currentNetworkData;

  const deploymentData = {
    ...currentNetworkData,
    networks,
  };

  // Save to client/src/contracts/deployedContracts.json
  fs.writeFileSync(outputPath, JSON.stringify(deploymentData, null, 2));
  console.log("\n📁 Exported contract addresses and ABIs to:", outputPath);

  // Also write deployment-info.json in contracts directory
  const localOutputPath = path.join(__dirname, "../deployment-info.json");
  fs.writeFileSync(localOutputPath, JSON.stringify(deploymentData, null, 2));

  console.log("\n==================================================");
  console.log("🎉 SkillS Smart Contract Suite Deployed Successfully!");
  console.log("Network:              ", network.name);
  console.log("Chain ID:             ", chainId);
  console.log("SkillCredentialNFT:   ", credentialAddress);
  console.log("SkillRewardToken:     ", rewardAddress);
  console.log("SkillProtocolRegistry:", registryAddress);
  console.log("==================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

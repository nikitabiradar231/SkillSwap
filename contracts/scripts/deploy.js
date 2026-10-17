const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log("==================================================");
  console.log("🚀 Deploying SkillS Smart Contracts Suite");
  console.log("Network Name:    ", network.name);
  console.log("Chain ID:        ", chainId);
  console.log("Deployer Address:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer Balance:", ethers.formatEther(balance), "ETH");
  console.log("==================================================");

  // Safety checks
  if (network.name === "sepolia" && chainId !== 11155111) {
    throw new Error(`Target network mismatch! Expected chainId 11155111 for Sepolia, received ${chainId}`);
  }

  if (balance === 0n) {
    throw new Error(`Deployer account ${deployer.address} has 0 ETH. Please fund the account with testnet ETH.`);
  }

  // 1. Deploy SkillCredentialNFT (Soulbound ERC-721)
  console.log("\n1. Deploying SkillCredentialNFT (Soulbound ERC-721)...");
  const SkillCredentialNFT = await ethers.getContractFactory("SkillCredentialNFT");
  const credentialNFT = await SkillCredentialNFT.deploy(deployer.address);
  await credentialNFT.waitForDeployment();
  const credentialAddress = await credentialNFT.getAddress();
  const credTxHash = credentialNFT.deploymentTransaction()?.hash || "";
  console.log("✅ SkillCredentialNFT deployed to:", credentialAddress);
  console.log("   Transaction Hash:             ", credTxHash);

  // 2. Deploy SkillRewardToken (ERC-20 SKILL)
  console.log("\n2. Deploying SkillRewardToken (ERC-20 SKILL)...");
  const SkillRewardToken = await ethers.getContractFactory("SkillRewardToken");
  const rewardToken = await SkillRewardToken.deploy(deployer.address);
  await rewardToken.waitForDeployment();
  const rewardAddress = await rewardToken.getAddress();
  const rewTxHash = rewardToken.deploymentTransaction()?.hash || "";
  console.log("✅ SkillRewardToken deployed to:", rewardAddress);
  console.log("   Transaction Hash:             ", rewTxHash);

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
  const regTxHash = registry.deploymentTransaction()?.hash || "";
  console.log("✅ SkillProtocolRegistry deployed to:", registryAddress);
  console.log("   Transaction Hash:             ", regTxHash);

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

  // 5. Verify Bytecode and Roles on-chain
  console.log("\n5. Verifying deployed contract bytecode and references...");
  const credCode = await ethers.provider.getCode(credentialAddress);
  const tokenCode = await ethers.provider.getCode(rewardAddress);
  const regCode = await ethers.provider.getCode(registryAddress);

  if (credCode === "0x" || tokenCode === "0x" || regCode === "0x") {
    throw new Error("Bytecode verification failed! One or more contracts are missing deployed bytecode on-chain.");
  }
  console.log("✅ Bytecode confirmed at all 3 contract addresses.");

  const hasNftMinter = await credentialNFT.hasRole(MINTER_ROLE, registryAddress);
  const hasTokenMinter = await rewardToken.hasRole(MINTER_ROLE, registryAddress);
  const regNftRef = await registry.credentialNFT();
  const regTokenRef = await registry.rewardToken();

  if (!hasNftMinter || !hasTokenMinter || regNftRef !== credentialAddress || regTokenRef !== rewardAddress) {
    throw new Error("Role or reference verification failed!");
  }
  console.log("✅ Verified all contract references and AccessControl roles on-chain.");

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
        txHash: credTxHash,
        abi: JSON.parse(credentialNFT.interface.formatJson()),
      },
      SkillRewardToken: {
        address: rewardAddress,
        txHash: rewTxHash,
        abi: JSON.parse(rewardToken.interface.formatJson()),
      },
      SkillProtocolRegistry: {
        address: registryAddress,
        txHash: regTxHash,
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
  console.log("\n📁 Exported contract addresses, txHashes, and ABIs to:", outputPath);

  // Also write deployment-info.json in contracts directory
  const localOutputPath = path.join(__dirname, "../deployment-info.json");
  fs.writeFileSync(localOutputPath, JSON.stringify(deploymentData, null, 2));

  // 6. Optional Etherscan Source Verification
  if (network.name === "sepolia" && process.env.ETHERSCAN_API_KEY) {
    console.log("\n6. Attempting Etherscan source verification...");
    const { run } = require("hardhat");
    try {
      console.log("Verifying SkillCredentialNFT...");
      await run("verify:verify", {
        address: credentialAddress,
        constructorArguments: [deployer.address],
      });
      console.log("✅ Verified SkillCredentialNFT on Etherscan");
    } catch (err) {
      console.warn("⚠️ SkillCredentialNFT verification:", err.message);
    }

    try {
      console.log("Verifying SkillRewardToken...");
      await run("verify:verify", {
        address: rewardAddress,
        constructorArguments: [deployer.address],
      });
      console.log("✅ Verified SkillRewardToken on Etherscan");
    } catch (err) {
      console.warn("⚠️ SkillRewardToken verification:", err.message);
    }

    try {
      console.log("Verifying SkillProtocolRegistry...");
      await run("verify:verify", {
        address: registryAddress,
        constructorArguments: [credentialAddress, rewardAddress, deployer.address],
      });
      console.log("✅ Verified SkillProtocolRegistry on Etherscan");
    } catch (err) {
      console.warn("⚠️ SkillProtocolRegistry verification:", err.message);
    }
  }

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

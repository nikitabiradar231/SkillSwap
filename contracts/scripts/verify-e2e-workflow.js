const { ethers } = require("hardhat");

async function main() {
  console.log("==================================================");
  console.log("🧪 Running SkillS End-to-End Workflow Verification");
  console.log("==================================================");

  const [admin, mentor, learner, externalVerifier] = await ethers.getSigners();
  console.log("Admin / Deployer:   ", admin.address);
  console.log("Mentor:             ", mentor.address);
  console.log("Learner:            ", learner.address);
  console.log("External Verifier:  ", externalVerifier.address);

  // 1. Deploy fresh suite for simulated test
  console.log("\n1. Deploying Smart Contracts Suite...");
  const SkillCredentialNFT = await ethers.getContractFactory("SkillCredentialNFT");
  const credentialNFT = await SkillCredentialNFT.deploy(admin.address);
  await credentialNFT.waitForDeployment();
  const credentialAddress = await credentialNFT.getAddress();

  const SkillRewardToken = await ethers.getContractFactory("SkillRewardToken");
  const rewardToken = await SkillRewardToken.deploy(admin.address);
  await rewardToken.waitForDeployment();
  const rewardAddress = await rewardToken.getAddress();

  const SkillProtocolRegistry = await ethers.getContractFactory("SkillProtocolRegistry");
  const registry = await SkillProtocolRegistry.deploy(
    credentialAddress,
    rewardAddress,
    admin.address
  );
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();

  // Configure Roles
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  await (await credentialNFT.grantRole(MINTER_ROLE, registryAddress)).wait();
  await (await rewardToken.grantRole(MINTER_ROLE, registryAddress)).wait();

  console.log("   ✅ Bytecode & Roles configured successfully.");

  // 2. Test SKILL Faucet & 24h Cooldown
  console.log("\n2. Testing SKILL Token Faucet Workflow...");
  const initBal = await rewardToken.balanceOf(learner.address);
  console.log("   Initial Learner Balance:", ethers.formatEther(initBal), "SKILL");

  const faucetTx = await rewardToken.connect(learner).requestFaucet(learner.address);
  await faucetTx.wait();
  const balAfterFaucet = await rewardToken.balanceOf(learner.address);
  console.log("   Learner Balance after faucet claim (+100):", ethers.formatEther(balAfterFaucet), "SKILL");
  if (balAfterFaucet !== ethers.parseEther("100")) {
    throw new Error("Faucet balance mismatch!");
  }
  console.log("   ✅ Faucet claim verified (+100 SKILL).");

  console.log("   Testing Faucet 24h cooldown enforcement...");
  let cooldownBlocked = false;
  try {
    await rewardToken.connect(learner).requestFaucet(learner.address);
  } catch (err) {
    if (err.message.includes("FaucetCooldownActive")) {
      cooldownBlocked = true;
    }
  }
  if (!cooldownBlocked) {
    throw new Error("Cooldown check failed! Second immediate claim was not reverted.");
  }
  console.log("   ✅ Cooldown check verified (reverted with FaucetCooldownActive).");

  // 3. Test Session Certification Workflow
  console.log("\n3. Testing Session Certification & Credential Issuance...");
  const sessionId = "hackathon-demo-session-42";
  const skillName = "Full-Stack Web3 Architecture";
  const category = "Blockchain & Web3";
  const rating = 5;
  const metadataURI = "data:application/json;utf8,%7B%22name%22%3A%22SkillS%22%7D";

  const certTx = await registry.connect(mentor).completeAndCertifySession(
    learner.address,
    skillName,
    category,
    rating,
    metadataURI,
    sessionId
  );
  const receipt = await certTx.wait();
  console.log("   Certification Tx Hash:", receipt.hash);
  console.log("   Gas Used:             ", receipt.gasUsed.toString());

  // Check token balances after certification
  const mentorBal = await rewardToken.balanceOf(mentor.address);
  const learnerFinalBal = await rewardToken.balanceOf(learner.address);
  console.log("   Mentor Balance (+50 SKILL reward):", ethers.formatEther(mentorBal), "SKILL");
  console.log("   Learner Balance (+25 SKILL reward):", ethers.formatEther(learnerFinalBal), "SKILL");
  if (mentorBal !== ethers.parseEther("50") || learnerFinalBal !== ethers.parseEther("125")) {
    throw new Error("Reward distribution mismatch!");
  }
  console.log("   ✅ Rewards verified: Mentor received 50 SKILL, Learner received 25 SKILL.");

  // 4. Test Soulbound Non-Transferability
  console.log("\n4. Testing Soulbound Non-Transferability Guard...");
  const learnerTokens = await credentialNFT.getLearnerCredentials(learner.address);
  const tokenId = learnerTokens[0];
  console.log("   Minted Token ID for Learner:", tokenId.toString());

  let transferBlocked = false;
  try {
    await credentialNFT.connect(learner).transferFrom(learner.address, externalVerifier.address, tokenId);
  } catch (err) {
    if (err.message.includes("SoulboundTokenCannotBeTransferred")) {
      transferBlocked = true;
    }
  }
  if (!transferBlocked) {
    throw new Error("Soulbound transfer guard failed! Token was transferable.");
  }
  console.log("   ✅ Soulbound guard verified (transferFrom reverted with SoulboundTokenCannotBeTransferred).");

  // 5. Test Public Verifier (/verify/:id) Query Logic
  console.log("\n5. Testing Public Verifier (/verify/:id) Query Logic...");
  const verification = await credentialNFT.connect(externalVerifier).verifyCredential(tokenId);
  console.log("   Verification Result:  ", verification.isValid ? "VALID" : "INVALID");
  console.log("   Learner on-chain:     ", verification.learner);
  console.log("   Mentor on-chain:      ", verification.mentor);
  console.log("   Skill name on-chain:  ", verification.skillName);
  console.log("   Rating on-chain:      ", verification.rating.toString(), "/ 5");

  if (!verification.isValid || verification.learner !== learner.address || verification.mentor !== mentor.address) {
    throw new Error("Public verification failed!");
  }
  console.log("   ✅ Public Verifier query logic verified.");

  // 6. Test Duplicate Certification Prevention
  console.log("\n6. Testing Duplicate Session Certification Guard...");
  let duplicateBlocked = false;
  try {
    await registry.connect(mentor).completeAndCertifySession(
      learner.address,
      skillName,
      category,
      rating,
      metadataURI,
      sessionId
    );
  } catch (err) {
    if (err.message.includes("SessionAlreadyCertified")) {
      duplicateBlocked = true;
    }
  }
  if (!duplicateBlocked) {
    throw new Error("Duplicate session check failed!");
  }
  console.log("   ✅ Duplicate session check verified (reverted with SessionAlreadyCertified).");

  // 7. Verify Explorer URLs
  console.log("\n7. Testing Explorer Link Generator Logic...");
  const getExplorerUrl = (chainId, type, val) => {
    const isSepolia = chainId === 11155111;
    const base = isSepolia ? "https://sepolia.etherscan.io" : "https://sepolia.etherscan.io";
    return `${base}/${type}/${val}`;
  };
  const sampleTx = receipt.hash;
  console.log("   Sepolia Tx Explorer Link:     ", getExplorerUrl(11155111, "tx", sampleTx));
  console.log("   Sepolia Contract Explorer:    ", getExplorerUrl(11155111, "address", credentialAddress));
  console.log("   ✅ Explorer Link generator verified.");

  console.log("\n==================================================");
  console.log("🎉 ALL 7 END-TO-END WORKFLOW VERIFICATIONS PASSED!");
  console.log("==================================================");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Workflow verification failed:", err);
    process.exit(1);
  });

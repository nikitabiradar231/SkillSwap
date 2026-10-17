const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SkillS Protocol Suite", function () {
  let admin, mentor, learner, stranger;
  let credentialNFT, rewardToken, registry;
  let MINTER_ROLE, REVOKER_ROLE;

  beforeEach(async function () {
    [admin, mentor, learner, stranger] = await ethers.getSigners();

    // 1. Deploy SkillCredentialNFT
    const SkillCredentialNFT = await ethers.getContractFactory("SkillCredentialNFT");
    credentialNFT = await SkillCredentialNFT.deploy(admin.address);
    await credentialNFT.waitForDeployment();

    // 2. Deploy SkillRewardToken
    const SkillRewardToken = await ethers.getContractFactory("SkillRewardToken");
    rewardToken = await SkillRewardToken.deploy(admin.address);
    await rewardToken.waitForDeployment();

    // 3. Deploy SkillProtocolRegistry
    const SkillProtocolRegistry = await ethers.getContractFactory("SkillProtocolRegistry");
    registry = await SkillProtocolRegistry.deploy(
      await credentialNFT.getAddress(),
      await rewardToken.getAddress(),
      admin.address
    );
    await registry.waitForDeployment();

    // 4. Configure Roles
    MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    REVOKER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REVOKER_ROLE"));

    await credentialNFT.grantRole(MINTER_ROLE, await registry.getAddress());
    await rewardToken.grantRole(MINTER_ROLE, await registry.getAddress());
  });

  describe("SkillCredentialNFT (Soulbound Certificate)", function () {
    it("Should only allow MINTER_ROLE to mint credentials", async function () {
      await expect(
        credentialNFT.connect(stranger).mintCredential(
          learner.address,
          mentor.address,
          "Full-Stack React",
          "Web Development",
          5,
          "ipfs://sample-hash"
        )
      ).to.be.revertedWithCustomError(credentialNFT, "AccessControlUnauthorizedAccount");
    });

    it("Should revert transfers (Soulbound enforcement)", async function () {
      // Mint directly via admin (who we can temporarily grant MINTER_ROLE)
      await credentialNFT.grantRole(MINTER_ROLE, admin.address);
      const tx = await credentialNFT.mintCredential(
        learner.address,
        mentor.address,
        "Solidity Smart Contracts",
        "Blockchain",
        5,
        "ipfs://sample-hash"
      );
      await tx.wait();

      // Attempt transfer from learner to stranger
      await expect(
        credentialNFT.connect(learner).transferFrom(learner.address, stranger.address, 1)
      ).to.be.revertedWithCustomError(credentialNFT, "SoulboundTokenCannotBeTransferred");
    });

    it("Should support verification and return accurate data", async function () {
      await credentialNFT.grantRole(MINTER_ROLE, admin.address);
      await credentialNFT.mintCredential(
        learner.address,
        mentor.address,
        "Solidity Security",
        "Blockchain",
        5,
        "ipfs://sample-hash"
      );

      const verification = await credentialNFT.verifyCredential(1);
      expect(verification.isValid).to.be.true;
      expect(verification.learner).to.equal(learner.address);
      expect(verification.mentor).to.equal(mentor.address);
      expect(verification.skillName).to.equal("Solidity Security");
      expect(verification.rating).to.equal(5);
      expect(verification.isRevoked).to.be.false;

      const creds = await credentialNFT.getLearnerCredentials(learner.address);
      expect(creds.length).to.equal(1);
      expect(creds[0]).to.equal(1n);
    });

    it("Should allow REVOKER_ROLE to revoke credentials", async function () {
      await credentialNFT.grantRole(MINTER_ROLE, admin.address);
      await credentialNFT.mintCredential(
        learner.address,
        mentor.address,
        "Solidity Security",
        "Blockchain",
        5,
        "ipfs://sample-hash"
      );

      await credentialNFT.connect(admin).revokeCredential(1, "Academic dishonesty in code submission");
      const cred = await credentialNFT.getCredential(1);
      expect(cred.revoked).to.be.true;
      expect(cred.revokeReason).to.equal("Academic dishonesty in code submission");

      const verification = await credentialNFT.verifyCredential(1);
      expect(verification.isValid).to.be.false;
      expect(verification.isRevoked).to.be.true;
    });
  });

  describe("SkillRewardToken (SKILL ERC-20)", function () {
    it("Should mint initial ecosystem pool to admin", async function () {
      const balance = await rewardToken.balanceOf(admin.address);
      expect(balance).to.equal(ethers.parseEther("1000000"));
    });

    it("Should allow testnet faucet requests with cooldown", async function () {
      await rewardToken.connect(stranger).requestFaucet(stranger.address);
      const balance = await rewardToken.balanceOf(stranger.address);
      expect(balance).to.equal(ethers.parseEther("100"));

      // Consecutive request should revert due to cooldown
      await expect(
        rewardToken.connect(stranger).requestFaucet(stranger.address)
      ).to.be.revertedWithCustomError(rewardToken, "FaucetCooldownActive");
    });
  });

  describe("SkillProtocolRegistry (End-to-End Workflow)", function () {
    it("Should allow a mentor to register", async function () {
      await registry.connect(mentor).registerMentor("Alice Smith", "Senior Web3 Engineer & Educator");
      const stats = await registry.getMentorStats(mentor.address);
      expect(stats.name).to.equal("Alice Smith");
      expect(stats.isRegistered).to.be.true;
      expect(stats.totalSessions).to.equal(0n);
    });

    it("Should certify a session, mint credential, and distribute SKILL rewards", async function () {
      const sessionId = "session-test-uuid-1234";

      const tx = await registry.connect(mentor).completeAndCertifySession(
        learner.address,
        "React Performance Optimization",
        "Frontend",
        5,
        "ipfs://test-metadata-uri",
        sessionId
      );
      await tx.wait();

      // Check Credential was minted to learner
      const learnerCreds = await credentialNFT.getLearnerCredentials(learner.address);
      expect(learnerCreds.length).to.equal(1);
      expect(await credentialNFT.ownerOf(learnerCreds[0])).to.equal(learner.address);

      // Check token balances
      const mentorTokens = await rewardToken.balanceOf(mentor.address);
      const learnerTokens = await rewardToken.balanceOf(learner.address);
      expect(mentorTokens).to.equal(ethers.parseEther("50"));
      expect(learnerTokens).to.equal(ethers.parseEther("25"));

      // Check mentor stats updated
      const stats = await registry.getMentorStats(mentor.address);
      expect(stats.totalSessions).to.equal(1n);
      expect(stats.avgRatingScaled).to.equal(500n); // 5.00 scaled by 100

      // Check session status in registry
      const [certified, tokenId] = await registry.isSessionCertified(sessionId);
      expect(certified).to.be.true;
      expect(tokenId).to.equal(learnerCreds[0]);
    });

    it("Should prevent self-certification", async function () {
      await expect(
        registry.connect(mentor).completeAndCertifySession(
          mentor.address, // self
          "Cheating Attempt",
          "Misc",
          5,
          "ipfs://fake",
          "session-fake-id"
        )
      ).to.be.revertedWithCustomError(registry, "SelfCertificationNotAllowed");
    });

    it("Should prevent duplicate certification of the same session ID", async function () {
      const sessionId = "duplicate-check-session";
      await registry.connect(mentor).completeAndCertifySession(
        learner.address,
        "Rust Fundamentals",
        "Systems Programming",
        4,
        "ipfs://rust-uri",
        sessionId
      );

      // Second attempt with same session ID must fail
      await expect(
        registry.connect(mentor).completeAndCertifySession(
          learner.address,
          "Rust Fundamentals",
          "Systems Programming",
          4,
          "ipfs://rust-uri",
          sessionId
        )
      ).to.be.revertedWithCustomError(registry, "SessionAlreadyCertified");
    });

    it("Should validate rating bounds", async function () {
      await expect(
        registry.connect(mentor).completeAndCertifySession(
          learner.address,
          "Python",
          "Backend",
          0, // invalid rating
          "ipfs://uri",
          "session-invalid-rating"
        )
      ).to.be.revertedWithCustomError(registry, "InvalidRating");

      await expect(
        registry.connect(mentor).completeAndCertifySession(
          learner.address,
          "Python",
          "Backend",
          6, // invalid rating > 5
          "ipfs://uri",
          "session-invalid-rating-2"
        )
      ).to.be.revertedWithCustomError(registry, "InvalidRating");
    });
  });
});

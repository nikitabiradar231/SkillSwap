// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./SkillCredentialNFT.sol";
import "./SkillRewardToken.sol";

/**
 * @title SkillProtocolRegistry
 * @notice Central coordination contract for SkillS peer-to-peer verification,
 * managing verifiable achievement issuance, mentor registries, and skill reward distributions.
 */
contract SkillProtocolRegistry is Ownable, Pausable, ReentrancyGuard {
    SkillCredentialNFT public immutable credentialNFT;
    SkillRewardToken public immutable rewardToken;

    uint256 public mentorRewardAmount = 50 * 10**18; // 50 SKILL
    uint256 public learnerRewardAmount = 25 * 10**18; // 25 SKILL

    struct MentorProfile {
        string name;
        string bio;
        uint256 registeredAt;
        uint256 totalSessionsCertified;
        uint256 totalScoreSum;
        bool isRegistered;
    }

    // Mapping from mentor address to MentorProfile
    mapping(address => MentorProfile) public mentors;
    address[] public registeredMentorList;

    // Mapping from hashed session ID to whether it has already been certified on-chain
    mapping(bytes32 => bool) public certifiedSessions;

    // Mapping from hashed session ID to issued token ID
    mapping(bytes32 => uint256) public sessionToTokenId;

    event MentorRegistered(address indexed mentor, string name, uint256 timestamp);
    event SessionCertified(
        bytes32 indexed sessionIdHash,
        uint256 indexed tokenId,
        address indexed mentor,
        address learner,
        string skillName
    );
    event RewardsUpdated(uint256 newMentorReward, uint256 newLearnerReward);

    error InvalidAddress();
    error SelfCertificationNotAllowed();
    error SessionAlreadyCertified();
    error MentorAlreadyRegistered();
    error MentorNotRegistered();
    error InvalidRating();
    error EmptyString();

    constructor(
        address _credentialNFT,
        address _rewardToken,
        address _initialOwner
    ) Ownable(_initialOwner) {
        if (_credentialNFT == address(0) || _rewardToken == address(0) || _initialOwner == address(0)) {
            revert InvalidAddress();
        }
        credentialNFT = SkillCredentialNFT(_credentialNFT);
        rewardToken = SkillRewardToken(_rewardToken);
    }

    /**
     * @notice Register as a verified peer mentor on the SkillS protocol.
     */
    function registerMentor(string calldata name, string calldata bio) external whenNotPaused {
        if (bytes(name).length == 0) revert EmptyString();
        if (mentors[msg.sender].isRegistered) revert MentorAlreadyRegistered();

        mentors[msg.sender] = MentorProfile({
            name: name,
            bio: bio,
            registeredAt: block.timestamp,
            totalSessionsCertified: 0,
            totalScoreSum: 0,
            isRegistered: true
        });

        registeredMentorList.push(msg.sender);
        emit MentorRegistered(msg.sender, name, block.timestamp);
    }

    /**
     * @notice Certify a completed peer learning session, mint a Soulbound Credential NFT to the learner,
     * and distribute SKILL reward tokens.
     */
    function completeAndCertifySession(
        address learner,
        string calldata skillName,
        string calldata category,
        uint8 rating,
        string calldata metadataURI,
        string calldata sessionId
    ) external whenNotPaused nonReentrant returns (uint256) {
        if (learner == address(0)) revert InvalidAddress();
        if (learner == msg.sender) revert SelfCertificationNotAllowed();
        if (bytes(skillName).length == 0) revert EmptyString();
        if (rating < 1 || rating > 5) revert InvalidRating();

        bytes32 sessionHash = keccak256(abi.encodePacked(sessionId));
        if (certifiedSessions[sessionHash]) revert SessionAlreadyCertified();

        certifiedSessions[sessionHash] = true;

        // Auto-register mentor if first time
        if (!mentors[msg.sender].isRegistered) {
            mentors[msg.sender] = MentorProfile({
                name: "Peer Mentor",
                bio: "SkillS Community Contributor",
                registeredAt: block.timestamp,
                totalSessionsCertified: 0,
                totalScoreSum: 0,
                isRegistered: true
            });
            registeredMentorList.push(msg.sender);
            emit MentorRegistered(msg.sender, "Peer Mentor", block.timestamp);
        }

        // Update mentor stats
        mentors[msg.sender].totalSessionsCertified += 1;
        mentors[msg.sender].totalScoreSum += rating;

        // Mint Soulbound Credential NFT
        uint256 tokenId = credentialNFT.mintCredential(
            learner,
            msg.sender,
            skillName,
            category,
            rating,
            metadataURI
        );

        sessionToTokenId[sessionHash] = tokenId;

        // Distribute token rewards
        if (mentorRewardAmount > 0 || learnerRewardAmount > 0) {
            try rewardToken.rewardParticipation(msg.sender, learner, mentorRewardAmount, learnerRewardAmount) {
                // Tokens transferred successfully
            } catch {
                // If reward pool is exhausted, credential issuance still succeeds
            }
        }

        emit SessionCertified(
            sessionHash,
            tokenId,
            msg.sender,
            learner,
            skillName
        );

        return tokenId;
    }

    /**
     * @notice Returns mentor statistics: total sessions, average rating (scaled by 100).
     */
    function getMentorStats(address mentor)
        external
        view
        returns (
            string memory name,
            string memory bio,
            uint256 totalSessions,
            uint256 avgRatingScaled,
            bool isRegistered
        )
    {
        MentorProfile memory p = mentors[mentor];
        uint256 avg = 0;
        if (p.totalSessionsCertified > 0) {
            avg = (p.totalScoreSum * 100) / p.totalSessionsCertified;
        }
        return (p.name, p.bio, p.totalSessionsCertified, avg, p.isRegistered);
    }

    /**
     * @notice Returns total number of registered mentors.
     */
    function getMentorCount() external view returns (uint256) {
        return registeredMentorList.length;
    }

    /**
     * @notice Check whether a given session ID was certified.
     */
    function isSessionCertified(string calldata sessionId) external view returns (bool, uint256) {
        bytes32 sessionHash = keccak256(abi.encodePacked(sessionId));
        return (certifiedSessions[sessionHash], sessionToTokenId[sessionHash]);
    }

    // Owner management functions
    function setRewardAmounts(uint256 newMentorReward, uint256 newLearnerReward) external onlyOwner {
        mentorRewardAmount = newMentorReward;
        learnerRewardAmount = newLearnerReward;
        emit RewardsUpdated(newMentorReward, newLearnerReward);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}

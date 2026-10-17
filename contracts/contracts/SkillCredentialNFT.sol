// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SkillCredentialNFT
 * @notice Soulbound (non-transferable) ERC-721 token representing verified skill achievements
 * and completion badges on Ethereum.
 */
contract SkillCredentialNFT is ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant REVOKER_ROLE = keccak256("REVOKER_ROLE");

    error SoulboundTokenCannotBeTransferred();
    error CredentialDoesNotExist();
    error CredentialAlreadyRevoked();
    error InvalidAddress();
    error InvalidRating();
    error EmptyString();

    struct Credential {
        uint256 id;
        address learner;
        address mentor;
        string skillName;
        string category;
        uint256 issueDate;
        uint8 rating; // 1 - 5
        string metadataURI;
        bool revoked;
        string revokeReason;
    }

    uint256 private _nextTokenId;
    mapping(uint256 => Credential) private _credentials;
    mapping(address => uint256[]) private _learnerCredentials;

    event CredentialIssued(
        uint256 indexed tokenId,
        address indexed learner,
        address indexed mentor,
        string skillName,
        string category,
        uint8 rating,
        uint256 issueDate
    );

    event CredentialRevoked(
        uint256 indexed tokenId,
        address indexed revokedBy,
        string reason,
        uint256 timestamp
    );

    constructor(address defaultAdmin) ERC721("SkillS Verified Credential", "SKILLCERT") {
        if (defaultAdmin == address(0)) revert InvalidAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(REVOKER_ROLE, defaultAdmin);
        _nextTokenId = 1; // start at 1 for clearer display
    }

    /**
     * @notice Enforces Soulbound behavior: tokens can only be minted (from == 0) or burned (to == 0).
     * Transfers between accounts are strictly disallowed to maintain credential authenticity.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert SoulboundTokenCannotBeTransferred();
        }
        return super._update(to, tokenId, auth);
    }

    /**
     * @notice Mint a new verifiable skill credential to the learner.
     * @dev Restricted to callers with MINTER_ROLE (such as the SkillProtocolRegistry).
     */
    function mintCredential(
        address learner,
        address mentor,
        string calldata skillName,
        string calldata category,
        uint8 rating,
        string calldata tokenUri
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        if (learner == address(0) || mentor == address(0)) revert InvalidAddress();
        if (bytes(skillName).length == 0) revert EmptyString();
        if (rating < 1 || rating > 5) revert InvalidRating();

        uint256 tokenId = _nextTokenId++;

        _safeMint(learner, tokenId);
        _setTokenURI(tokenId, tokenUri);

        _credentials[tokenId] = Credential({
            id: tokenId,
            learner: learner,
            mentor: mentor,
            skillName: skillName,
            category: category,
            issueDate: block.timestamp,
            rating: rating,
            metadataURI: tokenUri,
            revoked: false,
            revokeReason: ""
        });

        _learnerCredentials[learner].push(tokenId);

        emit CredentialIssued(tokenId, learner, mentor, skillName, category, rating, block.timestamp);
        return tokenId;
    }

    /**
     * @notice Revoke a credential in case of academic misconduct or fraudulent submission.
     */
    function revokeCredential(uint256 tokenId, string calldata reason) external onlyRole(REVOKER_ROLE) {
        if (_ownerOf(tokenId) == address(0)) revert CredentialDoesNotExist();
        Credential storage cred = _credentials[tokenId];
        if (cred.revoked) revert CredentialAlreadyRevoked();

        cred.revoked = true;
        cred.revokeReason = reason;

        emit CredentialRevoked(tokenId, msg.sender, reason, block.timestamp);
    }

    /**
     * @notice Returns full credential details for a given token ID.
     */
    function getCredential(uint256 tokenId) external view returns (Credential memory) {
        if (_ownerOf(tokenId) == address(0)) revert CredentialDoesNotExist();
        return _credentials[tokenId];
    }

    /**
     * @notice Lightweight public verification helper for instant on-chain validation.
     */
    function verifyCredential(uint256 tokenId)
        external
        view
        returns (
            bool isValid,
            address learner,
            address mentor,
            string memory skillName,
            string memory category,
            uint256 issueDate,
            uint8 rating,
            bool isRevoked
        )
    {
        if (_ownerOf(tokenId) == address(0)) {
            return (false, address(0), address(0), "", "", 0, 0, false);
        }
        Credential memory cred = _credentials[tokenId];
        return (
            !cred.revoked,
            cred.learner,
            cred.mentor,
            cred.skillName,
            cred.category,
            cred.issueDate,
            cred.rating,
            cred.revoked
        );
    }

    /**
     * @notice Returns all credential token IDs earned by a learner address.
     */
    function getLearnerCredentials(address learner) external view returns (uint256[] memory) {
        return _learnerCredentials[learner];
    }

    /**
     * @notice Total number of credentials minted so far.
     */
    function totalCredentials() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

# 🎓 SkillS — Decentralized Peer Learning & Verified On-Chain Credentials

> *Transforming peer-to-peer skill sharing with tamper-proof Soulbound ERC-721 achievement badges and ERC-20 SKILL reward tokens on Ethereum.*

[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity)](https://soliditylang.org/)
[![Ethereum](https://img.shields.io/badge/Network-Sepolia%20%7C%20Localhost-627EEA?logo=ethereum)](https://sepolia.etherscan.io/)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB?logo=react)](https://react.dev/)
[![Hardhat](https://img.shields.io/badge/Smart%20Contracts-Hardhat-yellow?logo=ethereum)](https://hardhat.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> [!TIP]
> **🚀 Live Public Web App**: The SkillSwap frontend is publicly deployed on Vercel at:  
> **🔗 [https://client-orpin-xi-50.vercel.app](https://client-orpin-xi-50.vercel.app)**  
> **Direct Public Verifier**: [https://client-orpin-xi-50.vercel.app/verify](https://client-orpin-xi-50.vercel.app/verify)  
> **GitHub Repository**: [https://github.com/nikitabiradar231/SkillSwap](https://github.com/nikitabiradar231/SkillSwap)

---

## 📌 Executive Summary & Problem Statement

In traditional online education and skill-sharing platforms:
1. **Unverifiable Credentials & Resume Fraud**: Anyone can claim expertise or certificates on LinkedIn and CVs with zero cryptographic proof. Centralized certificate databases can be altered, shut down, or falsified.
2. **Lack of Verifiable Mentorship Proof**: Mentors dedicate hours tutoring peers without receiving permanent, immutable proof of mentorship or reputation on an open ledger.
3. **Walled Gardens & Intermediary Fees**: Centralized tutoring networks take steep fees (20–40%) from students and instructors without offering portable credentials.

### The SkillS Solution
**SkillS** is a peer-to-peer decentralized skill exchange and certification platform that unites:
- **Direct Peer Matching & Real-Time Collaboration**: 1-on-1 skill swaps, chat, and in-app WebRTC video calling.
- **Soulbound ERC-721 Credentials (`SkillCredentialNFT`)**: Tamper-proof, cryptographically non-transferable on-chain completion certificates minted directly to the learner's Ethereum wallet address upon verified session completion.
- **Community Reward Tokens (`SkillRewardToken - SKILL`)**: Automated ERC-20 token rewards granted to both mentors (+50 SKILL) and learners (+25 SKILL) upon milestone verification.
- **Zero-Trust Public Verifier (`/verify`)**: Open verification portal where recruiters, universities, and partners can independently inspect the cryptographic status of any credential directly from Ethereum contracts without needing a centralized backend.

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Web3 Client ["Frontend (React 19 + Vite + Ethers.js)"]
        UI[Marketplace & Session Management]
        Web3Ctx[Web3Context Provider]
        Modal[Issue Credential Modal]
        Verifier[Public Verification Portal /verify]
    end

    subgraph Backend ["Backend API & Signaling"]
        Server[Express.js API + MongoDB]
        Socket[Socket.io Signaling Server]
    end

    subgraph Blockchain ["Ethereum Testnet / Sepolia"]
        Registry[SkillProtocolRegistry.sol]
        NFT[SkillCredentialNFT.sol - Soulbound ERC-721]
        Token[SkillRewardToken.sol - ERC-20 SKILL]
    end

    UI -->|Auth & Profile| Server
    UI -->|Signaling for Video & Chat| Socket
    Web3Ctx -->|Wallet Connect & Network Check| MetaMask[MetaMask / Browser Wallet]
    Modal -->|completeAndCertifySession()| Registry
    Registry -->|mintCredential()| NFT
    Registry -->|rewardParticipation()| Token
    Verifier -->|verifyCredential() & getCredential()| NFT
    Token -->|requestFaucet()| MetaMask
```

---

## 📜 Smart Contract Suite

All smart contracts are developed with **Solidity `^0.8.24`**, target the **Cancun EVM**, utilize **OpenZeppelin Contracts v5**, and compile with `viaIR` optimization:

| Contract | Standard | Key Responsibilities |
|---|---|---|
| [`SkillCredentialNFT.sol`](./contracts/contracts/SkillCredentialNFT.sol) | **ERC-721 (Soulbound)** | Issues non-transferable skill credentials with on-chain metadata, star ratings, and revocation support. Transfers between users revert via `SoulboundTokenCannotBeTransferred`. |
| [`SkillRewardToken.sol`](./contracts/contracts/SkillRewardToken.sol) | **ERC-20 (`SKILL`)** | Ecosystem incentive token. Automatically rewards mentors (50 SKILL) and learners (25 SKILL). Includes a 24-hour rate-limited testnet faucet. |
| [`SkillProtocolRegistry.sol`](./contracts/contracts/SkillProtocolRegistry.sol) | **Core Orchestrator** | Coordinates certification workflows, checks session uniqueness (`SessionAlreadyCertified`), blocks self-certification (`SelfCertificationNotAllowed`), and manages mentor statistics. |

### Smart Contract Security & Attack Prevention
- **Reentrancy Protection**: Uses OpenZeppelin `ReentrancyGuard` on state-changing session certifications.
- **Access Control (`AccessControl` & `Ownable`)**: Only the `SkillProtocolRegistry` holds `MINTER_ROLE` on both `SkillCredentialNFT` and `SkillRewardToken`. Unauthorized direct minting is strictly prevented.
- **Anti-Fraud (Soulbound Non-Transferability)**: `_update` hook restricts token transfers; tokens cannot be sold, traded, or transferred to other addresses.
- **Duplicate Claim Prevention**: Each session is identified by `keccak256(sessionId)`. Once certified, repeated attempts revert with `SessionAlreadyCertified`.
- **Self-Certification Guard**: Mentors cannot issue credentials to themselves (`learner == msg.sender` reverts).
- **Rating Validation**: Instructor ratings are strictly validated between 1 and 5.

---

## ⚡ Smart Contract Deployment Status

| Network | Chain ID | Status | SkillCredentialNFT | SkillRewardToken | SkillProtocolRegistry |
|---|---|---|---|---|---|
| **Hardhat Localhost** | `31337` | **PASS (VERIFIED)** | `0x5FbDB2315678afecb367f032d93F642f64180aa3` | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |
| **Ethereum Sepolia** | `11155111` | **PASS (LIVE ON-CHAIN)** | [`0x601C9a636CE639789072c8214b24b1E5D0B5366D`](https://sepolia.etherscan.io/address/0x601C9a636CE639789072c8214b24b1E5D0B5366D) | [`0x1122d0721ac14c288C9a34682B153D8Ec7Cc481F`](https://sepolia.etherscan.io/address/0x1122d0721ac14c288C9a34682B153D8Ec7Cc481F) | [`0x9a2B851414EEa9b8752B41A4a3aB14ea2B932cfF`](https://sepolia.etherscan.io/address/0x9a2B851414EEa9b8752B41A4a3aB14ea2B932cfF) |

### Ethereum Sepolia Testnet Details (`11155111`)
Live on Ethereum Sepolia, verified on-chain, and recorded in [`deployedContracts.json`](file:///client/src/contracts/deployedContracts.json):
- **Deployer Wallet**: [`0x31e9117D0BfceA67088aA96e356473c52CF9f9fF`](https://sepolia.etherscan.io/address/0x31e9117D0BfceA67088aA96e356473c52CF9f9fF)
- **`SkillCredentialNFT`**: [`0x601C9a636CE639789072c8214b24b1E5D0B5366D`](https://sepolia.etherscan.io/address/0x601C9a636CE639789072c8214b24b1E5D0B5366D)  
  *Deployment Tx*: [`0xd8807e4a95deeef8eff59e444bd29401e9ef5dbc402d8ebe18b0aa8f9e1597e0`](https://sepolia.etherscan.io/tx/0xd8807e4a95deeef8eff59e444bd29401e9ef5dbc402d8ebe18b0aa8f9e1597e0)
- **`SkillRewardToken`**: [`0x1122d0721ac14c288C9a34682B153D8Ec7Cc481F`](https://sepolia.etherscan.io/address/0x1122d0721ac14c288C9a34682B153D8Ec7Cc481F)  
  *Deployment Tx*: [`0x2f82675f7cf876e2f96fab90909a0018dea9282a11e88d7a15320f3bf019b8a4`](https://sepolia.etherscan.io/tx/0x2f82675f7cf876e2f96fab90909a0018dea9282a11e88d7a15320f3bf019b8a4)
- **`SkillProtocolRegistry`**: [`0x9a2B851414EEa9b8752B41A4a3aB14ea2B932cfF`](https://sepolia.etherscan.io/address/0x9a2B851414EEa9b8752B41A4a3aB14ea2B932cfF)  
  *Deployment Tx*: [`0x09661adafb44b5d853140aca1ba72aaf5f67fb4967e040f8590c54feb0e3e2aa`](https://sepolia.etherscan.io/tx/0x09661adafb44b5d853140aca1ba72aaf5f67fb4967e040f8590c54feb0e3e2aa)

#### Live Verified Sepolia Interactions
- **Live Faucet Claim (+100 SKILL)**: [`0x34a1762b44dabb9640cd5767fb542b9101bc4848c9a52227efd9269b6749b0e1`](https://sepolia.etherscan.io/tx/0x34a1762b44dabb9640cd5767fb542b9101bc4848c9a52227efd9269b6749b0e1)
- **Genesis Session Certification Tx**: [`0x0fed074c11cf36aee1c6a7cc2414c3aa65e080bf59acc1253ea6e51b9ee185ea`](https://sepolia.etherscan.io/tx/0x0fed074c11cf36aee1c6a7cc2414c3aa65e080bf59acc1253ea6e51b9ee185ea) *(Initial on-chain certification & reward distribution)*

### Localhost Deployment Details (`31337`)
Contracts deployed, validated, and verified on local testnet with confirmed receipts:
- **`SkillCredentialNFT`**: [`0x5FbDB2315678afecb367f032d93F642f64180aa3`](file:///contracts/contracts/SkillCredentialNFT.sol) (Tx: `0x0c466c4bd5df9e7f7e46941a4cd5877b2ad64da81f0769c1430f90c905a67808`)
- **`SkillRewardToken`**: [`0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`](file:///contracts/contracts/SkillRewardToken.sol) (Tx: `0xce9c5f6bc1384f3fdf4e12d9795e6713869a90b956139a779033da1824de4cd1`)
- **`SkillProtocolRegistry`**: [`0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`](file:///contracts/contracts/SkillProtocolRegistry.sol) (Tx: `0x2b3ab755ea8118f5169458e7ec409a6de528ecef3310fea37539b3f1c21d7e9d`)

---

## 🚀 Quickstart & Installation Guide

### 1. Prerequisites
- **Node.js** v18+ (tested on Node v24)
- **MetaMask** or any Web3-compatible browser extension

### 2. Install Dependencies
Run the unified installer from the workspace root:
```bash
npm run install:all
```
*(Or install individually inside `contracts/`, `client/`, and `server/` via `npm install`)*.

### 3. Compile & Test Smart Contracts
Run the automated test suite (11 unit & integration tests):
```bash
npm run contracts:test
```
*Expected output: `11 passing`*

Run the simulated end-to-end workflow verification (7-step integration test):
```bash
npm run contracts:verify:workflow
```
*Expected output: `🎉 ALL 7 END-TO-END WORKFLOW VERIFICATIONS PASSED!`*

### 4. Deploy Contracts Locally (Optional)
In terminal 1, start the local Hardhat node:
```bash
npm run contracts:node
```
In terminal 2, deploy the contracts:
```bash
npm run contracts:deploy:local
```

### 5. Launch the Client Frontend
In terminal 3, start the Vite development server:
```bash
npm run client:dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 6. Launch Backend Server (Optional for MongoDB data)
```bash
npm run server:dev
```

---

## 🌐 Deployment & Architecture Matrix

SkillSwap combines decentralized Web3 smart contracts on Ethereum with an optional centralized backend for Web2 user features:

| Feature | Supported on Public Deployment (Vercel) | Requires Local Backend (`server/`) | Details |
|---|:---:|:---:|---|
| **MetaMask Wallet Connection** | ✅ | — | Non-custodial connection supporting Ethereum Sepolia and Hardhat Localhost |
| **Public Credential Verifier (`/verify`)** | ✅ | — | Zero-trust verification directly reading Ethereum Sepolia smart contract storage via JSON-RPC |
| **Direct Route Verification (`/verify/:id`)** | ✅ | — | Direct URLs and browser refreshes supported with client-side SPA routing |
| **SKILL Balance Reading** | ✅ | — | Real-time `balanceOf(account)` ERC-20 query |
| **Community Faucet Claim** | ✅ | — | Direct smart contract transaction (`requestFaucet`) with 24h rate-limiting |
| **On-Chain Session Certification** | ✅ | — | Mentor mints Soulbound NFT and distributes rewards directly via `completeAndCertifySession` |
| **User Registration & Login** | — | ✅ | MongoDB-backed JWT authentication |
| **Profile & Avatar Management** | — | ✅ | REST endpoints for user bios, avatar uploads, and skill listings |
| **Marketplace & Discovery** | — | ✅ | Database querying of teachers, learners, and skill requests |
| **In-App Direct Chat** | — | ✅ | Socket.io real-time chat with message persistence |
| **WebRTC Video Calling** | — | ✅ | Socket.io signaling server for peer-to-peer audio/video rooms |

---

## 📖 Web3 Workflow & Verification Guide

### 1. Web3 Wallet Connection
1. Open [https://client-orpin-xi-50.vercel.app](https://client-orpin-xi-50.vercel.app).
2. Click **Connect Wallet** in the navigation bar to connect MetaMask.
3. If connected to an unsupported network, use the **Switch Network** button to switch to **Ethereum Sepolia** (Chain ID: `11155111`).

### 2. Community SKILL Faucet
- Click the **Faucet** button in the Web3 status badge to claim **100 SKILL** tokens.
- The smart contract enforces a strict 24-hour cooldown per address (`FaucetCooldownActive`).

### 3. Soulbound Credential Certification
- When a peer learning session completes, the mentor certifies mastery via the certification modal.
- The `SkillProtocolRegistry` contract verifies:
  - The mentor is not certifying themselves (`SelfCertificationNotAllowed`).
  - The session has not already been certified (`SessionAlreadyCertified`).
  - The evaluation rating is between 1 and 5 stars (`InvalidRatingBounds`).
- Upon success, an immutable Soulbound ERC-721 credential is minted to the learner, and reward tokens (+50 SKILL to mentor, +25 SKILL to learner) are distributed.

### 4. Zero-Trust Public Verifier
- Navigate to `/verify` or access direct URL `/verify/:id`.
- Enter any Credential Token ID or learner Ethereum wallet address.
- The verifier queries the `SkillCredentialNFT` contract directly on-chain and displays:
  - Cryptographic validity status (Verified / Revoked)
  - Recipient learner and mentor addresses with Etherscan explorer links
  - Skill name, category, and evaluation rating (1–5 stars)
  - Issue timestamp and Soulbound non-transferability standard

---

## 🛡️ Automated Tests & Security Verification

All smart contract tests execute against the Hardhat in-memory blockchain:
```
  SkillS Protocol Suite
    SkillCredentialNFT (Soulbound Certificate)
      ✔ Should only allow MINTER_ROLE to mint credentials
      ✔ Should revert transfers (Soulbound enforcement)
      ✔ Should support verification and return accurate data
      ✔ Should allow REVOKER_ROLE to revoke credentials
    SkillRewardToken (SKILL ERC-20)
      ✔ Should mint initial ecosystem pool to admin
      ✔ Should allow testnet faucet requests with cooldown
    SkillProtocolRegistry (End-to-End Workflow)
      ✔ Should allow a mentor to register
      ✔ Should certify a session, mint credential, and distribute SKILL rewards
      ✔ Should prevent self-certification
      ✔ Should prevent duplicate certification of the same session ID
      ✔ Should validate rating bounds

  11 passing (2s)
```

Frontend build and lint status:
```bash
npm run client:lint   # 0 errors
npm run client:build  # Vite production bundle built successfully (0 errors)
```

---

## 📋 Platform Feature Status

- [x] **Smart Contracts Implemented**: `SkillCredentialNFT.sol`, `SkillRewardToken.sol`, `SkillProtocolRegistry.sol`
- [x] **Automated Test Suite**: 11 unit & integration tests covering roles, soulbound non-transferability, ratings, duplicate prevention, and token rewards.
- [x] **Local & Testnet Deployment Pipeline**: Automated script (`deploy.js`) with bytecode verification and multi-network record tracking.
- [x] **Web3 Provider & Wallet Connection**: `Web3Context` with MetaMask connection, account/chain listeners, network auto-switch, balance tracking.
- [x] **On-Chain Certification Workflow**: `IssueCredentialModal.jsx` integrated into session lifecycle.
- [x] **Public Verification Portal**: Dedicated `/verify` and `/verify/:id` route for zero-cost, zero-backend cryptographic verification.
- [x] **Community Faucet Integration**: In-app claim for 100 SKILL reward tokens with 24-hour rate limit.
- [x] **Security Review & Clean Environment**: `.env.example` templates created, 0 private keys committed, `.gitignore` configured.

---

## 🔮 Future Roadmap & Enhancements

- **Decentralized Storage Pinning**: Connect directly with Pinata or Web3.Storage for automated JSON IPFS pinning of rich portfolio media.
- **Layer 2 Deployments**: Deploy canonical registry to Arbitrum Sepolia / Base Sepolia for sub-cent gas fees during high-volume campus onboarding.
- **Mutual Dual-Signature Verification**: Optional multi-signature requirement where learner must co-sign before certificate minting.
- **Skill Escrow Bounties**: Learners locking SKILL or ETH in an escrow contract that automatically releases to a mentor upon verifiable completion.

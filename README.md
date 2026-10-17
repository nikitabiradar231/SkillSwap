# 🎓 SkillS — Decentralized Peer Learning & Verified On-Chain Credentials

> **Ethereum Testnet Hackathon Project**  
> *Transforming peer-to-peer skill sharing with tamper-proof Soulbound ERC-721 achievement badges and ERC-20 SKILL reward tokens.*

[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity)](https://soliditylang.org/)
[![Ethereum](https://img.shields.io/badge/Network-Sepolia%20%7C%20Localhost-627EEA?logo=ethereum)](https://sepolia.etherscan.io/)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB?logo=react)](https://react.dev/)
[![Hardhat](https://img.shields.io/badge/Smart%20Contracts-Hardhat-yellow?logo=ethereum)](https://hardhat.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> [!NOTE]
> **Frontend Hosting Notice**: This submission is configured for local evaluation via Vite dev server (`http://localhost:5173`). There is currently no publicly hosted cloud frontend URL; evaluation is conducted locally with MetaMask connected to either Hardhat Localhost (`31337`) or Ethereum Sepolia (`11155111`).

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
- **Campus & Community Reward Tokens (`SkillRewardToken - SKILL`)**: Automated ERC-20 token rewards granted to both mentors (+50 SKILL) and learners (+25 SKILL) upon milestone verification.
- **Zero-Trust Public Verifier (`/verify`)**: Open verification portal where recruiters, universities, or hackathon judges can independently inspect the cryptographic status of any credential directly from Ethereum contracts without needing a centralized backend.

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

## ⚡ Deployed Contract Addresses

### Localhost Testnet (Hardhat Chain ID: `31337`)
Contracts deployed, validated, and verified on local testnet:
- **`SkillCredentialNFT`**: `0x5FbDB2315678afecb367f032d93F642f64180aa3` (Tx: `0x0c466c4bd5df9e7f7e46941a4cd5877b2ad64da81f0769c1430f90c905a67808`)
- **`SkillRewardToken`**: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` (Tx: `0xce9c5f6bc1384f3fdf4e12d9795e6713869a90b956139a779033da1824de4cd1`)
- **`SkillProtocolRegistry`**: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` (Tx: `0x2b3ab755ea8118f5169458e7ec409a6de528ecef3310fea37539b3f1c21d7e9d`)

### Sepolia Testnet Deployment (Chain ID: `11155111`)
The deployment pipeline is fully prepared and validated. To broadcast to Ethereum Sepolia:
1. Provide `SEPOLIA_RPC_URL` and `PRIVATE_KEY` in `contracts/.env` (ignored by git).
2. Run:
   ```bash
   npm run contracts:deploy:sepolia
   ```
The deployment script will deploy all 3 contracts, verify bytecode, grant roles, and automatically save the Sepolia contract addresses, transaction hashes, and ABIs under `networks["11155111"]` in `client/src/contracts/deployedContracts.json`.

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

### 4. Deploy Contracts Locally
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

## 🧪 Hackathon Judge Demonstration Script

### Track A: Localhost Hardhat Demo (Ready Immediately)
1. **Connect MetaMask**:
   - Add network: RPC URL `http://127.0.0.1:8545`, Chain ID `31337`, Symbol `ETH`.
   - Import Hardhat Account #0 (`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`) or any test account.
2. **Claim SKILL Faucet Tokens**:
   - In the top navigation bar, click the **"Faucet"** button in the Web3 pill.
   - Confirm in MetaMask: 100 `SKILL` tokens are minted directly to your account.
   - Click faucet again immediately: verify the 24-hour rate limit cooldown is enforced.
3. **Certify a Completed Session**:
   - Navigate to `/sessions`.
   - Click **"Certify on Chain"** on a completed session.
   - Enter the learner's test wallet address, skill name, category, and 1–5 star rating.
   - Click **"Issue Credential NFT"** and approve the transaction.
   - The contract mints a Soulbound NFT to the learner and distributes +50 SKILL to the mentor and +25 SKILL to the learner!
4. **Inspect on Public Verifier**:
   - Navigate to `/verify/1` or enter the token ID in `/verify`.
   - The app reads the smart contract directly and displays the cryptographic proof badge, non-transferability verification, and block timestamp.

### Track B: Sepolia Testnet Demo
Once deployed to Sepolia (`11155111`):
1. Switch MetaMask to **Ethereum Sepolia**.
2. Perform the exact same workflow above.
3. Click the block explorer link to view the transaction and Soulbound NFT directly on [Sepolia Etherscan](https://sepolia.etherscan.io).

---

## 🛡️ Automated Tests & Security Verification

All tests run against Hardhat in-memory blockchain:
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

## 📋 Hackathon Deliverables Status

- [x] **Smart Contracts Implemented**: `SkillCredentialNFT.sol`, `SkillRewardToken.sol`, `SkillProtocolRegistry.sol`
- [x] **Automated Test Suite**: 11 unit & integration tests covering roles, soulbound non-transferability, ratings, duplicate prevention, and token rewards.
- [x] **Local & Testnet Deployment Pipeline**: Automated script (`deploy.js`) with bytecode verification and multi-network record tracking.
- [x] **Web3 Provider & Wallet Connection**: `Web3Context` with MetaMask connection, account/chain listeners, network auto-switch, balance tracking.
- [x] **On-Chain Certification Workflow**: `IssueCredentialModal.jsx` integrated into session lifecycle.
- [x] **Public Verification Portal**: Dedicated `/verify` and `/verify/:id` route for zero-cost, zero-backend cryptographic verification.
- [x] **Testnet Faucet Integration**: In-app claim for 100 SKILL reward tokens with 24-hour rate limit.
- [x] **Security Review & Clean Environment**: `.env.example` templates created, 0 real private keys committed, `.gitignore` configured.

---

## 🔮 Future Roadmap & Known Limitations

- **Decentralized Storage Pinning**: Connect directly with Pinata or Web3.Storage for automated JSON IPFS pinning of rich portfolio media.
- **Layer 2 Deployments**: Deploy canonical registry to Arbitrum Sepolia / Base Sepolia for sub-cent gas fees during high-volume campus onboarding.
- **Mutual Dual-Signature Verification**: Optional multi-signature requirement where learner must co-sign before certificate minting.
- **Skill Bounties**: Learners locking SKILL or ETH in an escrow contract that automatically releases to a mentor upon verifiable completion.

---

*Built with ❤️ for the Web3 Ethereum Testnet Hackathon.*

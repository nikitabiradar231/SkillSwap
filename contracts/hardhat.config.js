require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const rawKey = process.env.PRIVATE_KEY ? process.env.PRIVATE_KEY.trim() : "";
let normalizedKey = "";
if (rawKey) {
  normalizedKey = rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`;
}
const PRIVATE_KEY = normalizedKey && /^0x[0-9a-fA-F]{64}$/.test(normalizedKey) ? [normalizedKey] : [];
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL ? process.env.SEPOLIA_RPC_URL.trim() : "https://ethereum-sepolia-rpc.publicnode.com";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY ? process.env.ETHERSCAN_API_KEY.trim() : "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: PRIVATE_KEY.length > 0 ? PRIVATE_KEY : undefined,
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

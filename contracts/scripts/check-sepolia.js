const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function checkSepolia() {
  console.log("==================================================");
  console.log("🔍 SkillS Sepolia Deployment Preflight Diagnostic");
  console.log("==================================================");

  const envPath = path.join(__dirname, "../.env");
  const envExists = fs.existsSync(envPath);

  console.log("1. Configuration File Check:");
  console.log("   contracts/.env exists:", envExists ? "✅ YES" : "❌ NO");

  if (!envExists) {
    console.log("\n❌ ACTION REQUIRED:");
    console.log("   Create the file 'contracts/.env' in your project directory.");
    console.log("   Using PowerShell:");
    console.log("   Copy-Item 'contracts/.env.example' -Destination 'contracts/.env'");
    console.log("\n   Then open 'contracts/.env' and fill in your testnet values:");
    console.log("   SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com");
    console.log("   PRIVATE_KEY=your_64_character_hex_private_key_without_0x");
    console.log("   ETHERSCAN_API_KEY=optional_etherscan_api_key");
    console.log("==================================================");
    return;
  }

  const rawRpc = process.env.SEPOLIA_RPC_URL ? process.env.SEPOLIA_RPC_URL.trim() : "";
  const rawKey = process.env.PRIVATE_KEY ? process.env.PRIVATE_KEY.trim() : "";
  const etherscanKey = process.env.ETHERSCAN_API_KEY ? process.env.ETHERSCAN_API_KEY.trim() : "";

  console.log("\n2. Environment Variable Validation:");
  console.log("   SEPOLIA_RPC_URL:", rawRpc ? "✅ Defined" : "❌ Missing");
  console.log("   PRIVATE_KEY:    ", rawKey ? "✅ Defined (Protected)" : "❌ Missing");
  console.log("   ETHERSCAN_API_KEY:", etherscanKey ? "✅ Defined" : "⚪ Optional (Not set)");

  if (!rawKey) {
    console.log("\n❌ ACTION REQUIRED: PRIVATE_KEY is missing in contracts/.env.");
    console.log("   Please add: PRIVATE_KEY=<your_private_key>");
    return;
  }

  // Validate private key format without exposing value
  const cleanKey = rawKey.startsWith("0x") ? rawKey.slice(2) : rawKey;
  const isHex64 = /^[0-9a-fA-F]{64}$/.test(cleanKey);
  console.log("   Key Format Valid (64-hex):", isHex64 ? "✅ PASS" : "❌ FAIL (Must be 64 hex characters)");

  if (!isHex64) {
    console.log("\n❌ ACTION REQUIRED: Invalid private key format.");
    console.log("   The private key must consist of exactly 64 hexadecimal characters (0-9, a-f).");
    return;
  }

  const rpcUrl = rawRpc || "https://ethereum-sepolia-rpc.publicnode.com";
  console.log("\n3. RPC & Network Connectivity Test:");
  console.log("   Target RPC:  ", rpcUrl);

  let provider;
  try {
    provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    console.log("   Chain ID:    ", chainId, chainId === 11155111 ? "✅ (Sepolia Confirmed)" : "❌ Mismatch!");

    if (chainId !== 11155111) {
      console.log(`\n❌ Network mismatch: Expected 11155111, got ${chainId}. Check RPC URL.`);
      return;
    }
  } catch (err) {
    console.log("   ❌ RPC connection failed:", err.message);
    console.log("   Suggestion: Try public RPC: https://ethereum-sepolia-rpc.publicnode.com");
    return;
  }

  console.log("\n4. Deployer Account Status:");
  try {
    const formattedKey = cleanKey.startsWith("0x") ? cleanKey : `0x${cleanKey}`;
    const wallet = new ethers.Wallet(formattedKey, provider);
    console.log("   Deployer Address:", wallet.address);

    const balance = await provider.getBalance(wallet.address);
    const balEth = ethers.formatEther(balance);
    console.log("   Deployer Balance:", balEth, "Sepolia ETH");

    if (balance === 0n) {
      console.log("\n❌ INSUFFICIENT TESTNET FUNDS:");
      console.log(`   Deployer address ${wallet.address} has 0 ETH.`);
      console.log("   Obtain free Sepolia ETH from public faucets:");
      console.log("   - Google Cloud Web3 Faucet: https://cloud.google.com/application/web3/faucet/ethereum/sepolia");
      console.log("   - Alchemy Sepolia Faucet:    https://www.alchemy.com/faucets/ethereum-sepolia");
      console.log("   - PoW Sepolia Faucet:        https://sepolia-faucet.pk910.de/");
      console.log("==================================================");
      return;
    }

    if (balance < ethers.parseEther("0.005")) {
      console.log(`\n⚠️ Low Balance Warning: ${balEth} ETH may be close to estimated gas limits.`);
      console.log("   Recommended: At least ~0.01 - 0.02 Sepolia ETH.");
    } else {
      console.log("\n🎉 ALL PREFLIGHT CHECKS PASSED!");
      console.log("   Your environment is fully funded and ready to deploy.");
      console.log("   Run the deployment command:");
      console.log("   npm run contracts:deploy:sepolia");
    }
  } catch (walletErr) {
    console.log("   ❌ Error initializing wallet:", walletErr.message);
  }

  console.log("==================================================");
}

checkSepolia()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error during check:", err);
    process.exit(1);
  });

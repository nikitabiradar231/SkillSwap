import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Web3Context } from '../context/Web3Context';
import {
  Award,
  CheckCircle,
  XCircle,
  ExternalLink,
  Search,
  ShieldCheck,
  Calendar,
  User,
  Star,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { ethers } from 'ethers';
import deployedContracts from '../contracts/deployedContracts.json';

const VerifyCredential = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { contracts, getExplorerUrl, contractAddresses, chainId, isCorrectNetwork, account } =
    useContext(Web3Context);

  const [searchQuery, setSearchQuery] = useState(id || '');
  const [loading, setLoading] = useState(false);
  const [credential, setCredential] = useState(null);
  const [learnerTokens, setLearnerTokens] = useState([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Fallback read-only provider for visitors without MetaMask or on wrong network
  const getReadOnlyNFTContract = useCallback(() => {
    if (contracts.credentialNFT && (!account || isCorrectNetwork)) return contracts.credentialNFT;
    try {
      const activeChain = chainId || (deployedContracts.chainId || 11155111);
      const isSepolia = activeChain === 11155111;

      const rpcUrl = isSepolia
        ? (import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com')
        : 'http://127.0.0.1:8545';

      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const abi = deployedContracts.contracts?.SkillCredentialNFT?.abi;
      let address = contractAddresses.credentialNFT;
      if (!address) {
        address = isSepolia
          ? deployedContracts.networks?.[11155111]?.contracts?.SkillCredentialNFT?.address
          : (deployedContracts.networks?.[31337]?.contracts?.SkillCredentialNFT?.address || deployedContracts.contracts?.SkillCredentialNFT?.address);
      }
      if (!abi || !address) return null;
      return new ethers.Contract(address, abi, provider);
    } catch (err) {
      console.error('Error creating fallback read-only provider:', err);
      return null;
    }
  }, [contracts.credentialNFT, isCorrectNetwork, account, contractAddresses.credentialNFT, chainId]);

  const verifyById = useCallback(
    async (tokenIdStr, keepTokens = false) => {
      const tokenId = parseInt(tokenIdStr, 10);
      if (isNaN(tokenId) || tokenId <= 0) {
        setError('Please enter a valid numeric Credential Token ID.');
        setCredential(null);
        return;
      }

      setLoading(true);
      setError('');
      if (!keepTokens) {
        setLearnerTokens([]);
      }

      try {
        if (chainId === 11155111 && !contractAddresses.isConfigured) {
          setError('Sepolia smart contracts have not yet been deployed. Please deploy contracts to Sepolia or switch MetaMask to Hardhat Localhost (Chain ID 31337).');
          setCredential(null);
          setLoading(false);
          return;
        }

        const nftContract = getReadOnlyNFTContract();
        if (!nftContract) {
          setError(
            chainId === 11155111 || !contractAddresses.credentialNFT
              ? 'Sepolia smart contracts have not yet been deployed. Please deploy contracts to Sepolia or switch MetaMask to Hardhat Localhost (Chain ID 31337).'
              : 'Smart contract connection could not be established. Please ensure the network node is running.'
          );
          setCredential(null);
          setLoading(false);
          return;
        }

        const verification = await nftContract.verifyCredential(tokenId);

        if (!verification || verification.learner === ethers.ZeroAddress) {
          setError(`No credential exists with Token ID #${tokenId}.`);
          setCredential(null);
          setLoading(false);
          return;
        }

        const credData = await nftContract.getCredential(tokenId);

        setCredential({
          id: tokenId,
          isValid: verification.isValid,
          learner: credData.learner,
          mentor: credData.mentor,
          skillName: credData.skillName,
          category: credData.category || 'Skill Exchange',
          issueDate: new Date(Number(credData.issueDate) * 1000),
          rating: Number(credData.rating),
          metadataURI: credData.metadataURI,
          revoked: credData.revoked,
          revokeReason: credData.revokeReason,
        });
      } catch (err) {
        console.error('Verification error:', err);
        setError('Failed to query smart contract. Please verify your network connection.');
        setCredential(null);
      } finally {
        setLoading(false);
      }
    },
    [getReadOnlyNFTContract, chainId, contractAddresses.isConfigured, contractAddresses.credentialNFT]
  );

  const verifyByLearner = useCallback(
    async (learnerAddr) => {
      if (!ethers.isAddress(learnerAddr)) {
        setError('Invalid Ethereum address format.');
        return;
      }

      setLoading(true);
      setError('');
      setCredential(null);

      try {
        if (chainId === 11155111 && !contractAddresses.isConfigured) {
          setError('Sepolia smart contracts have not yet been deployed. Please deploy contracts to Sepolia or switch MetaMask to Hardhat Localhost (Chain ID 31337).');
          setLoading(false);
          return;
        }

        const nftContract = getReadOnlyNFTContract();
        if (!nftContract) {
          setError(
            chainId === 11155111 || !contractAddresses.credentialNFT
              ? 'Sepolia smart contracts have not yet been deployed. Please deploy contracts to Sepolia or switch MetaMask to Hardhat Localhost (Chain ID 31337).'
              : 'Smart contract connection could not be established.'
          );
          setLoading(false);
          return;
        }

        const tokenIds = await nftContract.getLearnerCredentials(learnerAddr);
        if (!tokenIds || tokenIds.length === 0) {
          setError(`No credentials found for learner address ${learnerAddr}.`);
          setLearnerTokens([]);
        } else {
          const ids = tokenIds.map((t) => t.toString());
          setLearnerTokens(ids);
          // Auto-load the first token without clearing learnerTokens
          await verifyById(ids[0], true);
        }
      } catch (err) {
        console.error('Learner query error:', err);
        setError('Failed to fetch credentials for this address.');
      } finally {
        setLoading(false);
      }
    },
    [getReadOnlyNFTContract, verifyById, chainId, contractAddresses.isConfigured, contractAddresses.credentialNFT]
  );

  const handleSearch = (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    if (id === query) {
      if (ethers.isAddress(query)) {
        verifyByLearner(query);
      } else {
        verifyById(query);
      }
    } else {
      navigate(`/verify/${query}`);
    }
  };

  useEffect(() => {
    if (id) {
      setSearchQuery(id);
      if (ethers.isAddress(id)) {
        verifyByLearner(id);
      } else {
        verifyById(id);
      }
    }
  }, [id, verifyById, verifyByLearner]);

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-semibold mb-4">
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> Public Decentralized Verifier
        </div>
        <h1 className="text-3xl lg:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-white via-primary-100 to-primary-500 bg-clip-text text-transparent">
          Verify Skill Credentials
        </h1>
        <p className="text-gray-400 text-sm">
          Directly inspect cryptographic, tamper-proof proof-of-completion credentials issued on the Ethereum blockchain.
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-10">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Enter Credential Token ID (e.g. 1) or Learner Wallet Address (0x...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl pl-12 pr-28 py-3.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-primary-500 shadow-xl transition-all"
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-4" />
          <button
            type="submit"
            disabled={loading}
            className="btn-primary absolute right-2 py-2 px-5 text-xs font-bold flex items-center gap-1.5"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Verify'}
          </button>
        </div>
      </form>

      {/* Multiple Tokens for address */}
      {learnerTokens.length > 1 && (
        <div className="max-w-2xl mx-auto mb-6 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
          <p className="text-xs text-gray-400 mb-2 font-medium">
            Found {learnerTokens.length} credentials for this wallet. Select one to inspect:
          </p>
          <div className="flex flex-wrap gap-2">
            {learnerTokens.map((tId) => (
              <button
                key={tId}
                onClick={() => verifyById(tId, true)}
                className={`px-3 py-1 rounded-lg text-xs font-mono border transition-all ${
                  credential?.id === parseInt(tId, 10)
                    ? 'bg-primary-600 border-primary-500 text-white'
                    : 'bg-slate-900 border-slate-700 text-gray-300 hover:border-slate-500'
                }`}
              >
                Token #{tId}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-20">
          <RefreshCw className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Querying Ethereum smart contracts...</p>
        </div>
      )}

      {/* Error Message */}
      {error && !loading && (
        <div className="max-w-xl mx-auto p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-center text-sm flex items-center justify-center gap-2">
          <XCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Verified Credential Card */}
      {credential && !loading && (
        <div className="max-w-3xl mx-auto">
          {/* Certificate Container */}
          <div className="relative bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-700/80 rounded-3xl p-8 sm:p-12 shadow-2xl overflow-hidden group">
            {/* Ambient Background Glow */}
            <div className="absolute -top-32 -right-32 w-72 h-72 bg-primary-600/15 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-32 -left-32 w-72 h-72 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none"></div>

            {/* Certificate Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-8 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-primary-500/20 text-white">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xs uppercase tracking-widest font-bold text-primary-400">
                    SkillS Protocol &bull; Verified Credential
                  </h3>
                  <p className="text-2xl font-bold text-white">Token #{credential.id}</p>
                </div>
              </div>

              {/* Status Badge */}
              {credential.isValid ? (
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                  <CheckCircle className="w-4 h-4" />
                  <span>Cryptographically Verified</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
                  <XCircle className="w-4 h-4" />
                  <span>Revoked</span>
                </div>
              )}
            </div>

            {/* Certificate Body */}
            <div className="py-8 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
              <div className="relative shrink-0">
                <img
                  src="/credential-badge.png"
                  alt="SkillS Verified Credential Badge"
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl object-cover shadow-2xl border border-primary-500/30 group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary-500 to-indigo-500 opacity-20 blur-lg -z-10"></div>
              </div>
              <div className="flex-1">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary-500/10 text-primary-300 border border-primary-500/20 mb-3">
                  {credential.category}
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
                  {credential.skillName}
                </h2>
                <p className="text-gray-400 text-sm max-w-xl leading-relaxed">
                  This certifies that the learner has demonstrated practical proficiency and successfully completed peer verification under the mentorship of a verified instructor.
                </p>

                {/* Rating */}
                <div className="flex items-center gap-1.5 mt-4 justify-center md:justify-start">
                  <span className="text-xs text-gray-400 mr-1">Instructor Evaluation:</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        credential.rating >= star
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-600'
                      }`}
                    />
                  ))}
                  <span className="text-xs font-bold text-yellow-400 ml-1">
                    {credential.rating} / 5
                  </span>
                </div>
              </div>
            </div>

            {/* Credential Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 border-t border-b border-slate-800 text-xs">
              <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4">
                <span className="text-gray-500 flex items-center gap-1.5 mb-1">
                  <User className="w-3.5 h-3.5 text-primary-400" /> Learner (Recipient)
                </span>
                <a
                  href={getExplorerUrl('address', credential.learner)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-white hover:text-primary-300 break-all flex items-center gap-1 transition-colors"
                >
                  {credential.learner}
                  <ExternalLink className="w-3 h-3 text-gray-400 shrink-0" />
                </a>
              </div>

              <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4">
                <span className="text-gray-500 flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Mentor (Issuer)
                </span>
                <a
                  href={getExplorerUrl('address', credential.mentor)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-white hover:text-emerald-300 break-all flex items-center gap-1 transition-colors"
                >
                  {credential.mentor}
                  <ExternalLink className="w-3 h-3 text-gray-400 shrink-0" />
                </a>
              </div>

              <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4">
                <span className="text-gray-500 flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Issue Timestamp
                </span>
                <p className="font-medium text-slate-200">
                  {credential.issueDate.toLocaleString(undefined, {
                    dateStyle: 'long',
                    timeStyle: 'medium',
                  })}
                </p>
              </div>

              <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4">
                <span className="text-gray-500 flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> Token Standard
                </span>
                <p className="font-medium text-slate-200">
                  ERC-721 Soulbound (Cryptographically Non-Transferable)
                </p>
              </div>
            </div>

            {/* Revoke reason if revoked */}
            {credential.revoked && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs">
                <strong>Revocation Reason:</strong> {credential.revokeReason || 'Revoked by authority.'}
              </div>
            )}

            {/* Footer with Contract Link & Share */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <a
                href={getExplorerUrl('address', contractAddresses.credentialNFT)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-primary-300 flex items-center gap-1 font-mono transition-colors"
              >
                <span>Contract: {contractAddresses.credentialNFT.substring(0, 14)}...</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                onClick={copyShareLink}
                className="btn-secondary py-2 px-4 flex items-center gap-1.5 text-xs font-semibold"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Verification Link Copied!' : 'Share Proof'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guide for Judges */}
      {!credential && !loading && !error && (
        <div className="max-w-2xl mx-auto p-6 bg-slate-900/40 border border-slate-800 rounded-2xl text-center text-xs text-gray-400">
          <p className="font-semibold text-slate-300 mb-1">💡 For Hackathon Judges & Evaluators:</p>
          <p className="mb-3">
            You can verify any issued credential by entering its Token ID (e.g. <span className="font-mono text-primary-400 font-bold">1</span>) or paste the learner's Ethereum wallet address above.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                setSearchQuery('1');
                verifyById('1');
              }}
              className="text-primary-400 hover:underline font-mono"
            >
              Inspect Token #1 &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifyCredential;

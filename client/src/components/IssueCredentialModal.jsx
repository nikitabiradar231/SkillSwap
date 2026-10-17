import React, { useState, useContext } from 'react';
import { Web3Context } from '../context/Web3Context';
import { Award, Star, ExternalLink, CheckCircle, AlertCircle, RefreshCw, X, Sparkles } from 'lucide-react';
import { ethers } from 'ethers';
import { Link } from 'react-router-dom';

const IssueCredentialModal = ({ session, onClose, onCredentialIssued }) => {
  const { account, contracts, getExplorerUrl, refreshBalance, connectWallet, isCorrectNetwork, switchNetwork } =
    useContext(Web3Context);

  const learnerWalletDefault = session.learner?.walletAddress || '';

  const [learnerAddress, setLearnerAddress] = useState(learnerWalletDefault);
  const [skillName, setSkillName] = useState(session.skill || '');
  const [category, setCategory] = useState('Blockchain & Web3');
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState(`Successfully completed peer learning session for ${session.skill || 'skill exchange'}.`);

  const [status, setStatus] = useState('idle'); // idle | confirming | mining | success | error
  const [txHash, setTxHash] = useState('');
  const [mintedTokenId, setMintedTokenId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const categories = [
    'Blockchain & Web3',
    'Frontend Engineering',
    'Backend & APIs',
    'AI & Machine Learning',
    'UI/UX Design',
    'Mobile Development',
    'DevOps & Cloud',
  ];

  const handleIssueCredential = async (e) => {
    e.preventDefault();

    if (!account) {
      await connectWallet();
      return;
    }

    if (!isCorrectNetwork) {
      await switchNetwork();
      return;
    }

    if (!ethers.isAddress(learnerAddress)) {
      setErrorMessage('Please provide a valid Ethereum wallet address for the learner.');
      return;
    }

    if (learnerAddress.toLowerCase() === account.toLowerCase()) {
      setErrorMessage('Self-certification is not allowed. Mentors cannot issue credentials to their own address.');
      return;
    }

    if (!contracts.registry) {
      setErrorMessage('Smart contracts not initialized. Check your network connection.');
      return;
    }

    setStatus('confirming');
    setErrorMessage('');

    try {
      // Create IPFS/JSON metadata payload
      const metadataPayload = {
        name: `SkillS Credential: ${skillName}`,
        description: notes,
        image: 'https://raw.githubusercontent.com/nikitabiradar231/SkillS/main/client/public/credential-badge.png',
        attributes: [
          { trait_type: 'Skill', value: skillName },
          { trait_type: 'Category', value: category },
          { trait_type: 'Rating', value: rating },
          { trait_type: 'Mentor', value: account },
          { trait_type: 'Learner', value: learnerAddress },
          { trait_type: 'Platform', value: 'SkillS Decentralized Learning' },
        ],
      };

      const metadataURI = `data:application/json;utf8,${encodeURIComponent(JSON.stringify(metadataPayload))}`;
      const sessionIdStr = session._id ? session._id.toString() : `session-${Date.now()}`;

      // Call SkillProtocolRegistry
      const tx = await contracts.registry.completeAndCertifySession(
        learnerAddress,
        skillName,
        category,
        rating,
        metadataURI,
        sessionIdStr
      );

      setStatus('mining');
      setTxHash(tx.hash);

      const receipt = await tx.wait();

      // Find SessionCertified or CredentialIssued event
      let issuedTokenId = null;
      if (receipt && receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsed = contracts.registry.interface.parseLog(log);
            if (parsed && parsed.name === 'SessionCertified') {
              issuedTokenId = parsed.args.tokenId.toString();
              break;
            }
          } catch {
            // Non-registry log, check CredentialNFT
            try {
              const parsedNFT = contracts.credentialNFT.interface.parseLog(log);
              if (parsedNFT && parsedNFT.name === 'CredentialIssued') {
                issuedTokenId = parsedNFT.args.tokenId.toString();
                break;
              }
            } catch {
              // continue
            }
          }
        }
      }

      setMintedTokenId(issuedTokenId || '1');
      setStatus('success');
      await refreshBalance(account);

      if (onCredentialIssued) {
        onCredentialIssued({
          tokenId: issuedTokenId,
          txHash: tx.hash,
        });
      }
    } catch (err) {
      console.error('Failed to issue credential:', err);
      setStatus('error');
      if (err.message && err.message.includes('SessionAlreadyCertified')) {
        setErrorMessage('This learning session has already been certified on-chain!');
      } else if (err.code === 4001 || (err.message && err.message.includes('user rejected'))) {
        setErrorMessage('Transaction was rejected in MetaMask.');
      } else {
        setErrorMessage(err.reason || err.message || 'Transaction failed on Ethereum testnet.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-darkCard border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {status === 'success' ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto mb-4 text-emerald-400">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">On-Chain Credential Issued!</h3>
            <p className="text-sm text-gray-300 mb-6">
              A permanent, Soulbound ERC-721 Skill Credential NFT has been minted to the learner's wallet, and community SKILL reward tokens have been distributed!
            </p>

            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 mb-6 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Credential Token ID:</span>
                <span className="font-mono text-primary-400 font-bold text-sm">#{mintedTokenId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Recipient (Learner):</span>
                <span className="font-mono text-slate-300">{learnerAddress.substring(0, 10)}...</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Mentor Rewards:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> +50 SKILL
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Learner Rewards:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> +25 SKILL
                </span>
              </div>
              {txHash && (
                <div className="pt-2 border-t border-slate-700/60 flex justify-between items-center">
                  <span className="text-gray-400">Transaction:</span>
                  <a
                    href={getExplorerUrl('tx', txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-400 hover:text-primary-300 flex items-center gap-1"
                  >
                    View on Etherscan <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to={`/verify/${mintedTokenId}`}
                className="btn-primary py-2.5 px-4 text-sm flex-1 flex items-center justify-center gap-2"
                onClick={onClose}
              >
                <Award className="w-4 h-4" /> View in Public Verifier
              </Link>
              <button onClick={onClose} className="btn-secondary py-2.5 px-4 text-sm">
                Done
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-400">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Certify Session On-Chain</h3>
                <p className="text-xs text-gray-400">
                  Issue an immutable Soulbound achievement credential on Ethereum
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleIssueCredential} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-400 font-medium mb-1">
                  Learner Ethereum Wallet Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="0x..."
                  value={learnerAddress}
                  onChange={(e) => setLearnerAddress(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono focus:border-primary-500 focus:outline-none"
                />
                {!session.learner?.walletAddress && (
                  <p className="text-[11px] text-amber-400/80 mt-1">
                    Learner hasn't connected a wallet yet in profile; enter their testnet address manually.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Skill Name *</label>
                  <input
                    type="text"
                    required
                    value={skillName}
                    onChange={(e) => setSkillName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:border-primary-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 font-medium mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:border-primary-500 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-medium mb-1">
                  Proficiency Rating: <span className="text-yellow-400 font-bold">{rating} / 5 Stars</span>
                </label>
                <div className="flex gap-2 items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        rating >= star
                          ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                          : 'bg-slate-800 border-slate-700 text-gray-600'
                      }`}
                    >
                      <Star className="w-5 h-5 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-medium mb-1">Achievement Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:border-primary-500 focus:outline-none"
                />
              </div>

              {/* Protocol Rewards Summary */}
              <div className="bg-primary-950/40 border border-primary-500/20 rounded-xl p-3 flex items-center justify-between text-[11px] text-primary-200">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  Automatic Token Rewards:
                </span>
                <span className="font-semibold text-emerald-400">+50 SKILL (Mentor) &bull; +25 SKILL (Learner)</span>
              </div>

              {/* Transaction State Progress */}
              {status === 'confirming' && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                  <span>Please approve the transaction in your MetaMask wallet...</span>
                </div>
              )}

              {status === 'mining' && (
                <div className="p-3 bg-primary-500/10 border border-primary-500/30 rounded-xl text-primary-300 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    Mining block on Ethereum testnet...
                  </span>
                  {txHash && (
                    <a
                      href={getExplorerUrl('tx', txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-400 underline flex items-center gap-1"
                    >
                      Explorer <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={status === 'confirming' || status === 'mining'}
                  className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 disabled:opacity-50"
                >
                  <Award className="w-4 h-4" />
                  {status === 'mining'
                    ? 'Confirming on Chain...'
                    : status === 'confirming'
                    ? 'Check MetaMask...'
                    : 'Issue Credential NFT'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={status === 'confirming' || status === 'mining'}
                  className="btn-secondary py-2.5 px-4 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default IssueCredentialModal;

import React, { useState, useEffect, useContext } from 'react';
import { Web3Context } from '../context/Web3Context';
import api from '../utils/api';
import { Wallet, ExternalLink, Sparkles, Award, ShieldCheck, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const WalletConnect = ({ userWallet, onConnect }) => {
  const {
    account,
    skillBalance,
    connectWallet,
    isConnecting,
    error: web3Error,
    getExplorerUrl,
    networkName,
  } = useContext(Web3Context);

  const [savedWallet, setSavedWallet] = useState(userWallet || '');
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (userWallet) {
      setSavedWallet(userWallet);
    }
  }, [userWallet]);

  // Sync wallet address to backend profile
  const syncWalletToBackend = async (walletToSync) => {
    if (!walletToSync) return;
    setSyncing(true);
    setError('');
    try {
      await api.put('/profile/wallet', { walletAddress: walletToSync });
      setSavedWallet(walletToSync);
      setSyncSuccess(true);
      if (onConnect) onConnect(walletToSync);
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save wallet to backend profile:', err);
      setError('Failed to bind wallet address to your profile.');
    } finally {
      setSyncing(false);
    }
  };

  const handleConnect = async () => {
    const connected = await connectWallet();
    if (connected) {
      await syncWalletToBackend(connected);
    }
  };

  const activeWallet = account || savedWallet;

  return (
    <div className="bg-slate-900/60 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary-400" />
          <span>Web3 Ethereum Identity</span>
        </h3>
        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-300 border border-primary-500/20">
          {networkName || 'Sepolia'}
        </span>
      </div>

      {(error || web3Error) && (
        <div className="text-red-400 text-xs mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
          {error || web3Error}
        </div>
      )}

      {activeWallet ? (
        <div className="space-y-4">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs text-gray-400">Linked Ethereum Address:</span>
              <a
                href={getExplorerUrl('address', activeWallet)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 font-mono"
              >
                Explorer <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="font-mono text-sm text-primary-300 break-all">{activeWallet}</p>

            {account && account.toLowerCase() !== savedWallet.toLowerCase() && (
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-amber-400">
                  New wallet detected in MetaMask.
                </span>
                <button
                  type="button"
                  onClick={() => syncWalletToBackend(account)}
                  disabled={syncing}
                  className="btn-primary py-1 px-3 text-xs"
                >
                  {syncing ? 'Binding...' : 'Bind Address'}
                </button>
              </div>
            )}

            {syncSuccess && (
              <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Address synchronized with your account profile!
              </p>
            )}
          </div>

          {/* Web3 Token Balance & Credential Link */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
              <span className="text-gray-400 flex items-center gap-1 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> SKILL Balance
              </span>
              <p className="text-lg font-bold text-white">
                {skillBalance} <span className="text-xs text-primary-400 font-normal">SKILL</span>
              </p>
            </div>

            <Link
              to={`/verify/${activeWallet}`}
              className="bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/60 rounded-xl p-3 transition-colors flex flex-col justify-center"
            >
              <span className="text-gray-400 flex items-center gap-1 mb-1">
                <Award className="w-3.5 h-3.5 text-emerald-400" /> Credentials
              </span>
              <span className="text-primary-400 font-semibold hover:underline flex items-center gap-1">
                View My NFTs &rarr;
              </span>
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-xs text-gray-400 mb-4">
            Connect your MetaMask or Ethereum testnet wallet to receive Soulbound achievement badges and earn community SKILL reward tokens.
          </p>
          <button
            type="button"
            onClick={handleConnect}
            disabled={isConnecting}
            className="btn-primary py-2.5 px-4 text-xs font-bold w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <Wallet className="w-4 h-4" />
            <span>{isConnecting ? 'Connecting...' : 'Connect MetaMask'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletConnect;

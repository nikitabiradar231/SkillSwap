import React, { useContext, useState } from 'react';
import { Web3Context } from '../context/Web3Context';
import { Wallet, AlertTriangle, ExternalLink, RefreshCw, Sparkles, Check } from 'lucide-react';

const Web3Status = () => {
  const {
    account,
    isConnecting,
    skillBalance,
    isCorrectNetwork,
    networkName,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    contracts,
    refreshBalance,
    getExplorerUrl,
  } = useContext(Web3Context);

  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetSuccess, setFaucetSuccess] = useState(false);
  const [faucetMsg, setFaucetMsg] = useState('');

  const handleClaimFaucet = async () => {
    if (!contracts.rewardToken || !account) return;
    setFaucetLoading(true);
    setFaucetMsg('');
    try {
      const tx = await contracts.rewardToken.requestFaucet(account);
      setFaucetMsg('Transaction sent! Waiting for confirmation...');
      await tx.wait();
      setFaucetSuccess(true);
      setFaucetMsg('Claimed 100 SKILL tokens!');
      await refreshBalance(account);
      setTimeout(() => {
        setFaucetSuccess(false);
        setFaucetMsg('');
      }, 4000);
    } catch (err) {
      console.error(err);
      if (err.message && err.message.includes('FaucetCooldownActive')) {
        setFaucetMsg('Faucet cooldown active (once per 24h)');
      } else {
        setFaucetMsg('Failed to claim faucet tokens');
      }
      setTimeout(() => setFaucetMsg(''), 4000);
    } finally {
      setFaucetLoading(false);
    }
  };

  const truncateAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="flex items-center gap-2">
      {/* Testnet Badge */}
      <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary-500/10 text-primary-300 border border-primary-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse"></span>
        Ethereum Testnet
      </span>

      {/* Network Indicator / Switcher */}
      {account && !isCorrectNetwork && (
        <button
          onClick={() => switchNetwork()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all"
          title="Click to switch to supported network"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Switch Network</span>
        </button>
      )}

      {account && isCorrectNetwork && (
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{networkName}</span>
        </div>
      )}

      {/* SKILL Token Balance & Testnet Faucet */}
      {account && (
        <div className="flex items-center bg-slate-800/80 border border-slate-700/60 rounded-xl px-2.5 py-1 text-xs">
          <div className="flex items-center gap-1 mr-2 text-primary-300 font-bold">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span>{skillBalance}</span>
            <span className="text-[10px] text-gray-400 font-normal">SKILL</span>
          </div>
          <button
            onClick={handleClaimFaucet}
            disabled={faucetLoading}
            className="text-[10px] bg-primary-600/30 hover:bg-primary-600/50 text-primary-300 px-2 py-0.5 rounded-md border border-primary-500/30 transition-all flex items-center gap-1 disabled:opacity-50"
            title="Claim 100 SKILL test tokens"
          >
            {faucetLoading ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : faucetSuccess ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              'Faucet'
            )}
          </button>
        </div>
      )}

      {/* Wallet Connection */}
      {account ? (
        <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs text-slate-200">
          <Wallet className="w-3.5 h-3.5 text-primary-400" />
          <a
            href={getExplorerUrl('address', account)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono hover:text-primary-300 flex items-center gap-1 transition-colors"
            title="View on Block Explorer"
          >
            {truncateAddress(account)}
            <ExternalLink className="w-3 h-3 text-gray-400" />
          </a>
          <button
            onClick={disconnectWallet}
            className="ml-1 text-[10px] text-gray-500 hover:text-red-400 transition-colors"
            title="Disconnect"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={connectWallet}
          disabled={isConnecting}
          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-lg shadow-primary-500/20 active:scale-95 transition-all"
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
        </button>
      )}

      {/* Faucet notification tooltip */}
      {faucetMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-primary-500/50 text-white text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in duration-200">
          <Sparkles className="w-4 h-4 text-primary-400" />
          <span>{faucetMsg}</span>
        </div>
      )}
    </div>
  );
};

export default Web3Status;

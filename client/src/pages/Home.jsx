import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Award,
  ShieldCheck,
  Sparkles,
  Users,
  ArrowRight,
  CheckCircle,
  ExternalLink,
  Code,
  Zap,
} from 'lucide-react';
import { Web3Context } from '../context/Web3Context';

const Home = () => {
  const { account, connectWallet } = useContext(Web3Context);

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] overflow-hidden">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        {/* Glow Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary-600/15 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[250px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-300 text-xs font-semibold mb-8 shadow-inner animate-fade-in">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span>Built on Ethereum Sepolia &bull; Soulbound Skill Credentials</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-white via-slate-100 to-primary-400 bg-clip-text text-transparent leading-[1.15]">
            Exchange Skills. <br />
            Certify on Ethereum.
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-400 mb-10 leading-relaxed font-normal">
            SkillS is a decentralized peer-to-peer knowledge network. Swap skills with mentors, participate in live video workshops, and earn immutable, Soulbound ERC-721 achievement badges backed by on-chain smart contracts.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <Link
              to="/dashboard"
              className="btn-primary px-8 py-3.5 text-sm font-bold w-full sm:w-auto shadow-2xl shadow-primary-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>Explore Marketplace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/verify"
              className="btn-secondary px-8 py-3.5 text-sm font-semibold w-full sm:w-auto border-slate-700 bg-slate-900/60 hover:bg-slate-800 shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Verify Any Credential</span>
            </Link>
          </div>

          {/* Quick Wallet Connect Banner */}
          {!account && (
            <div className="mt-8">
              <button
                onClick={connectWallet}
                className="text-xs text-primary-400 hover:text-primary-300 underline underline-offset-4 transition-colors"
              >
                Or connect MetaMask to view your credentials &amp; SKILL balance &rarr;
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-16 bg-slate-950/40 border-t border-b border-slate-800/60 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 hover:border-primary-500/40 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-primary-600/10 border border-primary-500/30 flex items-center justify-center text-primary-400 mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">1. Peer Skill Exchange</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Offer your expertise in exchange for learning another discipline. Schedule 1-on-1 sessions with in-app WebRTC video calling and peer chat.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 hover:border-indigo-500/40 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">2. Soulbound NFT Badges</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                When a session is completed, mentors certify the learner on-chain. Non-transferable ERC-721 Soulbound tokens guarantee academic integrity without fake certificates.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 hover:border-emerald-500/40 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">3. SKILL Reward Tokens</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Earn ERC-20 SKILL community tokens whenever you mentor peers or complete courses. Built-in testnet faucet allows participants to test reward mechanics effortlessly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Public On-Chain Verifier Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-gradient-to-r from-slate-900 via-primary-950/20 to-slate-900 border border-primary-500/30 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary-400 bg-primary-500/10 px-3 py-1 rounded-full border border-primary-500/20 mb-3 inline-block">
                  Decentralized Verification
                </span>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Verify Credentials On-Chain
                </h3>
                <p className="text-sm text-gray-400 max-w-lg">
                  Every certified skill is permanently recorded on Ethereum smart contracts. Instantly inspect credentials by Token ID or wallet address with zero trust required.
                </p>
              </div>
              <Link
                to="/verify"
                className="btn-primary py-3 px-6 text-sm whitespace-nowrap shadow-lg shadow-primary-500/20 flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Launch Verifier</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-slate-800/60 bg-slate-950/30">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center text-white">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold text-white">SkillS</span>
          </div>
          <p className="text-xs text-gray-500">
            Decentralized Peer-to-Peer Learning &bull; Ethereum Smart Contracts
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { User as UserIcon, BookOpen, GraduationCap, MessageSquare, ArrowLeft, Star, Users, CheckCircle, Sparkles, Square, Award } from 'lucide-react';

const UserDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Request Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState('');
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [requestType, setRequestType] = useState('exchange');
  const [requesting, setRequesting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get(`/profile/${userId}`);
        setProfile(res.data);
      } catch {
        setError('User not found');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

  const handleRequest = async () => {
    if (!selectedSkill) return;
    setRequesting(true);
    try {
      await api.post('/skills/request', {
        providerId: profile._id,
        skill: selectedSkill,
        requestType,
        price: requestType === 'paid' ? selectedPrice : 0
      });
      setDone(true);
      setTimeout(() => {
        setShowModal(false);
        setDone(false);
      }, 2000);
    } catch (err) {
      console.error(err);
    }
    setRequesting(false);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  if (loading) return (
    <div className="min-h-[80vh] flex justify-center items-center">
      <div className="relative">
        <div className="w-16 h-16 border-slate-800 border-4 rounded-full"></div>
        <div className="w-16 h-16 border-blue-500 border-t-4 animate-spin rounded-full absolute left-0 top-0"></div>
      </div>
    </div>
  );

  if (error || !profile) return (
    <div className="max-w-4xl mx-auto px-4 py-32 text-center flex flex-col items-center">
      <div className="w-20 h-20 bg-[#1e293b] border border-slate-700 rounded-2xl flex items-center justify-center mb-6">
        <UserIcon className="w-10 h-10 text-slate-500" />
      </div>
      <h2 className="text-2xl font-semibold text-slate-300 mb-6">{error || 'User not found'}</h2>
      <button onClick={() => navigate('/dashboard')} className="text-sm text-slate-400 bg-[#0f172a] hover:bg-slate-900 border border-slate-700/50 rounded-lg px-6 py-2.5 font-medium transition-colors flex items-center gap-2 shadow-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Community
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f172a] py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto">

        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-8 text-sm text-slate-500 hover:text-slate-300 font-medium flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="bg-[#1e293b] rounded-xl border border-slate-700 overflow-hidden shadow-2xl">

          {/* Header */}
          <div className="p-8 sm:p-10 flex flex-col sm:flex-row gap-8 items-start">
            {/* Avatar */}
            <div className="w-28 h-28 sm:w-32 sm:h-32 bg-[#25395f] rounded-[1.25rem] flex items-center justify-center shrink-0 border border-slate-600/30 shadow-inner overflow-hidden">
              {profile.profilePic ? (
                <img src={profile.profilePic} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl sm:text-5xl font-medium text-[#60a5fa]">{getInitials(profile.name)}</span>
              )}
            </div>

            {/* Name & Bio */}
            <div className="flex-1 pt-2">
              <h1 className="text-3xl font-medium text-slate-100">{profile.name}</h1>
              <p className="text-sm text-slate-500 mt-1 font-medium">{profile.email}</p>
              {profile.walletAddress && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono text-primary-300 bg-primary-500/10 border border-primary-500/20 px-2.5 py-1 rounded-lg">
                    ⟠ {profile.walletAddress}
                  </span>
                  <Link
                    to={`/verify/${profile.walletAddress}`}
                    className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 font-medium underline"
                  >
                    <Award className="w-3.5 h-3.5" /> View On-Chain Badges
                  </Link>
                </div>
              )}
              {profile.bio && (
                <div className="mt-4 flex items-start gap-3">
                  <span className="text-sm text-slate-300 whitespace-nowrap">bio —</span>
                  <p className="text-sm text-slate-400 leading-relaxed">{profile.bio}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 sm:min-w-[180px]">
              <button
                onClick={() => navigate(`/chat/${profile._id}`)}
                className="text-sm text-slate-400 bg-[#0f172a] hover:bg-slate-900 border border-slate-700/50 rounded-lg px-5 py-2.5 font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <MessageSquare className="w-4 h-4" /> Message
              </button>
              {profile.skills?.length > 0 && (
                <button
                  onClick={() => setShowModal(true)}
                  className="text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg px-5 py-2.5 font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" /> Request Skill
                </button>
              )}
            </div>
          </div>

          <div className="border-t border-slate-700/50"></div>

          {/* Skills Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2">

            {/* Skills Offered */}
            <div className="p-8 sm:p-10 lg:border-r border-slate-700/50">
              <div className="flex items-center gap-2.5 mb-2">
                <Square className="w-3.5 h-3.5 text-[#38bdf8]" />
                <h3 className="text-[#38bdf8] text-[15px] font-medium">Skills Offered</h3>
              </div>
              <p className="text-sm text-slate-500 mb-6">What this person can teach you.</p>

              {profile.skills?.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {profile.skills.map((s, i) => (
                    <div key={i} className="bg-[#0f172a] border border-slate-700/50 rounded-xl px-5 py-4 flex justify-between items-center shadow-sm">
                      <div>
                        <p className="text-sm font-semibold text-slate-200">{s.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-blue-400" /> Available
                        </p>
                      </div>
                      <p className="text-base font-bold text-emerald-400">₹{s.price}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">No skills listed yet.</p>
              )}
            </div>

            {/* Skills to Learn */}
            <div className="p-8 sm:p-10">
              <div className="flex items-center gap-2.5 mb-2">
                <Square className="w-3.5 h-3.5 text-[#38bdf8]" />
                <h3 className="text-[#38bdf8] text-[15px] font-medium">Wants to Learn</h3>
              </div>
              <p className="text-sm text-slate-500 mb-6">Skills this person is interested in.</p>

              {profile.skillsToLearn?.length > 0 ? (
                <div className="bg-[#0f172a] border border-slate-700/50 rounded-xl p-5 shadow-sm">
                  <div className="flex flex-wrap gap-2">
                    {profile.skillsToLearn.map((s, i) => (
                      <span key={i} className="border border-[#1e3a5f] bg-[#172a46] text-[#38bdf8] px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 font-medium shadow-sm">
                        <Square className="w-2.5 h-2.5" /> {s}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">Not specified.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" onClick={() => setShowModal(false)}>
          <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 rounded-t-xl" />

            <h3 className="text-xl font-semibold text-slate-100 mb-1">Request from <span className="text-blue-400">{profile.name}</span></h3>
            <p className="text-slate-500 text-sm mb-8">Choose how you want to acquire this skill</p>

            {done ? (
              <div className="flex flex-col items-center justify-center py-10 text-emerald-400">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-9 h-9" />
                </div>
                <p className="text-lg font-semibold text-slate-100 mb-1">Request Sent!</p>
                <p className="text-sm text-emerald-500">Waiting for {profile.name}'s response...</p>
              </div>
            ) : (
              <div className="space-y-8">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">1. Select Skill</label>
                  <div className="flex flex-col gap-2">
                    {profile.skills.map((s, i) => (
                      <button key={i} type="button"
                        onClick={() => { setSelectedSkill(s.name); setSelectedPrice(s.price); }}
                        className={`w-full px-4 py-3 rounded-xl text-left border transition-colors flex justify-between items-center text-sm ${selectedSkill === s.name ? 'bg-blue-600/10 border-blue-500/50 text-slate-200' : 'bg-[#0f172a] border-slate-700/50 text-slate-400 hover:border-slate-600'}`}
                      >
                        <span className="font-semibold">{s.name}</span>
                        <span className={`font-bold ${selectedSkill === s.name ? 'text-blue-400' : 'text-emerald-400'}`}>₹{s.price}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`transition-all duration-300 ${!selectedSkill ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">2. Request Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setRequestType('exchange')}
                      className={`p-4 rounded-xl border text-sm font-semibold flex flex-col items-center gap-2 transition-colors ${requestType === 'exchange' ? 'bg-blue-600/10 border-blue-500/50 text-blue-300' : 'bg-[#0f172a] border-slate-700/50 text-slate-400 hover:border-slate-600'}`}>
                      <Users className="w-5 h-5" />
                      Skill Swap
                      <span className="text-[10px] font-normal opacity-70">Free Exchange</span>
                    </button>
                    <button type="button" onClick={() => setRequestType('paid')}
                      className={`p-4 rounded-xl border text-sm font-semibold flex flex-col items-center gap-2 transition-colors ${requestType === 'paid' ? 'bg-emerald-600/10 border-emerald-500/50 text-emerald-300' : 'bg-[#0f172a] border-slate-700/50 text-slate-400 hover:border-slate-600'}`}>
                      <Star className="w-5 h-5" />
                      Paid
                      <span className="text-[10px] font-normal opacity-70">₹{selectedPrice || 0} Total</span>
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-6 border-t border-slate-700/50">
                  <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700">Cancel</button>
                  <button
                    onClick={handleRequest}
                    disabled={!selectedSkill || requesting}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {requesting ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Send Request</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDetail;

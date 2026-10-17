import React, { useEffect, useState, useContext, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { Web3Context } from '../context/Web3Context';
import IssueCredentialModal from '../components/IssueCredentialModal';
import {
  Calendar,
  Clock,
  Video,
  CheckCircle,
  XCircle,
  ExternalLink,
  Trash2,
  Award,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

const Sessions = () => {
  const { user } = useContext(AuthContext);
  const { contracts } = useContext(Web3Context);
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [certModalSession, setCertModalSession] = useState(null);
  const [certifiedMap, setCertifiedMap] = useState({});
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    partnerId: '',
    skill: '',
    scheduledAt: '',
    duration: 60,
    totalDays: 1,
    notes: '',
    isTeaching: true
  });

  const checkOnChainStatus = useCallback(async (sessionList) => {
    if (!contracts.registry || !sessionList || sessionList.length === 0) return;
    try {
      const results = {};
      for (const s of sessionList) {
        if (s._id) {
          const [isCertified, tokenId] = await contracts.registry.isSessionCertified(s._id.toString());
          if (isCertified) {
            results[s._id] = tokenId.toString();
          }
        }
      }
      setCertifiedMap(results);
    } catch (err) {
      console.debug('Could not check on-chain session status:', err);
    }
  }, [contracts.registry]);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await api.get('/sessions');
      setSessions(res.data);
      checkOnChainStatus(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [checkOnChainStatus]);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 4000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const openScheduleModal = async () => {
    try {
      const res = await api.get('/skills/users');
      setAvailableUsers(res.data);
      if (res.data.length > 0) {
        const first = res.data[0];
        const sName = typeof first.skills?.[0] === 'string' ? first.skills[0] : first.skills?.[0]?.name;
        setScheduleForm(prev => ({
          ...prev,
          partnerId: first._id,
          skill: sName || 'Peer Skill Exchange'
        }));
      }
    } catch (e) {
      console.error(e);
    }
    setShowScheduleModal(true);
  };

  const handleDirectSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleForm.partnerId) return;
    setScheduling(true);
    try {
      const partner = availableUsers.find(u => u._id === scheduleForm.partnerId);
      await api.post('/sessions', {
        teacherId: scheduleForm.isTeaching ? user?._id : partner?._id,
        learnerId: scheduleForm.isTeaching ? partner?._id : user?._id,
        skill: scheduleForm.skill || 'Peer Exchange',
        scheduledAt: scheduleForm.scheduledAt || new Date().toISOString(),
        duration: Number(scheduleForm.duration) || 60,
        totalDays: Number(scheduleForm.totalDays) || 1,
        notes: scheduleForm.notes
      });
      setShowScheduleModal(false);
      fetchSessions();
    } catch (err) {
      console.error(err);
    } finally {
      setScheduling(false);
    }
  };

  const updateSessionStatus = async (id, status) => {
    try {
      const res = await api.put(`/sessions/${id}`, { status });
      setSessions((prev) =>
        prev.map((s) => (s._id === id ? { ...s, status: res.data.status } : s))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const deleteSession = async (id) => {
    if (!window.confirm('Delete this session record?')) return;
    try {
      await api.delete(`/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (dateString) => {
    const options = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading)
    return <div className="text-center py-20 text-gray-400">Loading sessions...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white">Learning Sessions</h1>
            <p className="text-gray-400 text-sm">
              Manage appointments, video rooms, and certify peer achievements on the blockchain.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={openScheduleModal}
            className="btn-primary text-xs font-semibold flex items-center gap-1.5 px-4 py-2 shadow-lg shadow-primary-500/20"
          >
            <Calendar className="w-4 h-4" />
            <span>Schedule Session</span>
          </button>
          <Link
            to="/verify"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary-500/10 text-primary-300 border border-primary-500/30 hover:bg-primary-500/20 transition-all"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Public Credential Verifier</span>
          </Link>
        </div>
      </div>

      {sessions.length > 0 ? (
        <div className="grid gap-6">
          {sessions.map((session) => {
            const isTeacher = session.teacher?._id === user?._id;
            const partner = isTeacher ? session.learner : session.teacher;
            const certifiedTokenId = certifiedMap[session._id];

            return (
              <div
                key={session._id}
                className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row gap-6 items-start md:items-center hover:border-slate-700 transition-all duration-300 shadow-xl group"
              >
                {/* Partner Pic & Skill Details */}
                <div className="flex items-center gap-4 flex-grow min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden shadow-inner group-hover:border-primary-500/50 transition-colors">
                    {partner?.profilePic ? (
                      <img
                        src={partner.profilePic}
                        alt={partner.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-primary-400">
                        {partner?.name?.charAt(0) || 'U'}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-grow">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-xl font-bold text-white truncate">
                        {session.skill}
                      </h3>
                      <span
                        className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md ${
                          isTeacher
                            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {isTeacher ? 'Teaching (Mentor)' : 'Learning (Learner)'}
                      </span>

                      {certifiedTokenId && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle className="w-3 h-3 text-emerald-400" />
                          <span>NFT #{certifiedTokenId}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                      <p className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-primary-400" />{' '}
                        {formatDate(session.scheduledAt)}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary-400" />{' '}
                        {session.totalDays || 1} Days scheduled
                      </p>
                      <p>
                        with{' '}
                        <span className="text-white font-medium">
                          {partner?.name || 'Partner'}
                        </span>
                      </p>
                    </div>

                    {/* Status Pill */}
                    <div className="flex items-center gap-2 mt-3">
                      <span
                        className={`text-xs font-semibold flex items-center gap-1.5 px-3 py-0.5 rounded-full border ${
                          session.status === 'scheduled'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : session.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            session.status === 'scheduled'
                              ? 'bg-amber-400 animate-pulse'
                              : session.status === 'completed'
                              ? 'bg-emerald-400'
                              : 'bg-red-400'
                          }`}
                        />
                        {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:ml-4">
                  {/* Video Call button */}
                  {session.status === 'scheduled' && (
                    <button
                      onClick={() => navigate(`/session/${session._id}/call`)}
                      className="btn-primary px-4 py-2 flex items-center gap-2 text-xs"
                    >
                      <Video className="w-4 h-4" /> Start Call
                    </button>
                  )}

                  {/* Complete / Cancel */}
                  {session.status === 'scheduled' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateSessionStatus(session._id, 'completed')}
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 p-2 rounded-xl transition-colors border border-emerald-500/20"
                        title="Mark as Complete"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => updateSessionStatus(session._id, 'cancelled')}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-xl transition-colors border border-red-500/20"
                        title="Cancel Session"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Blockchain Certification CTA */}
                  {session.status === 'completed' && (
                    <>
                      {certifiedTokenId ? (
                        <Link
                          to={`/verify/${certifiedTokenId}`}
                          className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                        >
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>View Credential NFT</span>
                        </Link>
                      ) : (
                        <button
                          onClick={() => setCertModalSession(session)}
                          className="btn-primary px-3.5 py-2 flex items-center gap-1.5 text-xs font-bold shadow-lg shadow-primary-500/20"
                        >
                          <Award className="w-4 h-4" />
                          <span>Certify on Chain</span>
                        </button>
                      )}
                    </>
                  )}

                  {/* Delete record */}
                  {(session.status === 'completed' || session.status === 'cancelled') && (
                    <button
                      onClick={() => deleteSession(session._id)}
                      className="p-2 bg-slate-800 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-xl border border-slate-700 transition-all"
                      title="Delete Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-500 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800 p-8">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-700" />
          <p className="text-lg text-slate-300 font-medium">No sessions scheduled yet.</p>
          <p className="text-sm mt-1 text-gray-500">
            Accept a skill request and schedule a meeting to begin learning or teaching.
          </p>
        </div>
      )}

      {/* Direct Scheduling Modal */}
      {showScheduleModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setShowScheduleModal(false)}
        >
          <div
            className="bg-[#1e293b] border border-slate-700/80 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/50 mb-5">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary-400" />
                  Schedule Learning Session
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Set up a verified peer session on SkillSwap
                </p>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDirectSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Select Peer Partner
                </label>
                {availableUsers.length > 0 ? (
                  <select
                    value={scheduleForm.partnerId}
                    onChange={(e) => {
                      const pid = e.target.value;
                      const u = availableUsers.find((x) => x._id === pid);
                      const s = typeof u?.skills?.[0] === 'string' ? u.skills[0] : u?.skills?.[0]?.name;
                      setScheduleForm((prev) => ({
                        ...prev,
                        partnerId: pid,
                        skill: s || prev.skill
                      }));
                    }}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500"
                    required
                  >
                    {availableUsers.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                    No other users available in community yet.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Skill Focus
                </label>
                <input
                  type="text"
                  value={scheduleForm.skill}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, skill: e.target.value })}
                  placeholder="e.g. Go, Smart Contracts, Solidity"
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setScheduleForm({ ...scheduleForm, isTeaching: true })}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    scheduleForm.isTeaching
                      ? 'bg-primary-600/20 border-primary-500 text-primary-300'
                      : 'bg-[#0f172a] border-slate-700 text-slate-400'
                  }`}
                >
                  I will Teach (Mentor)
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleForm({ ...scheduleForm, isTeaching: false })}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    !scheduleForm.isTeaching
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                      : 'bg-[#0f172a] border-slate-700 text-slate-400'
                  }`}
                >
                  I will Learn (Learner)
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduleForm.scheduledAt}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, scheduledAt: e.target.value })
                  }
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Duration (mins)
                  </label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={scheduleForm.duration}
                    onChange={(e) =>
                      setScheduleForm({ ...scheduleForm, duration: e.target.value })
                    }
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Total Days
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={scheduleForm.totalDays}
                    onChange={(e) =>
                      setScheduleForm({ ...scheduleForm, totalDays: e.target.value })
                    }
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Session Notes (Optional)
                </label>
                <textarea
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  placeholder="Outline topics, agenda, or learning targets..."
                  rows={2}
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="btn-secondary flex-1 py-2.5 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduling || !scheduleForm.partnerId || !scheduleForm.scheduledAt}
                  className="btn-primary flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {scheduling ? 'Scheduling...' : 'Confirm Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* On-Chain Certification Modal */}
      {certModalSession && (
        <IssueCredentialModal
          session={certModalSession}
          onClose={() => setCertModalSession(null)}
          onCredentialIssued={({ tokenId }) => {
            if (tokenId && certModalSession._id) {
              setCertifiedMap((prev) => ({ ...prev, [certModalSession._id]: tokenId }));
            }
          }}
        />
      )}
    </div>
  );
};

export default Sessions;

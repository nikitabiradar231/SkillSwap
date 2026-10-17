import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { CheckCircle, XCircle, Clock, Bell, BellOff, ChevronRight, Video, Calendar as CalendarIcon, Link as LinkIcon, History, Trash2, Star, Users, RefreshCw } from 'lucide-react';

const statusConfig = {
  pending:   { icon: Clock,        color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', label: 'Pending' },
  accepted:  { icon: CheckCircle,  color: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/20',  label: 'Accepted' },
  rejected:  { icon: XCircle,      color: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-red-400/20',    label: 'Rejected' },
  completed: { icon: CheckCircle,  color: 'text-primary-400',bg: 'bg-primary-400/10',border: 'border-primary-400/20',label: 'Completed' },
};

const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || statusConfig.pending;
  const Icon = cfg.icon;
  return (
    <span className={`flex items-center gap-1 ${cfg.color} ${cfg.bg} border ${cfg.border} px-2.5 py-1 rounded-full text-xs font-semibold`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
};

const Notifications = () => {
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('received'); // received | sent

  // Scheduling modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [scheduleData, setScheduleData] = useState({
    scheduledAt: '',
    duration: 60,
    totalDays: 1,
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [recRes, sentRes] = await Promise.all([
          api.get('/skills/requests/received'),
          api.get('/skills/requests/sent'),
        ]);
        setReceived(recRes.data);
        setSent(sentRes.data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchAll();
    const interval = setInterval(fetchAll, 4000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (id, status, isSent) => {
    try {
      const res = await api.put(`/skills/request/${id}/status`, { status });
      const updater = prev => prev.map(r => r._id === id ? { ...r, status: res.data.status } : r);
      if (isSent) setSent(updater); else setReceived(updater);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteRequest = async (id, isSent) => {
    if (!window.confirm('Clear this notification?')) return;
    try {
      await api.delete(`/skills/request/${id}`);
      const updater = prev => prev.filter(r => r._id !== id);
      if (isSent) setSent(updater); else setReceived(updater);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;
    setSubmitting(true);
    try {
      // 1. Create the session (Automatically accepts the request on backend)
      await api.post('/sessions', {
        requestId: selectedReq._id,
        scheduledAt: scheduleData.scheduledAt,
        duration: scheduleData.duration,
        totalDays: scheduleData.totalDays,
        notes: scheduleData.notes
      });

      // Update local state to reflect acceptance
      const updater = prev => prev.map(r => r._id === selectedReq._id ? { ...r, status: 'accepted' } : r);
      setReceived(updater);

      setShowScheduleModal(false);
      setSelectedReq(null);
      setScheduleData({ scheduledAt: '', duration: 60, totalDays: 1, notes: '' });
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  const pendingCount = received.filter(r => r.status === 'pending').length;

  const timeAgo = (date) => {
    const diff = (Date.now() - new Date(date)) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const RequestCard = ({ req, incoming }) => (
    <div className="card p-4 flex flex-col gap-3 border border-slate-700/50 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0 overflow-hidden">
            {incoming
              ? (req.requester?.profilePic
                  ? <img src={req.requester.profilePic} alt="" className="w-full h-full object-cover" />
                  : req.requester?.name?.charAt(0).toUpperCase())
              : (req.provider?.profilePic
                  ? <img src={req.provider.profilePic} alt="" className="w-full h-full object-cover" />
                  : req.provider?.name?.charAt(0).toUpperCase())
            }
          </div>
          <div>
            {incoming ? (
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-white">{req.requester?.name}</span>
                {' '}<span className="text-gray-400">wants to learn</span>
              </p>
            ) : (
              <p className="text-sm text-gray-300">
                <span className="text-gray-400">You requested from</span>
                {' '}<span className="font-semibold text-white">{req.provider?.name}</span>
              </p>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-primary-400 font-bold">{req.skill}</p>
              {req.requestType === 'paid' ? (
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-max">
                    <Star className="w-2.5 h-2.5" /> PAID (₹{req.price})
                  </span>
                  {!incoming && req.status === 'accepted' && req.provider?.upiId && (
                     <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">Payment Required</p>
                        <div className="flex items-center gap-2">
                           <span className="text-xs text-white font-mono">{req.provider.upiId}</span>
                           <button 
                             onClick={() => {
                               navigator.clipboard.writeText(req.provider.upiId);
                               alert('UPI ID Copied!');
                             }}
                             className="text-[9px] bg-emerald-500 text-white px-2 py-0.5 rounded hover:bg-emerald-600 transition-colors"
                           >
                             Copy
                           </button>
                        </div>
                        <p className="text-[9px] text-emerald-500/60 mt-1 italic">Pay via GPay or PhonePe to confirm</p>
                     </div>
                  )}
                </div>
              ) : (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                  <Users className="w-2.5 h-2.5" /> SWAP {req.offeredSkill && (
                    <span className="text-[8px] bg-indigo-500/30 px-1 rounded ml-1 text-white">FOR {req.offeredSkill.toUpperCase()}</span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-2">
            <StatusBadge status={req.status} />
            <button 
              onClick={() => deleteRequest(req._id, !incoming)}
              className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
              title="Clear Notification"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-xs text-gray-500">{timeAgo(req.createdAt)}</span>
        </div>
      </div>

      {/* Actions for incoming pending requests */}
      {incoming && req.status === 'pending' && (
        <div className="flex gap-2 pt-2 border-t border-slate-700">
          <button onClick={() => { setSelectedReq(req); setShowScheduleModal(true); }}
            className="flex-1 btn-primary text-sm py-1.5 flex items-center justify-center gap-1">
            <CalendarIcon className="w-4 h-4" /> Schedule & Accept
          </button>
          <button onClick={() => updateStatus(req._id, 'rejected', false)}
            className="flex-1 bg-red-500/20 hover:bg-red-500/40 text-red-200 px-4 py-1.5 rounded-lg transition-colors text-sm font-medium">
            ✗ Reject
          </button>
        </div>
      )}

      {/* Mark complete for incoming accepted */}
      {incoming && req.status === 'accepted' && (
        <div className="pt-2 border-t border-slate-700">
          <button onClick={() => updateStatus(req._id, 'completed', false)}
            className="w-full btn-primary text-sm py-1.5">
            Mark as Completed
          </button>
        </div>
      )}

      {/* Rate button for completed outgoing */}
      {!incoming && req.status === 'completed' && (
        <div className="pt-2 border-t border-slate-700">
          <button className="w-full bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 px-4 py-1.5 rounded-lg transition-colors text-sm font-medium">
            ⭐ Rate this Exchange
          </button>
        </div>
      )}
    </div>
  );

  const active = tab === 'received' ? received : sent;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="w-8 h-8 text-primary-500" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
                {pendingCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-gray-400 text-sm">Your skill request activity</p>
          </div>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-slate-700 active:scale-95"
          title="Refresh Notifications"
        >
          <RefreshCw className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-slate-800/50 p-1 rounded-xl border border-slate-700 w-fit">
        <button
          onClick={() => setTab('received')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${tab === 'received' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Incoming
          {pendingCount > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{pendingCount}</span>
          )}
        </button>
        <button
          onClick={() => setTab('sent')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'sent' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Sent
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500" />
        </div>
      ) : active.length > 0 ? (
        <div className="space-y-3">
          {active.map(req => (
            <RequestCard key={req._id} req={req} incoming={tab === 'received'} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-500">
          <BellOff className="w-16 h-16 mx-auto mb-4 text-slate-700" />
          <p className="text-lg">No {tab === 'received' ? 'incoming' : 'sent'} requests yet.</p>
          <p className="text-sm mt-1">{tab === 'received' ? "When someone requests your skill, it'll appear here." : "Go to the Community page to send a skill request."}</p>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4" onClick={() => setShowScheduleModal(false)}>
          <div className="bg-darkCard border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <CalendarIcon className="w-5 h-5 text-primary-500" />
              <h3 className="text-xl font-bold">Schedule Meeting</h3>
            </div>
            <p className="text-gray-400 text-sm mb-6">Schedule your session with <span className="text-white font-semibold">{selectedReq?.requester?.name}</span> for <span className="text-primary-400 font-bold">{selectedReq?.skill}</span>.</p>

            <form onSubmit={handleSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  className="input-field"
                  value={scheduleData.scheduledAt}
                  onChange={e => setScheduleData({ ...scheduleData, scheduledAt: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Daily Duration</label>
                <div className="flex gap-3 bg-slate-800/50 rounded-xl p-1 border border-slate-700/50">
                  {[60, 120].map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setScheduleData({ ...scheduleData, duration: h })}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${scheduleData.duration === h ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-300'}`}
                    >
                      {h / 60} {h === 60 ? 'Hour' : 'Hours'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">How many days?</label>
                <div className="flex flex-wrap items-center gap-2 bg-slate-800/50 rounded-xl p-1 border border-slate-700/50">
                  {[1, 3, 7, 15, 30, 90].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setScheduleData({ ...scheduleData, totalDays: d })}
                      className={`flex-1 min-w-[60px] py-2 rounded-lg text-xs font-bold transition-all ${scheduleData.totalDays === d ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-300'}`}
                    >
                      {d === 30 ? '1 Mo' : d === 90 ? '3 Mo' : `${d} ${d === 1 ? 'Day' : 'Days'}`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Extra Notes (Optional)</label>
                <textarea
                  placeholder="Anything your learner should know..."
                  className="input-field min-h-[80px]"
                  value={scheduleData.notes}
                  onChange={e => setScheduleData({ ...scheduleData, notes: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 btn-primary"
                >
                  {submitting ? 'Scheduling...' : 'Accept & Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;

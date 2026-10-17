import React, { useEffect, useState, useContext } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { GraduationCap, BookOpen, Users, Star, MessageSquare, Calendar, ArrowRight, Video, ShieldCheck, Award } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const UserCard = ({ u }) => {
  const { user: currentUser } = useContext(AuthContext); // Get current user
  const navigate = useNavigate();
  const [requesting, setRequesting] = useState(false);
  const [skill, setSkill] = useState('');
  const [offeredSkill, setOfferedSkill] = useState(''); // New state
  const [price, setPrice] = useState(0);
  const [requestType, setRequestType] = useState('exchange');
  const [showModal, setShowModal] = useState(false);
  const [done, setDone] = useState(false);

  const sendRequest = async () => {
    if (!skill) return;
    if (requestType === 'exchange' && !offeredSkill) return; // Must offer something
    setRequesting(true);
    try {
      await api.post('/skills/request', { 
        providerId: u._id, 
        skill,
        offeredSkill, // Include in payload
        requestType,
        price: requestType === 'paid' ? price : 0
      });
      setDone(true);
      setTimeout(() => { setShowModal(false); setDone(false); }, 1500);
    } catch (err) {
      console.error(err);
    }
    setRequesting(false);
  };

  return (
    <div className="card hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4 relative group">
      {/* ... previous content ... */}
      <Link to={`/user/${u._id}`} className="flex items-center gap-3 hover:opacity-80 group/user transition-all">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shrink-0 overflow-hidden shadow-lg group-hover/user:ring-2 ring-primary-500/50">
          {u.profilePic
            ? <img src={u.profilePic} alt={u.name} className="w-full h-full object-cover" />
            : u.name?.charAt(0).toUpperCase()
          }
        </div>
        <div className="flex-grow min-w-0">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-semibold text-white group-hover/user:text-primary-400 transition-colors truncate">{u.name}</h3>
            {u.skills?.length > 0 && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 shrink-0">
                ₹{Math.min(...u.skills.map(s => s.price || 0))}+
              </span>
            )}
            {u.walletAddress && (
              <span className="text-[9px] font-mono text-primary-300 bg-primary-500/10 border border-primary-500/20 px-1.5 py-0.5 rounded shrink-0 flex items-center gap-0.5" title={u.walletAddress}>
                ⟠ {u.walletAddress.substring(0, 5)}...
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 line-clamp-1">{u.bio || 'No bio yet'}</p>
        </div>
      </Link>

      {/* Skills to Teach */}
      {u.skills?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-primary-400 flex items-center gap-1 mb-1.5">
            <GraduationCap className="w-3.5 h-3.5" /> Can Teach
          </p>
          <div className="flex flex-wrap gap-1.5">
            {u.skills.slice(0, 5).map((s, i) => (
              <span key={i} className="px-2 py-0.5 bg-primary-900/50 text-primary-300 rounded-full text-[10px] border border-primary-500/20 flex items-center gap-1">
                {s.name} <span className="text-emerald-400 font-bold">₹{s.price}</span>
              </span>
            ))}
            {u.skills.length > 5 && <span className="text-xs text-gray-500">+{u.skills.length - 5}</span>}
          </div>
        </div>
      )}

      {/* Skills to Learn */}
      {u.skillsToLearn?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-green-400 flex items-center gap-1 mb-1.5">
            <BookOpen className="w-3.5 h-3.5" /> Wants to Learn
          </p>
          <div className="flex flex-wrap gap-1.5">
            {u.skillsToLearn.slice(0, 5).map((s, i) => (
              <span key={i} className="px-2 py-0.5 bg-green-900/50 text-green-300 rounded-full text-xs border border-green-500/20">{s}</span>
            ))}
            {u.skillsToLearn.length > 5 && <span className="text-xs text-gray-500">+{u.skillsToLearn.length - 5}</span>}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto">
        {u.skills?.length > 0 && (
          <button
            onClick={() => setShowModal(true)}
            className="flex-grow btn-primary text-sm py-2"
          >
            Request to Learn
          </button>
        )}
        <button
          onClick={() => navigate(`/chat/${u._id}`)}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-primary-400 rounded-xl border border-slate-700 transition-colors flex items-center justify-center group-hover:border-primary-500/50"
          title="Chat with user"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      </div>

      {/* Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setShowModal(false)}>
          <div className="bg-darkCard border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">Request from <span className="text-primary-400">{u.name}</span></h3>
            <p className="text-gray-400 text-sm mb-4">Choose your skill path</p>
            {done ? (
              <div className="text-center text-green-400 font-semibold py-4">✓ Request sent!</div>
            ) : (
              <>
                {/* 1. Select THEIR Skill */}
                <div className="mb-4">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Learn From {u.name}</label>
                  <div className="flex flex-wrap gap-2">
                    {u.skills.map((s, i) => (
                      <button key={i} type="button"
                        onClick={() => { setSkill(s.name); setPrice(s.price); }}
                        className={`px-3 py-1 rounded-full text-xs border transition-all flex items-center gap-2 ${skill === s.name ? 'bg-primary-600 border-primary-500 text-white' : 'bg-slate-800 border-slate-600 text-gray-300 hover:border-primary-500'}`}
                      >
                        {s.name} <span className={`text-[10px] font-bold ${skill === s.name ? 'text-primary-200' : 'text-emerald-400'}`}>₹{s.price}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Select Type */}
                <div className="mb-6">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Request Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button"
                      onClick={() => setRequestType('exchange')}
                      className={`py-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${requestType === 'exchange' ? 'bg-primary-600/20 border-primary-500 text-primary-400' : 'bg-slate-800 border-slate-700 text-gray-500 hover:border-slate-500'}`}
                    >
                      <Users className="w-4 h-4" />
                      <span className="text-xs font-bold">Skill Swap</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setRequestType('paid')}
                      className={`py-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${requestType === 'paid' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 text-gray-500 hover:border-slate-500'}`}
                    >
                      <Star className="w-4 h-4" />
                      <span className="text-xs font-bold">Paid Course</span>
                    </button>
                  </div>
                </div>

                {/* 3. If Swap, select YOUR Skill to offer */}
                {requestType === 'exchange' && (
                  <div className="mb-6 animate-in slide-in-from-top-2 duration-300">
                    <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Offer Your Skill In Exchange</label>
                    <div className="flex flex-wrap gap-2">
                      {currentUser?.skills?.length > 0 ? (
                        currentUser.skills.map((s, i) => (
                          <button key={i} type="button"
                            onClick={() => setOfferedSkill(s.name)}
                            className={`px-3 py-1 rounded-full text-xs border transition-all ${offeredSkill === s.name ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-gray-400 hover:border-indigo-500'}`}
                          >
                            {s.name}
                          </button>
                        ))
                      ) : (
                        <p className="text-[10px] text-red-400">You must add skills to your profile to swap!</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button 
                    onClick={sendRequest} 
                    disabled={requesting || !skill || (requestType === 'exchange' && !offeredSkill)} 
                    className="btn-primary flex-1 py-2 text-sm"
                  >
                    {requesting ? 'Sending...' : 'Confirm Request'}
                  </button>
                  <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 py-2 text-sm font-medium">Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | teachers | learners

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, sessionsRes] = await Promise.all([
          api.get('/skills/users'),
          api.get('/sessions')
        ]);
        setUsers(usersRes.data.filter(u => u._id !== user?._id));
        setSessions(sessionsRes.data.filter(s => s.status === 'scheduled'));
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      u.name?.toLowerCase().includes(q) ||
      u.skills?.some(s => s.toLowerCase().includes(q)) ||
      u.skillsToLearn?.some(s => s.toLowerCase().includes(q));
    const matchesFilter =
      filter === 'all' ||
      (filter === 'teachers' && u.skills?.length > 0) ||
      (filter === 'learners' && u.skillsToLearn?.length > 0);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="text-primary-500 w-8 h-8" /> Community
          </h1>
          <p className="text-gray-400 mt-1">Discover learners and teachers in SkillSwap</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/verify" className="btn-secondary text-xs sm:text-sm flex items-center gap-1.5 border-primary-500/30 text-primary-300 bg-primary-500/10 hover:bg-primary-500/20">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Verify Credentials
          </Link>
          <Link to="/sessions" className="btn-secondary text-xs sm:text-sm flex items-center gap-1.5">
            <Calendar className="w-4 h-4" /> My Sessions
          </Link>
          <Link to="/notifications" className="btn-secondary text-xs sm:text-sm flex items-center gap-1.5">
            🔔 Requests
          </Link>
        </div>
      </div>

      {/* Upcoming Meetings Section */}
      {!loading && sessions.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="text-indigo-400 w-5 h-5" /> Upcoming Meetings
            </h2>
            <Link to="/sessions" className="text-primary-400 text-sm font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.slice(0, 2).map(session => {
              const isTeacher = session.teacher._id === user?._id;
              const partner = isTeacher ? session.learner : session.teacher;
              return (
                <div key={session._id} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between hover:border-primary-500/30 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-600">
                      {partner.profilePic ? <img src={partner.profilePic} className="w-full h-full object-cover" /> : partner.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-white truncate max-w-[150px]">{session.skill}</p>
                      <p className="text-xs text-gray-400">{session.totalDays || 1} Days • {new Date(session.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${isTeacher ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {isTeacher ? 'Teaching' : 'Learning'}
                    </span>
                    <button 
                      onClick={() => navigate(`/session/${session._id}/call`)}
                      className="p-2 bg-primary-600/20 text-primary-400 rounded-lg hover:bg-primary-600/40 transition-colors"
                    >
                      <Video className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          type="text"
          className="input-field flex-grow"
          placeholder="Search by name or skill..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex gap-2">
          {['all', 'teachers', 'learners'].map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize border ${filter === f ? 'bg-primary-600 border-primary-500 text-white' : 'bg-slate-800 border-slate-700 text-gray-300 hover:border-primary-500'}`}
            >{f}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(u => <UserCard key={u._id} u={u} />)}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-500">
          <Users className="w-16 h-16 mx-auto mb-4 text-slate-700" />
          <p className="text-lg">No users found{search ? ` for "${search}"` : ''}.</p>
          <p className="text-sm mt-1">Try adjusting your search or filter.</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

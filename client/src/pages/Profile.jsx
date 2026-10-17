import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Camera, Square, LogOut, Trash2 } from 'lucide-react';
import WalletConnect from '../components/WalletConnect';

const Profile = () => {
  const { user, setUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const [formData, setFormData] = useState({ name: '', bio: '', profilePic: '', upiId: '' });
  const [skillsToTeach, setSkillsToTeach] = useState([]);
  const [skillsToLearn, setSkillsToLearn] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Teach Skill Inputs
  const [teachSkillName, setTeachSkillName] = useState('');
  const [teachSkillPrice, setTeachSkillPrice] = useState('');

  const inputClass = `w-full rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none transition-colors ${isEditing ? 'bg-[#0f172a] border border-slate-700/50 shadow-inner focus:border-slate-500 placeholder:text-slate-600' : 'bg-[#0f172a] border border-transparent cursor-default shadow-sm'}`;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data);
        setFormData({
          name: res.data.name || '',
          bio: res.data.bio || '',
          profilePic: res.data.profilePic || '',
          upiId: res.data.upiId || '',
        });
        setSkillsToTeach(res.data.skills || []);
        setSkillsToLearn(res.data.skillsToLearn || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchProfile();
  }, [setUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEditing) return;
    if (!formData.name) return setError('Name is required');
    setSaving(true);
    try {
      const res = await api.put('/profile', {
        ...formData,
        skills: skillsToTeach,
        skillsToLearn,
      });
      setUser(res.data);
      setError('');
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.msg || 'Error updating profile');
    }
    setSaving(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append('profilePic', file);

    try {
      setSaving(true);
      const res = await api.post('/profile/upload', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData(prev => ({ ...prev, profilePic: res.url || res.data.url }));
      setError('');
    } catch (err) {
      setError(err.response?.data?.msg || 'Error uploading file');
    } finally {
      setSaving(false);
    }
  };

  const addTeachSkill = () => {
    const trimmedName = teachSkillName.trim();
    if (trimmedName && !skillsToTeach.some(s => s.name === trimmedName)) {
      setSkillsToTeach([...skillsToTeach, { name: trimmedName, price: Number(teachSkillPrice) || 0 }]);
    }
    setTeachSkillName('');
    setTeachSkillPrice('');
  };

  const removeTeachSkill = (nameToRemove) => {
    setSkillsToTeach(skillsToTeach.filter(s => s.name !== nameToRemove));
  };

  const handleLearnSkillKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = e.target.value.trim();
      if (val && !skillsToLearn.includes(val)) {
        setSkillsToLearn([...skillsToLearn, val]);
        e.target.value = '';
      }
    }
  };

  const removeLearnSkill = (skillToRemove) => {
    setSkillsToLearn(skillsToLearn.filter(s => s !== skillToRemove));
  };

  if (!user) return null; // Or a simple loading state

  // Initials for the avatar placeholder
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#0f172a] py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-[#1e293b] rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
          
          {error && (
            <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Header Section */}
          <div className="p-8 sm:p-10 flex flex-col sm:flex-row gap-8 items-start">
            <div className="w-28 h-28 sm:w-32 sm:h-32 bg-[#25395f] rounded-[1.25rem] flex flex-col items-center justify-center relative overflow-hidden group shrink-0 border border-slate-600/30 shadow-inner">
              {formData.profilePic ? (
                <img src={formData.profilePic} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl sm:text-5xl font-medium text-[#60a5fa]">{getInitials(formData.name)}</span>
              )}
              {isEditing && formData.profilePic && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, profilePic: '' }))}
                  className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white rounded-md p-1.5 transition-colors shadow-sm z-10"
                  title="Remove Picture"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              {isEditing && (
                <div className="absolute bottom-0 w-full bg-[#0f172a]/90 py-1.5 flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#0f172a] transition-colors border-t border-slate-700/50 z-10">
                  <Square className="w-2.5 h-2.5 text-slate-400" />
                  <span className="text-[10px] text-slate-300">{formData.profilePic ? 'Change' : 'Upload'}</span>
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    accept="image/*"
                    onChange={handleFileUpload} 
                    disabled={saving}
                  />
                </div>
              )}
            </div>

            <div className="flex-1 pt-2">
              <h1 className="text-3xl font-medium text-slate-100">{formData.name || 'Your Name'}</h1>
              <p className="text-sm text-slate-500 mt-1.5 font-medium">Pune, Maharashtra</p>
              <div className="mt-5 flex items-start gap-3">
                <span className="text-sm text-slate-300 whitespace-nowrap">bio —</span>
                <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
                  {formData.bio || 'add a short bio here to let learners know who you are and what you teach best.'}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-700/50"></div>

          {/* Grid Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2">
            
            {/* Left Column (Inputs) */}
            <div className="p-8 sm:p-10 space-y-8 lg:border-r border-slate-700/50">
              
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Full Name *</label>
                <input 
                  type="text" 
                  className={inputClass} 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  required 
                  readOnly={!isEditing}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">About Me</label>
                <textarea 
                  rows="4"
                  className={`${inputClass} resize-none`} 
                  value={formData.bio} 
                  onChange={e => setFormData({ ...formData, bio: e.target.value })} 
                  readOnly={!isEditing}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">UPI ID (GPay / PhonePe)</label>
                <input 
                  type="text" 
                  className={inputClass} 
                  placeholder={isEditing ? "user@upi" : ""}
                  value={formData.upiId} 
                  onChange={e => setFormData({ ...formData, upiId: e.target.value })} 
                  readOnly={!isEditing}
                />
              </div>

              {/* Web3 Ethereum Wallet */}
              <div className="pt-2">
                <WalletConnect
                  userWallet={user?.walletAddress}
                  onConnect={(addr) => setUser(prev => ({ ...prev, walletAddress: addr }))}
                />
              </div>

            </div>

            {/* Right Column (Skills) */}
            <div className="p-8 sm:p-10 space-y-10">
              
              {/* Teach Skills */}
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <Square className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <h3 className="text-[#38bdf8] text-[15px] font-medium">Teach skills</h3>
                </div>
                <p className="text-sm text-slate-500 mb-6 max-w-sm">Add skills you can teach and set a price for a complete course.</p>
                
                {skillsToTeach.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-5">
                    {skillsToTeach.map((s, i) => (
                      <div key={i} className="bg-[#2a3b5c] border border-slate-600/50 px-3 py-1.5 rounded-lg flex items-center gap-3 w-fit shadow-sm">
                        <span className="text-sm text-slate-200 font-medium">{s.name}</span>
                        <span className="text-sm text-emerald-400">₹{s.price}</span>
                        {isEditing && (
                          <button type="button" onClick={() => removeTeachSkill(s.name)} className="text-slate-400 hover:text-red-400 text-lg leading-none -mt-0.5">&times;</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {isEditing && (
                  <div className="flex gap-3 mt-2">
                    <input 
                      type="text" 
                      placeholder="e.g., React JS..." 
                      className="flex-[5] bg-[#0f172a] border border-slate-700/50 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-slate-500 shadow-inner placeholder:text-slate-600" 
                      value={teachSkillName}
                      onChange={e => setTeachSkillName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTeachSkill(); } }}
                    />
                    <div className="flex-[3] relative">
                      <span className="absolute left-4 top-3 text-slate-500 text-sm">₹</span>
                      <input 
                        type="number" 
                        placeholder="500" 
                        className="w-full bg-[#0f172a] border border-slate-700/50 rounded-lg pl-8 pr-3 py-3 text-sm text-slate-200 focus:outline-none focus:border-slate-500 shadow-inner placeholder:text-slate-600" 
                        value={teachSkillPrice}
                        onChange={e => setTeachSkillPrice(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTeachSkill(); } }}
                      />
                    </div>
                    <button type="button" onClick={addTeachSkill} className="flex-[2] bg-[#0f172a] hover:bg-slate-800 border border-slate-700/50 text-slate-400 text-sm font-medium rounded-lg transition-colors">
                      Add
                    </button>
                  </div>
                )}
              </div>

              <div className="w-full h-px bg-slate-700/30 my-2"></div>

              {/* Learn Skills */}
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <Square className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <h3 className="text-[#38bdf8] text-[15px] font-medium">Learn skills</h3>
                </div>
                <p className="text-sm text-slate-500 mb-6 max-w-sm">What do you want to learn? Hit Enter to add.</p>
                
                <div className={`bg-[#0f172a] rounded-xl p-5 ${isEditing ? 'border border-slate-700/50 shadow-inner' : 'border border-transparent shadow-sm'}`}>
                  <div className="flex flex-wrap gap-2">
                    {skillsToLearn.map((s, i) => (
                      <span key={i} className="border border-[#1e3a5f] bg-[#172a46] text-[#38bdf8] px-3 py-1.5 rounded-lg text-sm flex items-center gap-2.5 font-medium shadow-sm">
                        <Square className="w-2.5 h-2.5" />
                        {s}
                        {isEditing && (
                          <button type="button" onClick={() => removeLearnSkill(s)} className="text-[#38bdf8]/60 hover:text-red-400 ml-1">&times;</button>
                        )}
                      </span>
                    ))}
                  </div>
                  {isEditing && (
                    <input 
                      type="text" 
                      placeholder="Type a skill and press Enter..." 
                      className="w-full bg-transparent text-sm text-slate-300 focus:outline-none placeholder:text-slate-600 mt-4 border-t border-slate-700/50 pt-5" 
                      onKeyDown={handleLearnSkillKeyDown}
                    />
                  )}
                </div>
              </div>

            </div>
          </div>

          <div className="border-t border-slate-700/50"></div>

          {/* Action Buttons */}
          <div className="px-8 py-5 flex justify-between items-center bg-[#1e293b]">
            <button 
              type="button" 
              onClick={handleLogout}
              className="text-sm text-red-500/80 hover:text-red-400 font-medium px-4 py-2 transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
            <div className="flex gap-3">
              {isEditing ? (
                <>
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        name: user.name || '',
                        bio: user.bio || '',
                        profilePic: user.profilePic || '',
                        upiId: user.upiId || '',
                      });
                      setSkillsToTeach(user.skills || []);
                      setSkillsToLearn(user.skillsToLearn || []);
                    }}
                    className="text-sm text-slate-500 hover:text-slate-300 font-medium px-6 py-2.5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="text-sm text-slate-400 bg-[#0f172a] hover:bg-slate-900 border border-slate-700/50 rounded-lg px-6 py-2.5 font-medium transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
                  >
                    {saving && <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>}
                    Save changes
                  </button>
                </>
              ) : (
                <button 
                  type="button" 
                  onClick={(e) => { e.preventDefault(); setIsEditing(true); }}
                  className="text-sm text-slate-400 bg-[#0f172a] hover:bg-slate-900 border border-slate-700/50 rounded-lg px-6 py-2.5 font-medium transition-colors shadow-sm"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};

export default Profile;

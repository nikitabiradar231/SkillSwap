import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';

const Register = () => {
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await register(formData.name, formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.msg || 'Registration failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[85vh] px-4 animate-in fade-in duration-500">
      <div className="bg-darkCard border border-slate-700/50 rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden group">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary-600/10 rounded-full blur-3xl group-hover:bg-primary-600/20 transition-colors" />
        
        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-900/50 mb-4">
            <UserPlus className="w-8 h-8 text-primary-400" />
          </div>
          <h2 className="text-3xl font-bold">Join SkillSwap</h2>
          <p className="text-gray-400 mt-2">Create an account to start sharing skills</p>
        </div>
        
        {error && <div className="p-3 bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg mb-6 text-sm text-center relative z-10">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
            <input type="text" name="name" className="input-field" value={formData.name} onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input type="email" name="email" className="input-field" value={formData.email} onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input type="password" name="password" className="input-field" value={formData.password} onChange={handleChange} required />
          </div>
          <button type="submit" className="w-full btn-primary mt-6">Sign Up</button>
        </form>
        <p className="text-center text-sm text-gray-400 mt-6 relative z-10">
          Already have an account? <Link to="/login" className="text-primary-400 hover:text-primary-300">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

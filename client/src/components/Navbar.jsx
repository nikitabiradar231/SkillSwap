import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Layers, Bell, Users, User, Calendar, MessageSquare, ShieldCheck, LogOut } from 'lucide-react';
import Web3Status from './Web3Status';

const NavItem = (props) => {
  const isActive = props.pathname.startsWith(props.to) || (props.to === '/dashboard' && props.pathname === '/');
  return (
    <Link
      to={props.to}
      className={`flex flex-col items-center gap-1 p-2 transition-all border-b-2 ${
        isActive
          ? 'text-primary-400 border-primary-400'
          : 'text-gray-400 border-transparent hover:text-primary-400'
      }`}
    >
      {React.createElement(props.icon, { className: 'w-4 h-4' })}
      <span className="text-[10px] font-bold uppercase tracking-tighter">{props.label}</span>
    </Link>
  );
};

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-darkCard/80 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform">
                <Layers className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold bg-gradient-to-r from-white via-primary-200 to-primary-500 bg-clip-text text-transparent leading-none">
                  SkillS
                </span>
                <span className="text-[9px] uppercase tracking-widest text-primary-400 font-bold">
                  Decentralized
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex space-x-4 items-center">
            {user ? (
              <>
                <NavItem to="/dashboard" icon={Users} label="Discover" pathname={location.pathname} />
                <NavItem to="/notifications" icon={Bell} label="Requests" pathname={location.pathname} />
                <NavItem to="/sessions" icon={Calendar} label="Sessions" pathname={location.pathname} />
                <NavItem to="/chat" icon={MessageSquare} label="Chat" pathname={location.pathname} />
                <NavItem to="/verify" icon={ShieldCheck} label="Verify" pathname={location.pathname} />
                <NavItem to="/profile" icon={User} label="Profile" pathname={location.pathname} />
              </>
            ) : (
              <>
                <Link
                  to="/verify"
                  className="flex items-center gap-1.5 text-xs text-primary-300 bg-primary-500/10 border border-primary-500/20 px-3 py-1.5 rounded-xl hover:bg-primary-500/20 transition-all font-semibold"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verify Credentials</span>
                </Link>
                <Link
                  to="/login"
                  className="text-xs text-gray-300 hover:text-white px-3 py-1.5 transition-colors font-medium"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="btn-primary text-xs py-1.5 px-3.5"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Web3 Status & Mobile Action */}
          <div className="flex items-center space-x-3">
            <Web3Status />
            {user && (
              <button
                onClick={handleLogout}
                className="hidden md:flex text-gray-500 hover:text-red-400 p-2 transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

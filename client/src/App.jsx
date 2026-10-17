import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Notifications from './pages/Notifications';
import Sessions from './pages/Sessions';
import Chat from './pages/Chat';
import VideoCall from './pages/VideoCall';
import UserDetail from './pages/UserDetail';
import VerifyCredential from './pages/VerifyCredential';
import { Web3Provider } from './context/Web3Context';

function App() {
  return (
    <Web3Provider>
      <Router>
        <div className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/sessions" element={<Sessions />} />
              <Route path="/chat/:userId?" element={<Chat />} />
              <Route path="/session/:sessionId/call" element={<VideoCall />} />
              <Route path="/user/:userId" element={<UserDetail />} />
              <Route path="/verify/:id?" element={<VerifyCredential />} />
            </Routes>
          </main>
        </div>
      </Router>
    </Web3Provider>
  );
}

export default App;

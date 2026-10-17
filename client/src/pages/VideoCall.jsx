import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, 
  Monitor, MoreVertical, MessageSquare, Users, 
  Maximize2, Settings, Shield, Clock, User
} from 'lucide-react';

const VideoCall = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [session, setSession] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [time, setTime] = useState(0);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const socket = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const initializeWebRTC = (stream) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    peerConnection.current = pc;

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current.emit('ice-candidate', { roomId: sessionId, candidate: event.candidate });
      }
    };

    socket.current.on('user_joined', async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.current.emit('offer', { roomId: sessionId, offer });
    });

    socket.current.on('offer', async (data) => {
      if (data.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.current.emit('answer', { roomId: sessionId, answer });
      }
    });

    socket.current.on('answer', async (data) => {
      if (data.answer) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    socket.current.on('ice-candidate', async (data) => {
      if (data.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });
  };

  useEffect(() => {
    socket.current = io('http://localhost:5000');

    const getMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        initializeWebRTC(stream);
        socket.current.emit('join_video_room', sessionId);

      } catch (err) {
        console.error("Error accessing media devices.", err);
      }
    };

    getMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [sessionId]);

  useEffect(() => {
    if (localStream) {
        localStream.getVideoTracks().forEach(track => track.enabled = !isVideoOff);
    }
  }, [isVideoOff, localStream]);

  useEffect(() => {
    if (localStream) {
        localStream.getAudioTracks().forEach(track => track.enabled = !isMuted);
    }
  }, [isMuted, localStream]);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await api.get('/sessions');
        const found = res.data.find(s => s._id === sessionId);
        setSession(found);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSession();

    const timer = setInterval(() => setTime(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [sessionId]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    navigate('/sessions');
  };

  if (!session) return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500" />
        <p className="text-gray-400 font-medium">Connecting...</p>
      </div>
    </div>
  );

  const partner = session.teacher?._id === user?._id ? session.learner : session.teacher;

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col font-sans overflow-hidden select-none">
      {/* Remote Participant (Full Screen) */}
      <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover absolute inset-0"
        />
        {/* Overlay gradient for UI elements */}
        <div className="w-full h-full bg-gradient-to-b from-black/40 via-transparent to-black/60 relative z-10">
          {/* Fallback Partner Stream when no video */}
          {!remoteStream && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-2xl mb-4">
                {partner?.profilePic ? (
                  <img src={partner.profilePic} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <User size={50} className="text-slate-500" />
                )}
              </div>
              <h2 className="text-2xl font-medium text-white">{partner?.name}</h2>
              <p className="text-emerald-400 text-sm mt-1 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                Waiting for partner...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Top Overlay (Header) */}
      <div className="absolute top-0 left-0 right-0 p-8 flex flex-col items-center z-20">
        <div className="flex items-center gap-2 text-gray-300 text-sm opacity-80 mb-1">
           <Shield className="w-3 h-3 text-emerald-500" />
           <span className="text-xs uppercase tracking-[0.2em] font-bold">End-to-End Encrypted</span>
        </div>
        <h3 className="text-lg font-semibold">{partner?.name}</h3>
        <p className="text-sm font-mono opacity-80">{formatTime(time)}</p>
      </div>

      {/* Local Preview (Floating Top Right - WhatsApp style) */}
      <div 
        className="absolute top-10 right-6 w-32 h-44 bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-white/10 z-30 transition-transform active:scale-95"
      >
        {isVideoOff ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900">
             <VideoOff className="w-6 h-6 text-slate-600" />
             <span className="text-[8px] mt-2 text-slate-600 font-bold">PAUSED</span>
          </div>
        ) : (
          <div className="w-full h-full bg-slate-700 relative">
             <video 
               ref={localVideoRef} 
               autoPlay 
               muted 
               playsInline 
               className="w-full h-full object-cover"
             />
             {!localStream && (
               <div className="absolute inset-0 flex items-center justify-center">
                  <User className="text-slate-500 animate-pulse" />
               </div>
             )}
          </div>
        )}
      </div>

      {/* Controls Overlay (Bottom) */}
      <div className="absolute bottom-0 left-0 right-0 p-10 pb-16 flex justify-center items-center gap-8 z-20 bg-gradient-to-t from-black/80 to-transparent">
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg ${isMuted ? 'bg-white text-black' : 'bg-white/10 backdrop-blur-md text-white border border-white/20'}`}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        <button 
          onClick={handleEndCall}
          className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-2xl shadow-red-900/50 hover:bg-red-700 transition-all active:scale-90 animate-in zoom-in spin-in-12 duration-500"
        >
          <PhoneOff className="w-8 h-8" />
        </button>

        <button 
          onClick={() => setIsVideoOff(!isVideoOff)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg ${isVideoOff ? 'bg-white text-black' : 'bg-white/10 backdrop-blur-md text-white border border-white/20'}`}
        >
          {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
        </button>

        <button className="absolute right-10 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10 opacity-60 hover:opacity-100 transition-all">
           <Monitor className="w-5 h-5" />
        </button>
      </div>

      {/* Notification for Mute/Video */}
      {(isMuted || isVideoOff) && (
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-full backdrop-blur-lg border border-white/10 text-xs font-medium text-white/80 animate-in slide-in-from-bottom-4">
              {isMuted && isVideoOff ? 'Your mic and camera are off' : isMuted ? 'Your mic is off' : 'Your camera is off'}
          </div>
      )}
    </div>
  );
};

export default VideoCall;

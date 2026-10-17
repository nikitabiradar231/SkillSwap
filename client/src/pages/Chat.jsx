import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { Send, MessageSquare, User, Search, Circle, Trash2, MoreVertical } from 'lucide-react';
import { io } from 'socket.io-client';

const Chat = () => {
  const { user } = useContext(AuthContext);
  const { userId } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef();
  const socket = useRef();

  const fetchConversations = async () => {
    try {
      const res = await api.get('/messages/conversations');
      // For each conversation, we need the other user's actual profile info
      const enriched = await Promise.all(res.data.map(async (conv) => {
        const userRes = await api.get(`/profile/${conv.otherUserId}`);
        return { ...conv, otherUser: userRes.data };
      }));
      setConversations(enriched);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    socket.current = io('http://localhost:5000'); // Socket URL

    socket.current.on('receive_message', (data) => {
      // If we are currently chatting with this user, add the message
      if (selectedUser && (data.sender === selectedUser._id || data.sender === user?._id)) {
        setMessages((prev) => [...prev, data]);
      }
      // Refresh conversation list to show latest message preview
      fetchConversations();
    });

    return () => socket.current.disconnect();
  }, [selectedUser, user]);

  useEffect(() => {
    const initChat = async () => {
      await fetchConversations();
      setLoading(false);
    };
    initChat();
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (userId && user) {
      const existing = conversations.find(c => c.otherUserId === userId);
      if (existing) {
        Promise.resolve().then(() => {
          if (isMounted) setSelectedUser(existing.otherUser);
        });
      } else {
        const fetchTargetUser = async () => {
          try {
            const res = await api.get(`/profile/${userId}`);
            if (isMounted) setSelectedUser(res.data);
          } catch (err) {
            console.error('Error fetching target user:', err);
          }
        };
        fetchTargetUser();
      }
    }
    return () => { isMounted = false; };
  }, [userId, conversations, user]);

  useEffect(() => {
    if (selectedUser) {
      const fetchMessages = async () => {
        const res = await api.get(`/messages/${selectedUser._id}`);
        setMessages(res.data);
        const roomId = [user._id, selectedUser._id].sort().join('_');
        socket.current.emit('join_room', roomId);
      };
      fetchMessages();
    }
  }, [selectedUser, user]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    try {
      const res = await api.post('/messages', {
        receiverId: selectedUser._id,
        content: newMessage
      });

      const roomId = [user._id, selectedUser._id].sort().join('_');
      socket.current.emit('send_message', {
        roomId,
        sender: user._id,
        content: newMessage
      });

      setMessages([...messages, res.data]);
      setNewMessage('');
      fetchConversations();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteMessage = async (msgId) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await api.delete(`/messages/${msgId}`);
      setMessages((prev) => prev.filter(m => m._id !== msgId));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteConversation = async () => {
    if (!selectedUser) return;
    if (!window.confirm(`Delete entire conversation with ${selectedUser.name}?`)) return;
    try {
      await api.delete(`/messages/conversation/${selectedUser._id}`);
      setMessages([]);
      fetchConversations();
      navigate('/chat');
      setSelectedUser(null);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading chat...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 h-[calc(100vh-10rem)]">
      <div className="card h-full p-0 flex flex-row overflow-hidden border-slate-700/50">
        {/* Sidebar */}
        <div className="w-1/3 border-r border-slate-700/50 flex flex-col">
          <div className="p-4 border-b border-slate-700/50">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-primary-500" /> Messages
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input type="text" placeholder="Search conversations..." className="input-field pl-9 py-2 text-sm" />
            </div>
          </div>
          <div className="flex-grow overflow-y-auto">
            {conversations.length > 0 ? (
              conversations.map((conv) => (
                <button
                  key={conv.otherUserId}
                  onClick={() => navigate(`/chat/${conv.otherUserId}`)}
                  className={`w-full p-4 flex items-center gap-3 transition-colors hover:bg-slate-800/50 border-b border-slate-700/30 ${selectedUser?._id === conv.otherUserId ? 'bg-primary-500/10 border-r-2 border-r-primary-500' : ''}`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-slate-700">
                      {conv.otherUser.profilePic ? (
                        <img src={conv.otherUser.profilePic} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-gray-500" />
                      )}
                    </div>
                  </div>
                  <div className="text-left flex-grow">
                    <h3 className="text-sm font-bold text-white">{conv.otherUser.name}</h3>
                    <p className="text-xs text-gray-500 truncate max-w-[120px]">{conv.lastMessage}</p>
                  </div>
                  <span className="text-[10px] text-gray-600 self-start mt-1">
                    {new Date(conv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-gray-600">
                <p className="text-sm italic">No conversations yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="flex-grow flex flex-col bg-slate-900/30">
          {selectedUser ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-slate-700/50 flex items-center gap-3 bg-darkCard/50">
                <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden shrink-0 border border-slate-700">
                  {selectedUser.profilePic ? (
                    <img src={selectedUser.profilePic} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary-900/50 text-primary-400 font-bold">{selectedUser.name.charAt(0)}</div>
                  )}
                </div>
                <div className="flex-grow">
                  <h3 className="font-bold text-white text-sm">{selectedUser.name}</h3>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <Circle className="w-2 h-2 fill-emerald-400" /> Online
                  </p>
                </div>
                <button 
                  onClick={deleteConversation}
                  className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-lg transition-colors"
                  title="Delete Conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Messages Area */}
              <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {messages.map((msg, i) => {
                  const isOwn = msg.sender === user?._id;
                  return (
                    <div key={i} className={`flex group ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className="flex items-center gap-2 max-w-[70%]">
                        {isOwn && (
                          <button 
                            onClick={() => deleteMessage(msg._id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-600 hover:text-red-400 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <div className={`rounded-2xl px-4 py-2 text-sm shadow-lg ${isOwn ? 'bg-primary-600 text-white rounded-br-none' : 'bg-slate-800 text-gray-200 rounded-bl-none'}`}>
                          {msg.content}
                          <p className={`text-[10px] mt-1 ${isOwn ? 'text-primary-200' : 'text-gray-500'} text-right`}>
                             {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={scrollRef} />
              </div>

              {/* Input Area */}
              <form onSubmit={sendMessage} className="p-4 border-t border-slate-700/50 bg-darkCard/50 flex gap-2">
                <input
                  type="text"
                  className="input-field flex-grow py-2 text-sm"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                />
                <button type="submit" disabled={!newMessage.trim()} className="btn-primary p-2 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-gray-600">
              <MessageSquare className="w-16 h-16 mb-4 opacity-10" />
              <p className="text-lg font-medium opacity-50">Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;

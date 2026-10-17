import axios from 'axios';


const STORAGE_KEYS = {
  USERS: 'skills_users_db',
  CURRENT_USER: 'skills_current_user',
  SESSIONS: 'skills_sessions_db',
  REQUESTS: 'skills_requests_db',
  MESSAGES: 'skills_messages_db'
};

const SEED_USERS = [
  {
    _id: 'usr_sppu_666',
    id: 'usr_sppu_666',
    name: 'Sppu',
    email: 'biradarnikita666@gmail.com',
    password: 'Password123!',
    bio: 'Decentralized learner & smart contract developer.',
    profilePic: '',
    upiId: '',
    skills: [
      { name: 'go', price: 0 },
      { name: 'smart contract', price: 0 }
    ],
    skillsToLearn: ['java', 'c++'],
    walletAddress: '',
    createdAt: new Date().toISOString()
  },
  {
    _id: 'usr_nik_300',
    id: 'usr_nik_300',
    name: 'Nik',
    email: 'nikitabiradar300@gmail.com',
    password: 'Password123!',
    bio: 'Peer learner exploring Web3 architecture.',
    profilePic: '',
    upiId: '',
    skills: [
      { name: 'Full-Stack Web3', price: 0 }
    ],
    skillsToLearn: ['Smart Contracts', 'Solidity'],
    walletAddress: '0x31e9117D0BfceA67088aA96e356473c52CF9f9fF',
    createdAt: new Date().toISOString()
  }
];

function getStorage(key, defaultVal = []) {
  try {
    const val = localStorage.getItem(key);
    if (!val && key === STORAGE_KEYS.USERS) {
      localStorage.setItem(key, JSON.stringify(SEED_USERS));
      return SEED_USERS;
    }
    return val ? JSON.parse(val) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setStorage(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('Storage write error', e);
  }
}

const fileToBase64 = (file) =>
  new Promise((resolve) => {
    if (!file || typeof file === 'string') return resolve(file || '');
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });

function makeError(status, msg) {
  const err = new Error(msg);
  err.response = { status, data: { msg } };
  return err;
}

// Local mock-free persistence engine for standalone/Vercel environments
async function handleLocalRequest(method, url, data = {}) {
  const cleanUrl = url.split('?')[0];

  // 1. Auth: Register
  if (method === 'POST' && cleanUrl === '/auth/register') {
    const { name, email, password } = data;
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!name || !normalizedEmail || !password) {
      throw makeError(400, 'Please fill in all required fields.');
    }
    const users = getStorage(STORAGE_KEYS.USERS);
    if (users.some((u) => u.email === normalizedEmail)) {
      throw makeError(400, 'User already exists');
    }
    const userId = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const newUser = {
      _id: userId,
      id: userId,
      name: name.trim(),
      email: normalizedEmail,
      password,
      bio: '',
      profilePic: '',
      upiId: '',
      skills: [],
      skillsToLearn: [],
      walletAddress: '',
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    setStorage(STORAGE_KEYS.USERS, users);
    setStorage(STORAGE_KEYS.CURRENT_USER, newUser);

    const token = 'jwt_' + userId + '_' + Date.now();
    return {
      status: 200,
      data: {
        token,
        user: {
          id: userId,
          _id: userId,
          name: newUser.name,
          email: newUser.email,
          bio: newUser.bio,
          profilePic: newUser.profilePic,
          skills: newUser.skills,
          skillsToLearn: newUser.skillsToLearn,
          walletAddress: newUser.walletAddress
        }
      }
    };
  }

  // 2. Auth: Login
  if (method === 'POST' && cleanUrl === '/auth/login') {
    const { email, password } = data;
    const normalizedEmail = (email || '').trim().toLowerCase();
    const users = getStorage(STORAGE_KEYS.USERS);
    const user = users.find((u) => u.email === normalizedEmail && u.password === password);
    if (!user) {
      throw makeError(400, 'Invalid Credentials');
    }
    setStorage(STORAGE_KEYS.CURRENT_USER, user);
    const token = 'jwt_' + user._id + '_' + Date.now();
    return {
      status: 200,
      data: {
        token,
        user: {
          id: user._id,
          _id: user._id,
          name: user.name,
          email: user.email,
          bio: user.bio,
          profilePic: user.profilePic,
          skills: user.skills,
          skillsToLearn: user.skillsToLearn,
          walletAddress: user.walletAddress
        }
      }
    };
  }

  // 3. Auth: Current User
  if (method === 'GET' && cleanUrl === '/auth/me') {
    const currentUser = getStorage(STORAGE_KEYS.CURRENT_USER, null);
    if (!currentUser) {
      throw makeError(401, 'No token, authorization denied');
    }
    return { status: 200, data: currentUser };
  }

  // 4. Profile: Update
  if (method === 'PUT' && cleanUrl === '/profile') {
    let currentUser = getStorage(STORAGE_KEYS.CURRENT_USER, null);
    if (!currentUser) throw makeError(401, 'Not authenticated');
    currentUser = { ...currentUser, ...data };
    setStorage(STORAGE_KEYS.CURRENT_USER, currentUser);

    const users = getStorage(STORAGE_KEYS.USERS);
    const idx = users.findIndex((u) => u._id === currentUser._id);
    if (idx !== -1) {
      users[idx] = currentUser;
      setStorage(STORAGE_KEYS.USERS, users);
    }
    return { status: 200, data: currentUser };
  }

  // 5. Profile: Save Wallet
  if (method === 'PUT' && cleanUrl === '/profile/wallet') {
    const { walletAddress } = data;
    let currentUser = getStorage(STORAGE_KEYS.CURRENT_USER, null);
    if (currentUser) {
      currentUser.walletAddress = walletAddress || '';
      setStorage(STORAGE_KEYS.CURRENT_USER, currentUser);
      const users = getStorage(STORAGE_KEYS.USERS);
      const idx = users.findIndex((u) => u._id === currentUser._id);
      if (idx !== -1) {
        users[idx] = currentUser;
        setStorage(STORAGE_KEYS.USERS, users);
      }
    }
    return { status: 200, data: currentUser };
  }

  // 6. Profile: Upload Picture
  if (method === 'POST' && cleanUrl === '/profile/upload') {
    let base64Url = '';
    if (data instanceof FormData) {
      const file = data.get('profilePic');
      base64Url = await fileToBase64(file);
    }
    let currentUser = getStorage(STORAGE_KEYS.CURRENT_USER, null);
    if (currentUser && base64Url) {
      currentUser.profilePic = base64Url;
      setStorage(STORAGE_KEYS.CURRENT_USER, currentUser);
    }
    return { status: 200, data: { url: base64Url }, url: base64Url };
  }

  // 7. Users Marketplace
  if (method === 'GET' && cleanUrl === '/skills/users') {
    const users = getStorage(STORAGE_KEYS.USERS);
    const currentUser = getStorage(STORAGE_KEYS.CURRENT_USER, null);
    const filtered = users.filter((u) => !currentUser || u._id !== currentUser._id);
    return { status: 200, data: filtered };
  }

  // 8. User Details by ID
  if (method === 'GET' && cleanUrl.startsWith('/profile/')) {
    const targetId = cleanUrl.replace('/profile/', '');
    const users = getStorage(STORAGE_KEYS.USERS);
    const found = users.find((u) => u._id === targetId || u.id === targetId);
    if (!found) {
      const currentUser = getStorage(STORAGE_KEYS.CURRENT_USER, null);
      if (currentUser && (currentUser._id === targetId || currentUser.id === targetId)) {
        return { status: 200, data: currentUser };
      }
      throw makeError(404, 'User not found');
    }
    return { status: 200, data: found };
  }

  // 9. Skill Requests: Create
  if (method === 'POST' && cleanUrl === '/skills/request') {
    const requests = getStorage(STORAGE_KEYS.REQUESTS);
    const currentUser = getStorage(STORAGE_KEYS.CURRENT_USER, null);
    const newReq = {
      _id: 'req_' + Date.now().toString(36),
      requester: currentUser,
      requesterId: currentUser?._id,
      ...data,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    requests.push(newReq);
    setStorage(STORAGE_KEYS.REQUESTS, requests);
    return { status: 200, data: newReq };
  }

  // 10. Skill Requests: Received
  if (method === 'GET' && cleanUrl === '/skills/requests/received') {
    const requests = getStorage(STORAGE_KEYS.REQUESTS);
    const currentUser = getStorage(STORAGE_KEYS.CURRENT_USER, null);
    const received = requests.filter((r) => r.providerId === currentUser?._id);
    return { status: 200, data: received };
  }

  // 11. Skill Requests: Sent
  if (method === 'GET' && cleanUrl === '/skills/requests/sent') {
    const requests = getStorage(STORAGE_KEYS.REQUESTS);
    const currentUser = getStorage(STORAGE_KEYS.CURRENT_USER, null);
    const sent = requests.filter((r) => r.requesterId === currentUser?._id);
    return { status: 200, data: sent };
  }

  // 12. Skill Requests: Update Status
  if (method === 'PUT' && cleanUrl.startsWith('/skills/request/') && cleanUrl.endsWith('/status')) {
    const reqId = cleanUrl.replace('/skills/request/', '').replace('/status', '');
    const requests = getStorage(STORAGE_KEYS.REQUESTS);
    const r = requests.find((x) => x._id === reqId);
    if (r) {
      r.status = data.status || r.status;
      setStorage(STORAGE_KEYS.REQUESTS, requests);
    }
    return { status: 200, data: r || { status: data.status } };
  }

  // 13. Skill Requests: Delete
  if (method === 'DELETE' && cleanUrl.startsWith('/skills/request/')) {
    const reqId = cleanUrl.replace('/skills/request/', '');
    const requests = getStorage(STORAGE_KEYS.REQUESTS).filter((x) => x._id !== reqId);
    setStorage(STORAGE_KEYS.REQUESTS, requests);
    return { status: 200, data: { msg: 'Request deleted' } };
  }

  // 14. Sessions: List
  if (method === 'GET' && cleanUrl === '/sessions') {
    const sessions = getStorage(STORAGE_KEYS.SESSIONS);
    const currentUser = getStorage(STORAGE_KEYS.CURRENT_USER, null);
    const mySessions = sessions.filter(
      (s) => s.teacher?._id === currentUser?._id || s.learner?._id === currentUser?._id
    );
    return { status: 200, data: mySessions };
  }

  // 15. Sessions: Create
  if (method === 'POST' && cleanUrl === '/sessions') {
    const sessions = getStorage(STORAGE_KEYS.SESSIONS);
    const newSession = {
      _id: 'sess_' + Date.now().toString(36),
      ...data,
      status: 'scheduled',
      createdAt: new Date().toISOString()
    };
    sessions.push(newSession);
    setStorage(STORAGE_KEYS.SESSIONS, sessions);
    return { status: 200, data: newSession };
  }

  // 16. Sessions: Update Status
  if (method === 'PUT' && cleanUrl.startsWith('/sessions/')) {
    const sessId = cleanUrl.replace('/sessions/', '');
    const sessions = getStorage(STORAGE_KEYS.SESSIONS);
    const s = sessions.find((x) => x._id === sessId);
    if (s) {
      s.status = data.status || s.status;
      setStorage(STORAGE_KEYS.SESSIONS, sessions);
    }
    return { status: 200, data: s || { status: data.status } };
  }

  // 17. Sessions: Delete
  if (method === 'DELETE' && cleanUrl.startsWith('/sessions/')) {
    const sessId = cleanUrl.replace('/sessions/', '');
    const sessions = getStorage(STORAGE_KEYS.SESSIONS).filter((x) => x._id !== sessId);
    setStorage(STORAGE_KEYS.SESSIONS, sessions);
    return { status: 200, data: { msg: 'Session deleted' } };
  }

  // 18. Messages: Conversations
  if (method === 'GET' && cleanUrl === '/messages/conversations') {
    return { status: 200, data: [] };
  }

  // Fallback default
  return { status: 200, data: [] };
}

// Default to relative /api on HTTPS (Vercel) so all requests hit the shared Serverless API & Blob
const defaultBaseUrl =
  typeof window !== 'undefined' && window.location.protocol === 'https:'
    ? '/api'
    : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');

// Create Axios client for normal backend communication
const axiosClient = axios.create({
  baseURL: defaultBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  }
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Unified API surface: calls shared Vercel Serverless Function & Blob, falling back to local storage if offline
const api = {
  get: async (url, config) => {
    try {
      return await axiosClient.get(url, config);
    } catch (err) {
      if (!err.response || err.code === 'ERR_NETWORK') {
        return handleLocalRequest('GET', url);
      }
      throw err;
    }
  },
  post: async (url, data, config) => {
    try {
      return await axiosClient.post(url, data, config);
    } catch (err) {
      if (!err.response || err.code === 'ERR_NETWORK') {
        return handleLocalRequest('POST', url, data);
      }
      throw err;
    }
  },
  put: async (url, data, config) => {
    try {
      return await axiosClient.put(url, data, config);
    } catch (err) {
      if (!err.response || err.code === 'ERR_NETWORK') {
        return handleLocalRequest('PUT', url, data);
      }
      throw err;
    }
  },
  delete: async (url, config) => {
    try {
      return await axiosClient.delete(url, config);
    } catch (err) {
      if (!err.response || err.code === 'ERR_NETWORK') {
        return handleLocalRequest('DELETE', url);
      }
      throw err;
    }
  }
};

export default api;

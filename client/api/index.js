import { put, list } from '@vercel/blob';

const DB_BLOB_PATH = 'skills_db.json';

// In-memory cache for fast response within lambda lifecycle
let memoryDb = null;
let lastFetchTime = 0;

// Seed data based on active users so they are immediately discoverable on first load
const INITIAL_DB = {
  users: [
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
  ],
  sessions: [],
  requests: [],
  messages: []
};

async function getDb() {
  const now = Date.now();
  if (memoryDb && now - lastFetchTime < 1500) {
    return memoryDb;
  }

  try {
    const { blobs } = await list({ prefix: DB_BLOB_PATH });
    const targetBlob = blobs.find((b) => b.pathname === DB_BLOB_PATH);
    if (targetBlob) {
      const res = await fetch(`${targetBlob.url}?t=${now}`, { cache: 'no-store' });
      if (res.ok) {
        const remoteDb = await res.json();
        // Ensure initial users exist if remote was newly created
        if (!remoteDb.users || remoteDb.users.length === 0) {
          remoteDb.users = [...INITIAL_DB.users];
        } else {
          // Purge test/demo accounts, keep only legitimate users
          remoteDb.users = remoteDb.users.filter(
            (u) => u.email !== 'priya.sharma@gmail.com' && u.email !== 'alex.rivers@gmail.com' && !u.email.includes('test')
          );
          for (const initUser of INITIAL_DB.users) {
            if (!remoteDb.users.some((u) => u.email === initUser.email)) {
              remoteDb.users.push(initUser);
            }
          }
        }
        memoryDb = remoteDb;
        lastFetchTime = now;
        return memoryDb;
      }
    }
  } catch (err) {
    console.error('Blob fetch notice (using cache/init):', err.message);
  }

  if (!memoryDb) {
    memoryDb = JSON.parse(JSON.stringify(INITIAL_DB));
    saveDb(memoryDb).catch(() => {});
  }
  return memoryDb;
}

async function saveDb(db) {
  memoryDb = db;
  lastFetchTime = Date.now();
  try {
    await put(DB_BLOB_PATH, JSON.stringify(db, null, 2), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true
    });
  } catch (err) {
    console.error('Blob save notice:', err.message);
  }
}

function getUserIdFromReq(req, users) {
  const token = req.headers['x-auth-token'] || req.headers['authorization'];
  if (!token) return null;
  const clean = String(token).replace(/^Bearer\s+/, '').trim();
  if (clean.startsWith('token_') || clean.startsWith('jwt_')) {
    const withoutPrefix = clean.replace(/^(jwt_|token_)/, '');
    const lastUnderscore = withoutPrefix.lastIndexOf('_');
    const candId = lastUnderscore !== -1 ? withoutPrefix.substring(0, lastUnderscore) : withoutPrefix;
    const match = users.find((u) => u._id === candId || u.id === candId);
    if (match) return match._id;
  }
  const directMatch = users.find((u) => u._id === clean || u.id === clean || u.email === clean);
  return directMatch ? directMatch._id : null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-auth-token, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse path: support /api/[...slug], query path, or rawUrl
  let cleanPath = '';
  if (req.query && req.query.slug) {
    const slugArr = Array.isArray(req.query.slug) ? req.query.slug : [req.query.slug];
    cleanPath = '/' + slugArr.join('/');
  } else if (req.query && req.query.path) {
    cleanPath = '/' + req.query.path;
  } else {
    const rawUrl = req.url || '';
    cleanPath = rawUrl.replace(/^\/api/, '').split('?')[0] || '/';
  }
  if (!cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath;
  }
  if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
    cleanPath = cleanPath.slice(0, -1);
  }
  const method = req.method.toUpperCase();

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};

  try {
    const db = await getDb();
    const currentUserId = getUserIdFromReq(req, db.users);

    // 1. Healthcheck / Root API
    if (cleanPath === '' || cleanPath === '/') {
      return res.status(200).json({ ok: true, message: 'SkillS API Service' });
    }

    // 2. Auth: Register
    if (method === 'POST' && cleanPath === '/auth/register') {
      let { name, email, password } = body;
      const normalizedEmail = (email || '').trim().toLowerCase();
      if (!name || !normalizedEmail || !password) {
        return res.status(400).json({ msg: 'Please provide name, email, and password.' });
      }

      const existing = db.users.find((u) => u.email === normalizedEmail);
      if (existing) {
        return res.status(400).json({ msg: 'User already exists' });
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

      db.users.push(newUser);
      await saveDb(db);

      const token = 'jwt_' + userId + '_' + Date.now();
      return res.status(200).json({
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
      });
    }

    // 3. Auth: Login
    if (method === 'POST' && cleanPath === '/auth/login') {
      const { email, password } = body;
      const normalizedEmail = (email || '').trim().toLowerCase();
      const user = db.users.find((u) => u.email === normalizedEmail && u.password === password);
      if (!user) {
        return res.status(400).json({ msg: 'Invalid Credentials' });
      }

      const token = 'jwt_' + user._id + '_' + Date.now();
      return res.status(200).json({
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
      });
    }

    // 4. Auth: Current User
    if (method === 'GET' && cleanPath === '/auth/me') {
      if (!currentUserId) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
      }
      const user = db.users.find((u) => u._id === currentUserId || u.id === currentUserId);
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }
      return res.status(200).json(user);
    }

    // 5. Profile: Update
    if (method === 'PUT' && cleanPath === '/profile') {
      if (!currentUserId) {
        return res.status(401).json({ msg: 'Not authenticated' });
      }
      const idx = db.users.findIndex((u) => u._id === currentUserId || u.id === currentUserId);
      if (idx === -1) {
        return res.status(404).json({ msg: 'User not found' });
      }
      db.users[idx] = { ...db.users[idx], ...body };
      await saveDb(db);
      return res.status(200).json(db.users[idx]);
    }

    // 6. Profile: Update Wallet
    if (method === 'PUT' && cleanPath === '/profile/wallet') {
      if (!currentUserId) {
        return res.status(401).json({ msg: 'Not authenticated' });
      }
      const idx = db.users.findIndex((u) => u._id === currentUserId || u.id === currentUserId);
      if (idx !== -1) {
        db.users[idx].walletAddress = body.walletAddress || '';
        await saveDb(db);
        return res.status(200).json(db.users[idx]);
      }
      return res.status(404).json({ msg: 'User not found' });
    }

    // 7. Profile: Upload Picture
    if (method === 'POST' && cleanPath === '/profile/upload') {
      const url = body.url || body.profilePic || '';
      if (currentUserId && url) {
        const idx = db.users.findIndex((u) => u._id === currentUserId);
        if (idx !== -1) {
          db.users[idx].profilePic = url;
          await saveDb(db);
        }
      }
      return res.status(200).json({ url });
    }

    // 8. Skills: Marketplace Users
    if (method === 'GET' && cleanPath === '/skills/users') {
      const filtered = db.users.filter((u) => !currentUserId || (u._id !== currentUserId && u.id !== currentUserId));
      return res.status(200).json(filtered);
    }

    // 9. Profile by ID
    if (method === 'GET' && cleanPath.startsWith('/profile/')) {
      const targetId = cleanPath.replace('/profile/', '');
      const user = db.users.find((u) => u._id === targetId || u.id === targetId);
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }
      return res.status(200).json(user);
    }

    // 10. Skills Requests: Create
    if (method === 'POST' && cleanPath === '/skills/request') {
      if (!currentUserId) return res.status(401).json({ msg: 'Not authenticated' });
      const reqUser = db.users.find((u) => u._id === currentUserId || u.id === currentUserId);
      const newReq = {
        _id: 'req_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        requester: reqUser
          ? { _id: reqUser._id, name: reqUser.name, profilePic: reqUser.profilePic, walletAddress: reqUser.walletAddress }
          : { _id: currentUserId, name: 'Learner' },
        requesterId: currentUserId,
        providerId: body.providerId,
        skill: body.skill,
        offeredSkill: body.offeredSkill || '',
        requestType: body.requestType || 'exchange',
        price: Number(body.price) || 0,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      db.requests = db.requests || [];
      db.requests.push(newReq);
      await saveDb(db);
      return res.status(200).json(newReq);
    }

    // 11. Skills Requests: Received
    if (method === 'GET' && cleanPath === '/skills/requests/received') {
      if (!currentUserId) return res.status(200).json([]);
      const reqs = (db.requests || [])
        .filter((r) => r.providerId === currentUserId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.status(200).json(reqs);
    }

    // 12. Skills Requests: Sent
    if (method === 'GET' && cleanPath === '/skills/requests/sent') {
      if (!currentUserId) return res.status(200).json([]);
      const reqs = (db.requests || [])
        .filter((r) => r.requesterId === currentUserId || r.requester?._id === currentUserId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.status(200).json(reqs);
    }

    // 13. Skills Requests: Update Status
    if (method === 'PUT' && cleanPath.startsWith('/skills/request/') && cleanPath.endsWith('/status')) {
      const reqId = cleanPath.replace('/skills/request/', '').replace('/status', '');
      const r = (db.requests || []).find((x) => x._id === reqId);
      if (r) {
        r.status = body.status || r.status;
        await saveDb(db);
        return res.status(200).json(r);
      }
      return res.status(200).json({ status: body.status });
    }

    // 14. Skills Requests: Delete
    if (method === 'DELETE' && cleanPath.startsWith('/skills/request/')) {
      const reqId = cleanPath.replace('/skills/request/', '');
      db.requests = (db.requests || []).filter((x) => x._id !== reqId);
      await saveDb(db);
      return res.status(200).json({ msg: 'Request deleted' });
    }

    // 15. Sessions: List
    if (method === 'GET' && cleanPath === '/sessions') {
      const mySessions = (db.sessions || []).filter((s) => {
        if (!currentUserId) return true;
        const tId = s.teacher?._id || s.teacher?.id || s.teacher;
        const lId = s.learner?._id || s.learner?.id || s.learner;
        return tId === currentUserId || lId === currentUserId;
      }).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
      return res.status(200).json(mySessions);
    }

    // 16. Sessions: Create / Schedule
    if (method === 'POST' && cleanPath === '/sessions') {
      const { requestId, scheduledAt, duration, totalDays, notes, meetLink, teacherId, learnerId, skill } = body;

      let teacherObj = null;
      let learnerObj = null;
      let sessionSkill = skill || 'Peer Exchange';

      if (requestId) {
        const reqIdx = (db.requests || []).findIndex((r) => r._id === requestId);
        if (reqIdx !== -1) {
          db.requests[reqIdx].status = 'accepted';
          const request = db.requests[reqIdx];
          sessionSkill = request.skill || sessionSkill;

          const provId = request.providerId || request.provider?._id || request.provider;
          const reqId = request.requesterId || request.requester?._id || request.requester;

          const tUser = db.users.find((u) => u._id === provId || u.id === provId);
          const lUser = db.users.find((u) => u._id === reqId || u.id === reqId);

          teacherObj = tUser
            ? { _id: tUser._id, name: tUser.name, profilePic: tUser.profilePic, walletAddress: tUser.walletAddress }
            : { _id: provId, name: 'Teacher' };
          learnerObj = lUser
            ? { _id: lUser._id, name: lUser.name, profilePic: lUser.profilePic, walletAddress: lUser.walletAddress }
            : { _id: reqId, name: 'Learner' };
        }
      }

      if (!teacherObj) {
        const tId = teacherId || currentUserId;
        const tUser = db.users.find((u) => u._id === tId || u.id === tId);
        teacherObj = tUser
          ? { _id: tUser._id, name: tUser.name, profilePic: tUser.profilePic, walletAddress: tUser.walletAddress }
          : { _id: tId, name: 'Teacher' };
      }

      if (!learnerObj) {
        const lId = learnerId || (currentUserId && currentUserId !== teacherObj._id ? currentUserId : null);
        const lUser = db.users.find((u) => u._id === lId || u.id === lId);
        learnerObj = lUser
          ? { _id: lUser._id, name: lUser.name, profilePic: lUser.profilePic, walletAddress: lUser.walletAddress }
          : { _id: lId || 'learner_1', name: 'Learner' };
      }

      const newSession = {
        _id: 'sess_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        skillRequest: requestId || null,
        teacher: teacherObj,
        learner: learnerObj,
        skill: sessionSkill,
        scheduledAt: scheduledAt || new Date().toISOString(),
        duration: Number(duration) || 60,
        totalDays: Number(totalDays) || 1,
        notes: notes || '',
        meetLink: meetLink || '',
        status: 'scheduled',
        createdAt: new Date().toISOString()
      };

      db.sessions = db.sessions || [];
      db.sessions.push(newSession);
      await saveDb(db);
      return res.status(200).json(newSession);
    }

    // 17. Sessions: Update Status
    if (method === 'PUT' && cleanPath.startsWith('/sessions/')) {
      const sessId = cleanPath.replace('/sessions/', '');
      const s = (db.sessions || []).find((x) => x._id === sessId);
      if (s) {
        s.status = body.status || s.status;
        if (body.notes !== undefined) s.notes = body.notes;
        if (body.meetLink !== undefined) s.meetLink = body.meetLink;
        if (body.scheduledAt) s.scheduledAt = body.scheduledAt;
        await saveDb(db);
        return res.status(200).json(s);
      }
      return res.status(200).json({ status: body.status });
    }

    // 18. Sessions: Delete
    if (method === 'DELETE' && cleanPath.startsWith('/sessions/')) {
      const sessId = cleanPath.replace('/sessions/', '');
      db.sessions = (db.sessions || []).filter((x) => x._id !== sessId);
      await saveDb(db);
      return res.status(200).json({ msg: 'Session deleted' });
    }

    // 19. Messages: List Conversations
    if (method === 'GET' && cleanPath === '/messages/conversations') {
      if (!currentUserId) return res.status(200).json([]);
      const userMessages = (db.messages || [])
        .filter((m) => m.sender === currentUserId || m.receiver === currentUserId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const conversations = [];
      const seen = new Set();
      for (const msg of userMessages) {
        const other = msg.sender === currentUserId ? msg.receiver : msg.sender;
        if (!seen.has(other)) {
          seen.add(other);
          conversations.push({
            otherUserId: other,
            lastMessage: msg.content,
            createdAt: msg.createdAt
          });
        }
      }
      return res.status(200).json(conversations);
    }

    // 20. Messages: Get History with specific user
    if (method === 'GET' && cleanPath.startsWith('/messages/') && !cleanPath.startsWith('/messages/conversation/')) {
      const otherUserId = cleanPath.replace('/messages/', '');
      if (!currentUserId || !otherUserId) return res.status(200).json([]);

      const history = (db.messages || [])
        .filter(
          (m) =>
            (m.sender === currentUserId && m.receiver === otherUserId) ||
            (m.sender === otherUserId && m.receiver === currentUserId)
        )
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      return res.status(200).json(history);
    }

    // 21. Messages: Send Message
    if (method === 'POST' && cleanPath === '/messages') {
      if (!currentUserId) {
        return res.status(401).json({ msg: 'Not authenticated' });
      }
      const { receiverId, content } = body;
      if (!receiverId || !content) {
        return res.status(400).json({ msg: 'Receiver and content are required' });
      }

      const newMsg = {
        _id: 'msg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        conversationId: [currentUserId, receiverId].sort().join('_'),
        sender: currentUserId,
        receiver: receiverId,
        content: content.trim(),
        createdAt: new Date().toISOString()
      };

      db.messages = db.messages || [];
      db.messages.push(newMsg);
      await saveDb(db);
      return res.status(200).json(newMsg);
    }

    // 22. Messages: Delete Single Message
    if (method === 'DELETE' && cleanPath.startsWith('/messages/') && !cleanPath.startsWith('/messages/conversation/')) {
      const msgId = cleanPath.replace('/messages/', '');
      db.messages = (db.messages || []).filter((m) => m._id !== msgId);
      await saveDb(db);
      return res.status(200).json({ msg: 'Message deleted' });
    }

    // 23. Messages: Delete Conversation
    if (method === 'DELETE' && cleanPath.startsWith('/messages/conversation/')) {
      const otherUserId = cleanPath.replace('/messages/conversation/', '');
      db.messages = (db.messages || []).filter(
        (m) =>
          !(
            (m.sender === currentUserId && m.receiver === otherUserId) ||
            (m.sender === otherUserId && m.receiver === currentUserId)
          )
      );
      await saveDb(db);
      return res.status(200).json({ msg: 'Conversation deleted' });
    }

    return res.status(200).json([]);
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ msg: 'Server error', error: err.message });
  }
}

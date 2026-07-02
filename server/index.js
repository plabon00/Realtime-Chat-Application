import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Database from 'better-sqlite3';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const httpServer = createServer(app);
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'https://your-frontend-app.vercel.app'];
const io = new Server(httpServer, { cors: { origin: allowedOrigins } });

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '10mb' }));

const db = new Database('chat.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    contactNumber TEXT UNIQUE NOT NULL,
    profilePicture TEXT DEFAULT NULL,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    senderId TEXT NOT NULL,
    recipientId TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (senderId) REFERENCES users(id),
    FOREIGN KEY (recipientId) REFERENCES users(id)
  );

  CREATE TABLE conversations (
    userId TEXT NOT NULL,
    partnerId TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    PRIMARY KEY (userId, partnerId),
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (partnerId) REFERENCES users(id)
  );

  CREATE TABLE tokens (
    token TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE INDEX idx_msg_participants ON messages(senderId, recipientId);
  CREATE INDEX idx_msg_timestamp ON messages(timestamp);
  CREATE INDEX idx_users_contact ON users(contactNumber);
  CREATE INDEX idx_conv_user ON conversations(userId);
`);

const seedUsers = [
  { username: 'Alice Johnson', email: 'alice@example.com', password: 'password123', contactNumber: '+1111111111' },
  { username: 'Bob Smith', email: 'bob@example.com', password: 'password123', contactNumber: '+2222222222' },
  { username: 'Charlie Brown', email: 'charlie@example.com', password: 'password123', contactNumber: '+3333333333' },
  { username: 'Diana Prince', email: 'diana@example.com', password: 'password123', contactNumber: '+4444444444' },
  { username: 'Eve Williams', email: 'eve@example.com', password: 'password123', contactNumber: '+5555555555' },
];

const insertUser = db.prepare(
  'INSERT INTO users (id, username, email, password, contactNumber, profilePicture, createdAt) VALUES (?, ?, ?, ?, ?, NULL, ?)'
);

const seededIds = [];
seedUsers.forEach((u) => {
  const id = 'user_' + crypto.randomBytes(8).toString('hex');
  insertUser.run(id, u.username, u.email, u.password, u.contactNumber, Date.now());
  seededIds.push(id);
});

const insertMsg = db.prepare(
  'INSERT INTO messages (id, senderId, recipientId, text, timestamp) VALUES (?, ?, ?, ?, ?)'
);
const insertConv = db.prepare(
  'INSERT OR IGNORE INTO conversations (userId, partnerId, createdAt) VALUES (?, ?, ?)'
);

const now = Date.now();
const demoMessages = [
  { from: 0, to: 1, text: 'Hey Bob! How are you doing?', offset: -7200000 },
  { from: 1, to: 0, text: 'Hi Alice! Im great, thanks! Working on the new project.', offset: -7100000 },
  { from: 0, to: 1, text: 'Sounds exciting! Tell me more about it.', offset: -7000000 },
  { from: 1, to: 0, text: 'Its a chat application built with React and Node.js 🚀', offset: -6900000 },
  { from: 2, to: 3, text: 'Diana, did you finish the report?', offset: -3600000 },
  { from: 3, to: 2, text: 'Almost done Charlie! Just need to review the numbers.', offset: -3500000 },
  { from: 4, to: 0, text: 'Alice, are we still on for coffee tomorrow?', offset: -1800000 },
  { from: 0, to: 4, text: 'Absolutely Eve! See you at 10am ☕', offset: -1700000 },
];

demoMessages.forEach((m) => {
  const msgId = 'msg_' + crypto.randomBytes(8).toString('hex');
  const ts = now + m.offset;
  insertMsg.run(msgId, seededIds[m.from], seededIds[m.to], m.text, ts);
  insertConv.run(seededIds[m.from], seededIds[m.to], ts);
  insertConv.run(seededIds[m.to], seededIds[m.from], ts);
});

const generateToken = () => crypto.randomBytes(32).toString('hex');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  const row = db.prepare('SELECT userId FROM tokens WHERE token = ?').get(token);
  if (!row) return res.status(401).json({ error: 'Invalid token' });

  const user = db
    .prepare('SELECT id, username, email, contactNumber, profilePicture, createdAt FROM users WHERE id = ?')
    .get(row.userId);
  if (!user) return res.status(401).json({ error: 'User not found' });

  req.user = user;
  next();
};

app.post('/api/auth/signup', (req, res) => {
  const { username, email, password, contactNumber } = req.body;
  if (!username || !email || !password || !contactNumber) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR contactNumber = ?').get(email, contactNumber);
  if (existing) {
    return res.status(409).json({ error: 'User already exists with this email or contact number' });
  }

  const id = 'user_' + crypto.randomBytes(8).toString('hex');
  db.prepare(
    'INSERT INTO users (id, username, email, password, contactNumber, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, username, email, password, contactNumber, Date.now());

  const token = generateToken();
  db.prepare('INSERT INTO tokens (token, userId) VALUES (?, ?)').run(token, id);

  const user = db
    .prepare('SELECT id, username, email, contactNumber, profilePicture, createdAt FROM users WHERE id = ?')
    .get(id);
  res.json({ user, token });
});

app.post('/api/auth/signin', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const row = db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email, password);
  if (!row) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = generateToken();
  db.prepare('INSERT INTO tokens (token, userId) VALUES (?, ?)').run(token, row.id);

  const { password: _, ...user } = row;
  res.json({ user, token });
});

app.get('/api/users/search', authenticate, (req, res) => {
  const q = req.query.q;
  if (!q || q.trim().length === 0) return res.json([]);

  const users = db
    .prepare(
      'SELECT id, username, contactNumber, profilePicture FROM users WHERE contactNumber LIKE ? AND id != ?'
    )
    .all(`%${q}%`, req.user.id);
  res.json(users);
});

app.get('/api/users/profile', authenticate, (req, res) => {
  res.json(req.user);
});

app.put('/api/users/profile', authenticate, (req, res) => {
  const { username, email, contactNumber, profilePicture } = req.body;
  db.prepare(
    `UPDATE users SET
      username = COALESCE(?, username),
      email = COALESCE(?, email),
      contactNumber = COALESCE(?, contactNumber),
      profilePicture = COALESCE(?, profilePicture)
    WHERE id = ?`
  ).run(username || null, email || null, contactNumber || null, profilePicture || null, req.user.id);

  const updated = db
    .prepare('SELECT id, username, email, contactNumber, profilePicture, createdAt FROM users WHERE id = ?')
    .get(req.user.id);
  res.json(updated);
});

app.post('/api/conversations', authenticate, (req, res) => {
  const { partnerId } = req.body;
  if (!partnerId) return res.status(400).json({ error: 'partnerId is required' });

  const partner = db.prepare('SELECT id FROM users WHERE id = ?').get(partnerId);
  if (!partner) return res.status(404).json({ error: 'User not found' });

  db.prepare('INSERT OR IGNORE INTO conversations (userId, partnerId, createdAt) VALUES (?, ?, ?)').run(
    req.user.id,
    partnerId,
    Date.now()
  );

  res.json({ success: true });
});

app.get('/api/chats', authenticate, (req, res) => {
  const conversations = db
    .prepare(
      `SELECT c.partnerId, u.username AS partnerName, u.contactNumber AS partnerNumber, u.profilePicture AS partnerPicture, c.createdAt
       FROM conversations c
       JOIN users u ON u.id = c.partnerId
       WHERE c.userId = ?`
    )
    .all(req.user.id);

  const getLastMsg = db.prepare(
    `SELECT text, timestamp, senderId FROM messages
     WHERE (senderId = ? AND recipientId = ?) OR (senderId = ? AND recipientId = ?)
     ORDER BY timestamp DESC LIMIT 1`
  );

  const result = conversations.map((conv) => {
    const lastMsg = getLastMsg.get(req.user.id, conv.partnerId, conv.partnerId, req.user.id);
    return {
      partnerId: conv.partnerId,
      partnerName: conv.partnerName,
      partnerNumber: conv.partnerNumber,
      partnerPicture: conv.partnerPicture,
      lastMessage: lastMsg?.text || null,
      lastMessageTime: lastMsg?.timestamp || conv.createdAt,
      lastMessageSenderId: lastMsg?.senderId || null,
    };
  });

  result.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
  res.json(result);
});

app.get('/api/messages/:partnerId', authenticate, (req, res) => {
  const messages = db
    .prepare(
      `SELECT id, senderId, recipientId, text, timestamp
       FROM messages
       WHERE (senderId = ? AND recipientId = ?) OR (senderId = ? AND recipientId = ?)
       ORDER BY timestamp ASC`
    )
    .all(req.user.id, req.params.partnerId, req.params.partnerId, req.user.id);

  res.json(messages);
});

app.post('/api/messages', authenticate, (req, res) => {
  const { recipientId, text } = req.body;
  if (!recipientId || !text) {
    return res.status(400).json({ error: 'recipientId and text are required' });
  }

  const recipient = db.prepare('SELECT id, username, contactNumber FROM users WHERE id = ?').get(recipientId);
  if (!recipient) return res.status(404).json({ error: 'Recipient not found' });

  const id = 'msg_' + crypto.randomBytes(8).toString('hex');
  const timestamp = Date.now();

  db.prepare('INSERT INTO messages (id, senderId, recipientId, text, timestamp) VALUES (?, ?, ?, ?, ?)').run(
    id,
    req.user.id,
    recipientId,
    text,
    timestamp
  );

  db.prepare('INSERT OR IGNORE INTO conversations (userId, partnerId, createdAt) VALUES (?, ?, ?)').run(
    req.user.id,
    recipientId,
    timestamp
  );
  db.prepare('INSERT OR IGNORE INTO conversations (userId, partnerId, createdAt) VALUES (?, ?, ?)').run(
    recipientId,
    req.user.id,
    timestamp
  );

  const message = { id, senderId: req.user.id, recipientId, text, timestamp };

  const recipientSocketId = onlineUsers.get(recipientId);
  if (recipientSocketId) {
    io.to(recipientSocketId).emit('new_message', {
      ...message,
      senderName: req.user.username,
      senderNumber: req.user.contactNumber,
      senderPicture: req.user.profilePicture,
    });
  }

  res.json(message);
});

app.post('/api/sync', authenticate, (req, res) => {
  res.json({ success: true, timestamp: Date.now() });
});

const onlineUsers = new Map();

io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;
    io.emit('user_online', userId);
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit('user_offline', socket.userId);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`\n  Plaban Chat Server running on http://localhost:${PORT}`);
  console.log('\n  Dummy accounts (all passwords: password123):');
  console.log('  ─────────────────────────────────────────────');
  console.log('  Alice Johnson    │ alice@example.com      │ +1111111111');
  console.log('  Bob Smith        │ bob@example.com        │ +2222222222');
  console.log('  Charlie Brown    │ charlie@example.com    │ +3333333333');
  console.log('  Diana Prince     │ diana@example.com      │ +4444444444');
  console.log('  Eve Williams     │ eve@example.com        │ +5555555555\n');
});

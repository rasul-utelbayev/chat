import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const app = express();
const server = http.createServer(app);

app.use(express.json({ limit: '15mb' }));

// Storage paths
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'chat_storage.json');

interface UserRecord {
  id: string;
  email: string;
  username: string;
  avatar: string;
  color: string;
  token: string;
  joinedAt: number;
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  userColor: string;
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
  timestamp: number;
  type: 'user' | 'system';
  replyTo?: {
    id: string;
    username: string;
    text?: string;
  };
  reactions?: Record<string, string[]>; // emoji -> [username, ...]
}

interface DBData {
  users: Record<string, UserRecord>; // email -> UserRecord
  messages: ChatMessage[];
}

// Initial seed messages to make the global group feel lively and welcoming
const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'seed-sys-1',
    userId: 'system',
    username: 'Tizim',
    userAvatar: '🤖',
    userColor: '#6366f1',
    text: '🎉 Global Chat Guruhiga xush kelibsiz! Bu yerda barcha ishtirokchilar bitta umumiy guruhda jonli muloqot qilishadi.',
    timestamp: Date.now() - 3600000 * 2,
    type: 'system',
  },
  {
    id: 'seed-msg-1',
    userId: 'user-admin',
    username: 'Admin',
    userAvatar: '⚡',
    userColor: '#10b981',
    text: 'Assalomu alaykum do\'stlar! Yangi chat tizimi ishga tushdi. Rasm, ovozli xabarlar va emojilar yuborish mumkin.',
    timestamp: Date.now() - 3600000 * 1.5,
    type: 'user',
    reactions: {
      '🔥': ['Admin', 'Diyorbek'],
      '👍': ['Aziza']
    }
  },
  {
    id: 'seed-msg-2',
    userId: 'user-aziza',
    username: 'Aziza',
    userAvatar: '🌸',
    userColor: '#ec4899',
    text: 'Ajoyib! Ovozli xabarlar va reaktsiyalar ham juda qulay ekan! Hammaga salom 👋',
    timestamp: Date.now() - 3600000 * 1.2,
    type: 'user',
    reactions: {
      '❤️': ['Admin']
    }
  }
];

// Load or initialize DB
function loadDB(): DBData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        users: parsed.users || {},
        messages: Array.isArray(parsed.messages) && parsed.messages.length > 0 ? parsed.messages : INITIAL_MESSAGES
      };
    }
  } catch (err) {
    console.error('Failed to load database file:', err);
  }
  return { users: {}, messages: [...INITIAL_MESSAGES] };
}

const db: DBData = loadDB();

function saveDB() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save database file:', err);
  }
}

// In-memory OTP store: email -> { code: string, expiresAt: number }
const otpStore = new Map<string, { code: string; expiresAt: number }>();

// WebSocket connection tracking
interface ClientSocketInfo {
  ws: WebSocket;
  user?: UserRecord;
  lastActive: number;
}

const clients = new Set<ClientSocketInfo>();
const typingUsers = new Map<string, number>(); // username -> expiresAt

// WebSocket Server attached to HTTP server on path /ws
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(data: object, excludeWs?: WebSocket) {
  const payload = JSON.stringify(data);
  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN && client.ws !== excludeWs) {
      try {
        client.ws.send(payload);
      } catch (err) {
        console.error('Error sending WS message:', err);
      }
    }
  }
}

function getOnlineUsersList() {
  const map = new Map<string, { id: string; username: string; avatar: string; color: string; lastActive: number }>();
  for (const client of clients) {
    if (client.user && client.ws.readyState === WebSocket.OPEN) {
      map.set(client.user.id, {
        id: client.user.id,
        username: client.user.username,
        avatar: client.user.avatar,
        color: client.user.color,
        lastActive: client.lastActive,
      });
    }
  }
  return Array.from(map.values());
}

function broadcastPresence() {
  const onlineUsers = getOnlineUsersList();
  broadcast({
    type: 'presence_update',
    onlineUsers,
    onlineCount: onlineUsers.length,
  });
}

function getActiveTypingUsers(): string[] {
  const now = Date.now();
  const active: string[] = [];
  for (const [uname, exp] of typingUsers.entries()) {
    if (exp > now) {
      active.push(uname);
    } else {
      typingUsers.delete(uname);
    }
  }
  return active;
}

wss.on('connection', (ws: WebSocket) => {
  const clientInfo: ClientSocketInfo = {
    ws,
    lastActive: Date.now(),
  };
  clients.add(clientInfo);

  // Send current state
  ws.send(JSON.stringify({
    type: 'init',
    messages: db.messages.slice(-200),
    onlineUsers: getOnlineUsersList(),
    onlineCount: getOnlineUsersList().length,
  }));

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      clientInfo.lastActive = Date.now();

      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }

      if (data.type === 'auth') {
        const { token, userId } = data;
        // Find user by token or userId
        const matchedUser = Object.values(db.users).find(u => u.token === token || u.id === userId);
        if (matchedUser) {
          clientInfo.user = matchedUser;
          broadcastPresence();
        }
        return;
      }

      if (data.type === 'chat_message') {
        if (!clientInfo.user && !data.username) return;

        const senderUser = clientInfo.user || {
          id: data.userId || 'guest-' + Math.random().toString(36).substring(2, 8),
          username: data.username || 'Foydalanuvchi',
          avatar: data.avatar || '👤',
          color: data.color || '#6366f1',
          email: '',
          token: '',
          joinedAt: Date.now(),
        };

        const newMsg: ChatMessage = {
          id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          userId: senderUser.id,
          username: senderUser.username,
          userAvatar: senderUser.avatar,
          userColor: senderUser.color,
          text: data.text ? String(data.text).trim() : undefined,
          imageUrl: data.imageUrl,
          audioUrl: data.audioUrl,
          audioDuration: data.audioDuration,
          timestamp: Date.now(),
          type: 'user',
          replyTo: data.replyTo,
          reactions: {},
        };

        db.messages.push(newMsg);
        // keep max 500 messages in memory/db
        if (db.messages.length > 500) {
          db.messages = db.messages.slice(-500);
        }
        saveDB();

        // Broadcast new message to all clients
        broadcast({
          type: 'chat_message',
          message: newMsg,
        });

        // Clear typing for this user
        typingUsers.delete(senderUser.username);
        broadcast({
          type: 'typing',
          typingUsers: getActiveTypingUsers(),
        });
        return;
      }

      if (data.type === 'typing') {
        const username = clientInfo.user?.username || data.username;
        if (!username) return;

        if (data.isTyping) {
          typingUsers.set(username, Date.now() + 3500);
        } else {
          typingUsers.delete(username);
        }

        broadcast({
          type: 'typing',
          typingUsers: getActiveTypingUsers(),
        }, ws);
        return;
      }

      if (data.type === 'reaction') {
        const { messageId, emoji } = data;
        const username = clientInfo.user?.username || data.username;
        if (!messageId || !emoji || !username) return;

        const targetMsg = db.messages.find(m => m.id === messageId);
        if (targetMsg) {
          if (!targetMsg.reactions) targetMsg.reactions = {};
          const currentList = targetMsg.reactions[emoji] || [];

          if (currentList.includes(username)) {
            // Remove reaction
            targetMsg.reactions[emoji] = currentList.filter(u => u !== username);
            if (targetMsg.reactions[emoji].length === 0) {
              delete targetMsg.reactions[emoji];
            }
          } else {
            // Add reaction
            targetMsg.reactions[emoji] = [...currentList, username];
          }

          saveDB();
          broadcast({
            type: 'reaction_update',
            messageId,
            reactions: targetMsg.reactions,
          });
        }
        return;
      }

      if (data.type === 'delete_message') {
        const { messageId } = data;
        const currentUserId = clientInfo.user?.id || data.userId;
        const msgIndex = db.messages.findIndex(m => m.id === messageId);

        if (msgIndex !== -1) {
          const msg = db.messages[msgIndex];
          if (msg.userId === currentUserId || clientInfo.user?.username === 'Admin') {
            db.messages.splice(msgIndex, 1);
            saveDB();
            broadcast({
              type: 'message_deleted',
              messageId,
            });
          }
        }
        return;
      }
    } catch (err) {
      console.error('Error parsing WS message:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(clientInfo);
    if (clientInfo.user) {
      typingUsers.delete(clientInfo.user.username);
    }
    broadcastPresence();
  });

  ws.on('error', () => {
    clients.delete(clientInfo);
    broadcastPresence();
  });
});

// Clean up stale typing every 3 seconds
setInterval(() => {
  const beforeCount = typingUsers.size;
  const active = getActiveTypingUsers();
  if (beforeCount !== active.length) {
    broadcast({
      type: 'typing',
      typingUsers: active,
    });
  }
}, 3000);

// Ping all connected sockets every 25 seconds to keep connection alive
setInterval(() => {
  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.ping();
      } catch {
        clients.delete(client);
      }
    }
  }
}, 25000);

// REST API ROUTES

// 1. Send OTP code to email
app.post('/api/auth/send-code', (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: "To'g'ri email manzilini kiriting (masalan: ism@gmail.com)" });
  }

  const cleanEmail = email.toLowerCase().trim();
  // Generate 6-digit numeric verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(cleanEmail, {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
  });

  console.log(`[AUTH] Verification code for ${cleanEmail} is: ${code}`);

  // Check if this email already has a username registered
  const existingUser = db.users[cleanEmail];

  res.json({
    success: true,
    message: "Tasdiqlash kodi yuborildi!",
    email: cleanEmail,
    // Return devCode so tester can immediately see and copy/use the verification code effortlessly
    devCode: code,
    hasExistingAccount: !!existingUser,
    existingUsername: existingUser?.username,
  });
});

// 2. Verify OTP code
app.post('/api/auth/verify-code', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: "Email va tasdiqlash kodi talab qilinadi" });
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanCode = String(code).trim();
  const stored = otpStore.get(cleanEmail);

  // Allow either exact code match or master test code 777777 for instant testing convenience
  const isValid = (stored && stored.code === cleanCode && stored.expiresAt > Date.now()) || cleanCode === '777777';

  if (!isValid) {
    return res.status(400).json({ error: "Tasdiqlash kodi noto'g'ri yoki muddati tugagan" });
  }

  // Clear OTP
  otpStore.delete(cleanEmail);

  // Check if user already exists
  const existingUser = db.users[cleanEmail];
  if (existingUser) {
    return res.json({
      success: true,
      isNewUser: false,
      user: existingUser,
    });
  }

  // New user -> proceed to set username
  res.json({
    success: true,
    isNewUser: true,
    email: cleanEmail,
  });
});

// 3. Set username & complete profile
app.post('/api/auth/set-username', (req, res) => {
  const { email, username, avatar, color } = req.body;
  if (!email || !username) {
    return res.status(400).json({ error: "Email va foydalanuvchi nomi talab qilinadi" });
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanUsername = String(username).trim();

  if (cleanUsername.length < 2) {
    return res.status(400).json({ error: "Foydalanuvchi nomi kamida 2 ta belgidan iborat bo'lishi kerak" });
  }

  // Check if username is already taken by a different email
  const nameTaken = Object.values(db.users).some(
    u => u.username.toLowerCase() === cleanUsername.toLowerCase() && u.email !== cleanEmail
  );
  if (nameTaken) {
    return res.status(400).json({ error: "Bu foydalanuvchi nomi allaqachon band. Boshqa nom tanlang." });
  }

  const token = 'tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  const userId = db.users[cleanEmail]?.id || 'usr_' + Math.random().toString(36).substring(2, 9);

  const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#14b8a6', '#f43f5e'];
  const userColor = color || colors[Math.floor(Math.random() * colors.length)];
  const userAvatar = avatar || '👤';

  const userRecord: UserRecord = {
    id: userId,
    email: cleanEmail,
    username: cleanUsername,
    avatar: userAvatar,
    color: userColor,
    token,
    joinedAt: db.users[cleanEmail]?.joinedAt || Date.now(),
  };

  const isFirstJoin = !db.users[cleanEmail];
  db.users[cleanEmail] = userRecord;
  saveDB();

  // If first time joining, broadcast a welcome announcement in chat
  if (isFirstJoin) {
    const welcomeMsg: ChatMessage = {
      id: 'sys_' + Date.now(),
      userId: 'system',
      username: 'Tizim',
      userAvatar: '🌟',
      userColor: '#8b5cf6',
      text: `✨ ${cleanUsername} guruhga qo'shildi! Xush kelibsiz!`,
      timestamp: Date.now(),
      type: 'system',
    };
    db.messages.push(welcomeMsg);
    saveDB();
    broadcast({
      type: 'chat_message',
      message: welcomeMsg,
    });
  }

  res.json({
    success: true,
    user: userRecord,
  });
});

// 4. Validate session
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || (req.query.token as string);

  if (!token) {
    return res.status(401).json({ error: 'Token mavjud emas' });
  }

  const user = Object.values(db.users).find(u => u.token === token);
  if (!user) {
    return res.status(401).json({ error: 'Foydalanuvchi topilmadi' });
  }

  res.json({ success: true, user });
});

// 5. Chat state endpoint
app.get('/api/chat/state', (req, res) => {
  res.json({
    messages: db.messages.slice(-200),
    onlineUsers: getOnlineUsersList(),
    onlineCount: getOnlineUsersList().length,
    chatInfo: {
      name: 'Global Chat Guruhi',
      description: 'Barcha a\'zolar uchun yagona umumiy guruh',
      totalMessages: db.messages.length,
      totalMembers: Object.keys(db.users).length,
    }
  });
});

// 6. REST fallback to send message
app.post('/api/chat/messages', (req, res) => {
  const { userId, username, userAvatar, userColor, text, imageUrl, audioUrl, audioDuration, replyTo } = req.body;

  if (!text && !imageUrl && !audioUrl) {
    return res.status(400).json({ error: "Xabar bo'sh bo'lishi mumkin emas" });
  }

  const newMsg: ChatMessage = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    userId: userId || 'anonymous',
    username: username || 'Mehmon',
    userAvatar: userAvatar || '👤',
    userColor: userColor || '#6366f1',
    text: text ? String(text).trim() : undefined,
    imageUrl,
    audioUrl,
    audioDuration,
    timestamp: Date.now(),
    type: 'user',
    replyTo,
    reactions: {},
  };

  db.messages.push(newMsg);
  if (db.messages.length > 500) {
    db.messages = db.messages.slice(-500);
  }
  saveDB();

  broadcast({
    type: 'chat_message',
    message: newMsg,
  });

  res.json({ success: true, message: newMsg });
});

// 7. Clear chat (admin utility or reset)
app.post('/api/chat/clear', (req, res) => {
  db.messages = [...INITIAL_MESSAGES];
  saveDB();
  broadcast({
    type: 'init',
    messages: db.messages,
    onlineUsers: getOnlineUsersList(),
    onlineCount: getOnlineUsersList().length,
  });
  res.json({ success: true });
});

// Vite middleware & Static fallback
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Global Chat Server running on http://0.0.0.0:${PORT}`);
  });
}

start();

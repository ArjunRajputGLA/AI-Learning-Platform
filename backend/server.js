const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PATCH", "DELETE"],
  credentials: true
}));
app.use(express.json());

// Serve static files from public/uploads
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Multer configuration for file uploads
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png'
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter
});

// MongoDB connection with retry
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/learning_platform';
let db;

async function connectToMongoDB(retries = 5, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempting MongoDB connection (${i + 1}/${retries})`);
      const client = await MongoClient.connect(MONGODB_URI, {
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
      });
      db = client.db('learning_platform');
      console.log('MongoDB connected successfully');

      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);

      if (!collectionNames.includes('Users')) {
        await db.createCollection('Users');
      }
      if (!collectionNames.includes('Conversations')) {
        await db.createCollection('Conversations');
      }
      if (!collectionNames.includes('ChatMessages')) {
        await db.createCollection('ChatMessages');
        await db.collection('ChatMessages').createIndex(
          { conversationId: 1, sender: 1, content: 1, timestamp: 1 },
          { unique: true }
        );
      }
      return;
    } catch (error) {
      console.error(`MongoDB connection attempt ${i + 1}/${retries} failed:`, error.message);
      if (i === retries - 1) throw error;
      const retryDelay = delay * Math.pow(2, i);
      console.log(`Retrying MongoDB connection in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

// Socket.IO connection handling
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('authenticate', (userData) => {
    if (!userData?.email) {
      socket.emit('error', { message: 'Authentication failed: No email provided' });
      return;
    }
    connectedUsers.set(socket.id, userData);
    socket.join(userData.email);
    console.log('User authenticated:', userData.email);

    io.emit('onlineUsers', Array.from(connectedUsers.values()).map(user => user.email));
  });

  socket.on('sendMessage', async (messageData) => {
    try {
      const { conversationId, content, sender, contentType, attachments, tempId } = messageData;
      console.log('Received sendMessage:', { conversationId, content, sender, contentType, attachments, tempId });

      if (!conversationId || !sender || (!content && contentType !== 'file' && contentType !== 'image')) {
        socket.emit('error', { message: 'Invalid message data' });
        return;
      }

      if (!db) {
        socket.emit('error', { message: 'Server error: Database not initialized' });
        return;
      }

      const conversation = await db.collection('Conversations').findOne({ _id: new ObjectId(conversationId) });
      if (!conversation) {
        socket.emit('error', { message: 'Conversation not found' });
        return;
      }

      if (!conversation.participants.includes(sender)) {
        socket.emit('error', { message: 'Unauthorized: Sender not in conversation' });
        return;
      }

      const message = {
        conversationId: new ObjectId(conversationId),
        sender,
        receiver: null,
        content: content || '',
        contentType: contentType || 'text',
        attachments: attachments || [],
        timestamp: new Date(),
        read: false,
        reactions: [],
      };

      try {
        const result = await db.collection('ChatMessages').insertOne(message);
        message._id = result.insertedId;
        console.log('Message saved:', message._id);
      } catch (error) {
        if (error.code === 11000) {
          console.log('Duplicate message detected, fetching existing message');
          const existingMessage = await db.collection('ChatMessages').findOne({
            conversationId: new ObjectId(conversationId),
            sender,
            content,
            timestamp: message.timestamp,
          });
          if (existingMessage) {
            io.to(conversationId).emit('newMessage', { ...existingMessage, tempId });
            return;
          }
        }
        throw error;
      }

      await db.collection('Conversations').updateOne(
        { _id: new ObjectId(conversationId) },
        {
          $set: {
            lastMessage: {
              content: content || (attachments && attachments.length > 0 ? `Uploaded ${attachments[0].name}` : ''),
              sender,
              timestamp: new Date(),
            },
          },
        }
      );

      io.to(conversationId).emit('newMessage', { ...message, tempId });
    } catch (error) {
      console.error('Error handling message:', error.message);
      socket.emit('error', { message: 'Failed to send message', details: error.message });
    }
  });

  socket.on('editMessage', async (message) => {
    try {
      console.log('Received editMessage:', message);
      io.to(message.conversationId).emit('editMessage', message);
    } catch (error) {
      console.error('Error broadcasting editMessage:', error.message);
      socket.emit('error', { message: 'Failed to broadcast edited message', details: error.message });
    }
  });

  socket.on('deleteMessage', async ({ messageId, conversationId }) => {
    try {
      console.log('Received deleteMessage:', { messageId, conversationId });
      io.to(conversationId).emit('deleteMessage', { messageId, conversationId });
    } catch (error) {
      console.error('Error broadcasting deleteMessage:', error.message);
      socket.emit('error', { message: 'Failed to broadcast deleted message', details: error.message });
    }
  });

  socket.on('readMessage', async ({ messageId, conversationId }) => {
    try {
      console.log('Received readMessage:', { messageId, conversationId });
      io.to(conversationId).emit('readMessage', { messageId, conversationId });
    } catch (error) {
      console.error('Error broadcasting readMessage:', error.message);
      socket.emit('error', { message: 'Failed to broadcast read message', details: error.message });
    }
  });

  socket.on('reactMessage', async ({ messageId, conversationId, reaction }) => {
    try {
      console.log('Received reactMessage:', { messageId, conversationId, reaction });
      io.to(conversationId).emit('reactMessage', { messageId, conversationId, reaction });
    } catch (error) {
      console.error('Error broadcasting reactMessage:', error.message);
      socket.emit('error', { message: 'Failed to broadcast reaction', details: error.message });
    }
  });

  socket.on('pinMessage', async ({ messageId, conversationId }) => {
    try {
      console.log('Received pinMessage:', { messageId, conversationId });
      const conversation = await db.collection('Conversations').findOne({ _id: new ObjectId(conversationId) });
      if (!conversation) {
        socket.emit('error', { message: 'Conversation not found' });
        return;
      }
      await db.collection('Conversations').updateOne(
        { _id: new ObjectId(conversationId) },
        { $addToSet: { pinnedMessages: new ObjectId(messageId) } }
      );
      io.to(conversationId).emit('pinMessage', { messageId, conversationId });
    } catch (error) {
      console.error('Error broadcasting pinMessage:', error.message);
      socket.emit('error', { message: 'Failed to pin message', details: error.message });
    }
  });

  socket.on('unpinMessage', async ({ messageId, conversationId }) => {
    try {
      console.log('Received unpinMessage:', { messageId, conversationId });
      const conversation = await db.collection('Conversations').findOne({ _id: new ObjectId(conversationId) });
      if (!conversation) {
        socket.emit('error', { message: 'Conversation not found' });
        return;
      }
      await db.collection('Conversations').updateOne(
        { _id: new ObjectId(conversationId) },
        { $pull: { pinnedMessages: new ObjectId(messageId) } }
      );
      io.to(conversationId).emit('unpinMessage', { messageId, conversationId });
    } catch (error) {
      console.error('Error broadcasting unpinMessage:', error.message);
      socket.emit('error', { message: 'Failed to unpin message', details: error.message });
    }
  });

  socket.on('typing', (data) => {
    socket.to(data.conversationId).emit('typing', {
      userId: data.userId,
      isTyping: data.isTyping
    });
  });

  socket.on('joinConversation', (conversationId) => {
    console.log(`User joined conversation: ${conversationId}`);
    socket.join(conversationId);
  });

  socket.on('leaveConversation', (conversationId) => {
    console.log(`User left conversation: ${conversationId}`);
    socket.leave(conversationId);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    connectedUsers.delete(socket.id);
    io.emit('onlineUsers', Array.from(connectedUsers.values()).map(user => user.email));
  });
});

// REST API endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Chat server is running',
    timestamp: new Date().toISOString(),
    databaseConnected: !!db,
    connectedUsers: connectedUsers.size,
    serverUptime: process.uptime()
  });
});

app.post('/api/chat/upload', upload.single('file'), async (req, res) => {
  try {
    const userEmail = req.headers.authorization?.split('Bearer ')[1];
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized: No user email provided' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      fileUrl,
      filename: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype
    });
  } catch (error) {
    console.error('Error uploading file:', error.message);
    res.status(500).json({ error: 'Failed to upload file', details: error.message });
  }
});

app.get('/api/chat/users', async (req, res) => {
  try {
    const userEmail = req.headers.authorization?.split('Bearer ')[1];
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized: No user email provided' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Server error: Database not initialized' });
    }

    const users = await db.collection('Users')
      .find({ email: { $ne: userEmail } })
      .toArray();

    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

app.get('/api/chat/conversations', async (req, res) => {
  try {
    const userEmail = req.headers.authorization?.split('Bearer ')[1];
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized: No user email provided' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Server error: Database not initialized' });
    }

    const conversations = await db.collection('Conversations')
      .find({ participants: userEmail })
      .sort({ 'lastMessage.timestamp': -1 })
      .toArray();

    res.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error.message);
    res.status(500).json({ error: 'Failed to fetch conversations', details: error.message });
  }
});

app.get('/api/chat/messages/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userEmail = req.headers.authorization?.split('Bearer ')[1];
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized: No user email provided' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Server error: Database not initialized' });
    }

    const conversation = await db.collection('Conversations').findOne({
      _id: new ObjectId(conversationId),
      participants: userEmail
    });
    if (!conversation) {
      return res.status(403).json({ error: 'Unauthorized: User not part of this conversation' });
    }

    const messages = await db.collection('ChatMessages')
      .find({ conversationId: new ObjectId(conversationId) })
      .sort({ timestamp: 1 })
      .toArray();

    res.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error.message);
    res.status(500).json({ error: 'Failed to fetch messages', details: error.message });
  }
});

app.post('/api/chat/conversations', async (req, res) => {
  try {
    const { participants, type, groupName } = req.body;
    const userEmail = req.headers.authorization?.split('Bearer ')[1];
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized: No user email provided' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Server error: Database not initialized' });
    }

    if (!participants || !Array.isArray(participants) || participants.length < 2) {
      return res.status(400).json({ error: 'Invalid participants: At least two participants required' });
    }

    if (!participants.includes(userEmail)) {
      participants.push(userEmail);
    }

    if (type === 'direct') {
      const existingConversation = await db.collection('Conversations').findOne({
        participants: { $all: participants, $size: participants.length },
        isGroupChat: false
      });
      if (existingConversation) {
        return res.json({ conversation: existingConversation });
      }
    }

    const conversation = {
      participants,
      isGroupChat: type === 'group',
      groupName: groupName || null,
      lastMessage: null,
      pinnedMessages: [],
      createdAt: new Date()
    };

    const result = await db.collection('Conversations').insertOne(conversation);
    conversation._id = result.insertedId;

    res.json({ conversation });
  } catch (error) {
    console.error('Error creating conversation:', error.message);
    res.status(500).json({ error: 'Failed to create conversation', details: error.message });
  }
});

app.post('/api/chat/messages', async (req, res) => {
  try {
    const { conversationId, content, sender, contentType, attachments } = req.body;
    const userEmail = req.headers.authorization?.split('Bearer ')[1];
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized: No user email provided' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Server error: Database not initialized' });
    }

    if (!conversationId || !sender || (!content && contentType !== 'file' && contentType !== 'image')) {
      return res.status(400).json({ error: 'Invalid message data' });
    }

    const conversation = await db.collection('Conversations').findOne({
      _id: new ObjectId(conversationId),
      participants: userEmail
    });
    if (!conversation) {
      return res.status(403).json({ error: 'Unauthorized: User not part of this conversation' });
    }

    const message = {
      conversationId: new ObjectId(conversationId),
      sender: userEmail,
      receiver: null,
      content: content || '',
      contentType: contentType || 'text',
      attachments: attachments || [],
      timestamp: new Date(),
      read: false,
      reactions: []
    };

    const result = await db.collection('ChatMessages').insertOne(message);
    message._id = result.insertedId;

    await db.collection('Conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      {
        $set: {
          lastMessage: {
            content: content || (attachments && attachments.length > 0 ? `Uploaded ${attachments[0].name}` : ''),
            sender: userEmail,
            timestamp: new Date()
          }
        }
      }
    );

    res.json({ message });
  } catch (error) {
    console.error('Error sending message:', error.message);
    res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
});

app.patch('/api/chat/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userEmail = req.headers.authorization?.split('Bearer ')[1];
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized: No user email provided' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Server error: Database not initialized' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }

    const message = await db.collection('ChatMessages').findOne({ _id: new ObjectId(id) });
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.sender !== userEmail) {
      return res.status(403).json({ error: 'Unauthorized: Only the sender can edit this message' });
    }

    const now = new Date();
    const messageTime = new Date(message.timestamp);
    const diffMinutes = (now.getTime() - messageTime.getTime()) / (1000 * 60);
    if (diffMinutes > 15) {
      return res.status(403).json({ error: 'Cannot edit message after 15 minutes' });
    }

    if (message.contentType !== 'text') {
      return res.status(400).json({ error: 'Cannot edit file or image messages' });
    }

    const updatedMessage = {
      ...message,
      content,
      timestamp: new Date()
    };

    await db.collection('ChatMessages').updateOne(
      { _id: new ObjectId(id) },
      { $set: { content, timestamp: new Date() } }
    );

    await db.collection('Conversations').updateOne(
      { _id: new ObjectId(message.conversationId) },
      {
        $set: {
          lastMessage: {
            content,
            sender: userEmail,
            timestamp: new Date()
          }
        }
      }
    );

    res.json({ message: updatedMessage });
  } catch (error) {
    console.error('Error editing message:', error.message);
    res.status(500).json({ error: 'Failed to edit message', details: error.message });
  }
});

app.patch('/api/chat/messages/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.headers.authorization?.split('Bearer ')[1];
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized: No user email provided' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Server error: Database not initialized' });
    }

    const message = await db.collection('ChatMessages').findOne({ _id: new ObjectId(id) });
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const conversation = await db.collection('Conversations').findOne({
      _id: new ObjectId(message.conversationId),
      participants: userEmail
    });
    if (!conversation) {
      return res.status(403).json({ error: 'Unauthorized: User not part of this conversation' });
    }

    await db.collection('ChatMessages').updateOne(
      { _id: new ObjectId(id) },
      { $set: { read: true } }
    );

    res.json({ message: 'Message marked as read' });
  } catch (error) {
    console.error('Error marking message as read:', error.message);
    res.status(500).json({ error: 'Failed to mark message as read', details: error.message });
  }
});

app.patch('/api/chat/messages/:id/pin', async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.headers.authorization?.split('Bearer ')[1];
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized: No user email provided' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Server error: Database not initialized' });
    }

    const message = await db.collection('ChatMessages').findOne({ _id: new ObjectId(id) });
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const conversation = await db.collection('Conversations').findOne({
      _id: new ObjectId(message.conversationId),
      participants: userEmail
    });
    if (!conversation) {
      return res.status(403).json({ error: 'Unauthorized: User not part of this conversation' });
    }

    await db.collection('Conversations').updateOne(
      { _id: new ObjectId(message.conversationId) },
      { $addToSet: { pinnedMessages: new ObjectId(id) } }
    );

    res.json({ message: 'Message pinned successfully' });
  } catch (error) {
    console.error('Error pinning message:', error.message);
    res.status(500).json({ error: 'Failed to pin message', details: error.message });
  }
});

app.patch('/api/chat/messages/:id/unpin', async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.headers.authorization?.split('Bearer ')[1];
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized: No user email provided' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Server error: Database not initialized' });
    }

    const message = await db.collection('ChatMessages').findOne({ _id: new ObjectId(id) });
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const conversation = await db.collection('Conversations').findOne({
      _id: new ObjectId(message.conversationId),
      participants: userEmail
    });
    if (!conversation) {
      return res.status(403).json({ error: 'Unauthorized: User not part of this conversation' });
    }

    await db.collection('Conversations').updateOne(
      { _id: new ObjectId(message.conversationId) },
      { $pull: { pinnedMessages: new ObjectId(id) } }
    );

    res.json({ message: 'Message unpinned successfully' });
  } catch (error) {
    console.error('Error unpinning message:', error.message);
    res.status(500).json({ error: 'Failed to unpin message', details: error.message });
  }
});

app.patch('/api/chat/messages/:id/react', async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji, user } = req.body;
    const userEmail = req.headers.authorization?.split('Bearer ')[1];
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized: No user email provided' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Server error: Database not initialized' });
    }

    if (!emoji || !user) {
      return res.status(400).json({ error: 'Emoji and user are required' });
    }

    const message = await db.collection('ChatMessages').findOne({ _id: new ObjectId(id) });
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const conversation = await db.collection('Conversations').findOne({
      _id: new ObjectId(message.conversationId),
      participants: userEmail
    });
    if (!conversation) {
      return res.status(403).json({ error: 'Unauthorized: User not part of this conversation' });
    }

    const reaction = { user, emoji };
    await db.collection('ChatMessages').updateOne(
      { _id: new ObjectId(id) },
      { $push: { reactions: reaction } }
    );

    res.json({ reaction });
  } catch (error) {
    console.error('Error adding reaction:', error.message);
    res.status(500).json({ error: 'Failed to add reaction', details: error.message });
  }
});

app.delete('/api/chat/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.headers.authorization?.split('Bearer ')[1];
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized: No user email provided' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Server error: Database not initialized' });
    }

    const message = await db.collection('ChatMessages').findOne({ _id: new ObjectId(id) });
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.sender !== userEmail) {
      return res.status(403).json({ error: 'Unauthorized: Only the sender can delete this message' });
    }

    await db.collection('ChatMessages').deleteOne({ _id: new ObjectId(id) });

    const lastMessage = await db.collection('ChatMessages')
      .find({ conversationId: message.conversationId })
      .sort({ timestamp: -1 })
      .limit(1)
      .toArray();

    await db.collection('Conversations').updateOne(
      { _id: new ObjectId(message.conversationId) },
      {
        $set: {
          lastMessage: lastMessage.length > 0 ? {
            content: lastMessage[0].content || (lastMessage[0].attachments && lastMessage[0].attachments.length > 0 ? `Uploaded ${lastMessage[0].attachments[0].name}` : ''),
            sender: lastMessage[0].sender,
            timestamp: lastMessage[0].timestamp
          } : null
        },
        $pull: { pinnedMessages: new ObjectId(id) }
      }
    );

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error.message);
    res.status(500).json({ error: 'Failed to delete message', details: error.message });
  }
});

// Start server and connect to MongoDB
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await connectToMongoDB();
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer(); 
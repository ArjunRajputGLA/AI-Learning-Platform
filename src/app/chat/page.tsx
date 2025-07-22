"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { Send, User, Plus, Search, Settings, Phone, Video, AlertCircle, Bell, ChevronDown, Sparkles, MessageCircle, Users, Zap, File, Paperclip, Pencil, Trash2, Smile } from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface Message {
  _id: string;
  conversationId: string;
  sender: string;
  receiver: string | null;
  content: string;
  contentType: 'text' | 'image' | 'file';
  attachments: { name: string; url: string; size: number; type: string }[];
  timestamp: Date;
  read: boolean;
  tempId?: string;
  reactions: { user: string; emoji: string }[];
}

interface Conversation {
  _id: string;
  participants: string[];
  isGroupChat: boolean;
  groupName: string | null;
  lastMessage: {
    content: string;
    sender: string;
    timestamp: Date;
  } | null;
  createdAt: Date;
}

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionMessageId, setReactionMessageId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  // Retry logic with exponential backoff
  const fetchWithRetry = async (url: string, options: RequestInit, retries = 5, initialDelay = 1000): Promise<Response> => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return response;
        console.error(`Fetch failed: ${url}, attempt ${i + 1}/${retries}, status: ${response.status}`);
      } catch (error) {
        console.error(`Fetch error: ${url}, attempt ${i + 1}/${retries}`, error);
        if (i === retries - 1) throw new Error(`Failed to fetch ${url}: ${(error as Error).message}`);
      }
      const delay = initialDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw new Error(`Max retries reached for ${url}`);
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/sign-in');
      return;
    }
  }, [session, status, router]);

  // Initialize socket connection
  useEffect(() => {
    if (!session?.user?.email) return;

    const socketConnection = io(backendUrl, {
      auth: { email: session.user.email },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    socketConnection.on('connect', () => {
      setError(null);
    });

    socketConnection.on('newMessage', (message: Message) => {
      if (message.conversationId === activeConversation) {
        setMessages(prev => {
          const exists = prev.some(
            msg => msg._id === message._id || (message.tempId && msg.tempId === message.tempId)
          );
          if (exists) {
            console.log(`Ignoring duplicate message: _id=${message._id}, tempId=${message.tempId}`);
            return prev.map(msg =>
              (msg.tempId && message.tempId && msg.tempId === message.tempId) ||
              msg._id === message._id
                ? { ...message, tempId: undefined }
                : msg
            );
          }
          console.log('Adding new message:', {
            _id: message._id,
            tempId: message.tempId,
            content: message.content,
          });
          return [...prev, { ...message, tempId: undefined }];
        });
      }
    });

    socketConnection.on('editMessage', (updatedMessage: Message) => {
      if (updatedMessage.conversationId === activeConversation) {
        setMessages(prev =>
          prev.map(msg =>
            msg._id === updatedMessage._id ? { ...msg, content: updatedMessage.content, timestamp: updatedMessage.timestamp } : msg
          )
        );
      }
    });

    socketConnection.on('deleteMessage', ({ messageId, conversationId }) => {
      if (conversationId === activeConversation) {
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
      }
    });

    socketConnection.on('readMessage', ({ messageId, conversationId }) => {
      if (conversationId === activeConversation) {
        setMessages(prev =>
          prev.map(msg =>
            msg._id === messageId ? { ...msg, read: true } : msg
          )
        );
      }
    });

    socketConnection.on('reactMessage', ({ messageId, conversationId, reaction }) => {
      if (conversationId === activeConversation) {
        setMessages(prev =>
          prev.map(msg =>
            msg._id === messageId
              ? { ...msg, reactions: [...(msg.reactions || []), reaction] }
              : msg
          )
        );
      }
    });

    socketConnection.on('onlineUsers', (users: string[]) => {
      setOnlineUsers(users);
    });

    socketConnection.on('typing', ({ userId, isTyping }) => {
      setIsTyping(isTyping);
    });

    socketConnection.on('error', ({ message }) => {
      setError(`Socket error: ${message}`);
    });

    socketConnection.on('connect_error', (error) => {
      setError(error.message.includes('xhr poll error')
        ? 'Failed to connect to backend server. Ensure the server is running at ' + backendUrl
        : `Failed to connect to chat server: ${error.message}. Retrying...`);
    });

    socketConnection.on('reconnect', () => {
      setError(null);
    });

    socketConnection.on('reconnect_failed', () => {
      setError('Failed to reconnect to chat server. Please refresh the page.');
    });

    setSocket(socketConnection);

    return () => {
      socketConnection.disconnect();
    };
  }, [session?.user?.email, activeConversation, backendUrl]);

  // Load conversations
  const loadConversations = async () => {
    try {
      const response = await fetchWithRetry(`${backendUrl}/api/chat/conversations`, {
        headers: { 'Authorization': `Bearer ${session?.user?.email}` }
      });
      const data = await response.json();
      setConversations(data.conversations);
      if (data.conversations.length > 0) {
        setActiveConversation(data.conversations[0]._id);
      }
    } catch (error) {
      setError(`Failed to load conversations: ${(error as Error).message}.`);
    } finally {
      setLoading(false);
    }
  };

  // Load users
  const fetchUsers = async () => {
    try {
      const response = await fetchWithRetry(`${backendUrl}/api/chat/users`, {
        headers: { 'Authorization': `Bearer ${session?.user?.email}` }
      });
      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      setError(`Failed to fetch users: ${(error as Error).message}.`);
    }
  };

  // Load conversations and users
  useEffect(() => {
    if (!session?.user?.email) return;
    loadConversations();
    fetchUsers();
  }, [session?.user?.email, backendUrl]);

  // Load messages for active conversation and mark as read
  useEffect(() => {
    if (!activeConversation || !socket) return;

    const loadMessages = async () => {
      try {
        const response = await fetchWithRetry(`${backendUrl}/api/chat/messages/${activeConversation}`, {
          headers: { 'Authorization': `Bearer ${session?.user?.email}` }
        });
        const data = await response.json();
        const uniqueMessages = Array.from(
          new Map(data.messages.map((msg: Message) => [msg._id, msg])).values()
        );
        console.log('Loaded messages:', uniqueMessages.map(msg => ({ _id: msg._id, content: msg.content })));
        setMessages(uniqueMessages);

        const unreadMessages = uniqueMessages.filter(
          (msg: Message) => !msg.read && msg.sender !== session?.user?.email
        );
        for (const msg of unreadMessages) {
          socket.emit('readMessage', { messageId: msg._id, conversationId: activeConversation });
          await fetchWithRetry(`${backendUrl}/api/chat/messages/${msg._id}/read`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${session?.user?.email}` }
          });
        }
      } catch (error) {
        setError(`Failed to load messages: ${(error as Error).message}.`);
      }
    };

    loadMessages();
    socket.emit('joinConversation', activeConversation);

    return () => {
      socket.emit('leaveConversation', activeConversation);
    };
  }, [activeConversation, socket, backendUrl, session?.user?.email]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle file selection
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/jpeg',
      'image/png'
    ];

    if (file.size > maxSize) {
      setError('File size exceeds 10MB limit');
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      setError('Unsupported file type. Allowed: PDF, DOCX, PPTX, TXT, JPG, PNG');
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Emoji picker handler
  const handleEmojiSelect = (emoji: any) => {
    setNewMessage(prev => prev + emoji.native);
    setShowEmojiPicker(false);
  };

  // Handle clicks outside emoji picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Edit message
  const startEditing = (message: Message) => {
    setEditingMessageId(message._id);
    setEditedContent(message.content);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditedContent('');
  };

  const saveEditedMessage = async (messageId: string) => {
    if (!socket || !editedContent.trim()) {
      setError('Cannot save empty message');
      return;
    }

    try {
      const response = await fetchWithRetry(`${backendUrl}/api/chat/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.user?.email}`
        },
        body: JSON.stringify({ content: editedContent })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to edit message');
      }

      const updatedMessage = await response.json();
      socket.emit('editMessage', updatedMessage.message);
      setMessages(prev =>
        prev.map(msg =>
          msg._id === messageId ? { ...msg, content: updatedMessage.message.content, timestamp: updatedMessage.message.timestamp } : msg
        )
      );
      setEditingMessageId(null);
      setEditedContent('');
    } catch (error) {
      setError(`Failed to edit message: ${(error as Error).message}`);
    }
  };

  // Delete message
  const deleteMessage = async (messageId: string, conversationId: string) => {
    if (!socket) {
      setError('Socket not connected');
      return;
    }

    try {
      const response = await fetchWithRetry(`${backendUrl}/api/chat/messages/${messageId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.user?.email}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete message');
      }

      socket.emit('deleteMessage', { messageId, conversationId });
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
    } catch (error) {
      setError(`Failed to delete message: ${(error as Error).message}`);
    }
  };

  // Add reaction to message
  const addReaction = async (messageId: string, emoji: string) => {
    if (!socket) {
      setError('Socket not connected');
      return;
    }

    try {
      const response = await fetchWithRetry(`${backendUrl}/api/chat/messages/${messageId}/react`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.user?.email}`
        },
        body: JSON.stringify({ emoji, user: session?.user?.email })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add reaction');
      }

      const { reaction } = await response.json();
      socket.emit('reactMessage', { messageId, conversationId: activeConversation, reaction });
      setReactionMessageId(null);
    } catch (error) {
      setError(`Failed to add reaction: ${(error as Error).message}`);
    }
  };

  const startUserConversation = async (userEmail: string) => {
    try {
      const existingConversation = conversations.find(conv =>
        conv.participants.includes(session?.user?.email!) &&
        conv.participants.includes(userEmail) &&
        !conv.isGroupChat
      );

      if (existingConversation) {
        setActiveConversation(existingConversation._id);
        return;
      }

      const response = await fetchWithRetry(`${backendUrl}/api/chat/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.user?.email}`
        },
        body: JSON.stringify({
          type: 'direct',
          participants: [session?.user?.email, userEmail]
        })
      });

      const data = await response.json();
      setConversations(prev => {
        if (!prev.some(conv => conv._id === data.conversation._id)) {
          return [data.conversation, ...prev];
        }
        return prev;
      });
      setActiveConversation(data.conversation._id);
    } catch (error) {
      setError(`Failed to start conversation: ${(error as Error).message}.`);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !socket || (!newMessage.trim() && !selectedFile)) {
      setError('Cannot send empty message or no conversation selected');
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    let messageData: Message = {
      _id: tempId,
      conversationId: activeConversation,
      content: newMessage,
      sender: session?.user?.email!,
      contentType: selectedFile ? (['image/jpeg', 'image/png'].includes(selectedFile.type) ? 'image' : 'file') : 'text',
      attachments: [],
      timestamp: new Date(),
      read: false,
      tempId,
      reactions: [],
    };

    setMessages(prev => {
      console.log('Adding temporary message:', { tempId, content: messageData.content });
      return [...prev, messageData];
    });

    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('conversationId', activeConversation);
        formData.append('sender', session?.user?.email!);

        const uploadResponse = await fetchWithRetry(`${backendUrl}/api/chat/upload`, {
          method: 'POST',
          body: formData,
          headers: { Authorization: `Bearer ${session?.user?.email}` },
        });

        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) {
          throw new Error(uploadData.error || 'Failed to upload file');
        }

        messageData.attachments = [
          {
            name: selectedFile.name,
            url: uploadData.fileUrl,
            size: selectedFile.size,
            type: selectedFile.type,
          },
        ];
        messageData.content = newMessage || `Uploaded ${selectedFile.name}`;
      }

      socket.emit('sendMessage', messageData);

      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      setError(`Failed to send message: ${(error as Error).message}`);
      setMessages(prev => prev.filter(msg => msg.tempId !== tempId));
    }
  };

  const reconnectSocket = () => {
    if (socket) socket.connect();
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const messageDate = new Date(date);
    if (messageDate.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (messageDate.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isEditable = (message: Message) => {
    const now = new Date();
    const messageTime = new Date(message.timestamp);
    const diffMinutes = (now.getTime() - messageTime.getTime()) / (1000 * 60);
    return message.sender === session?.user?.email && diffMinutes <= 15;
  };

  const getConversationName = (conversation: Conversation) => {
    if (conversation.isGroupChat) return conversation.groupName || 'Group Chat';
    const otherParticipant = conversation.participants.find(email => email !== session?.user?.email);
    const user = users.find(u => u.email === otherParticipant);
    return user ? `${user.firstName} ${user.lastName}` : otherParticipant || 'Unknown User';
  };

  const getMessageDateSeparator = (current: Message, previous?: Message) => {
    if (!previous) return formatDate(current.timestamp);
    const currentDate = new Date(current.timestamp).toDateString();
    const previousDate = new Date(previous.timestamp).toDateString();
    return currentDate !== previousDate ? formatDate(current.timestamp) : null;
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const name = getConversationName(conv).toLowerCase();
    const otherParticipant = conv.participants.find(email => email !== session?.user?.email);
    return name.includes(query) || otherParticipant?.toLowerCase().includes(query);
  });

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.firstName.toLowerCase().includes(query) ||
      user.lastName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });

  const filteredMessages = messages.filter(message => {
    if (!messageSearchQuery) return true;
    return message.content.toLowerCase().includes(messageSearchQuery.toLowerCase());
  });

  // Debug duplicate messages
  useEffect(() => {
    const messageIds = filteredMessages.map(msg => msg._id);
    const duplicates = messageIds.filter((id, index) => messageIds.indexOf(id) !== index);
    if (duplicates.length > 0) {
      console.warn('Duplicate message IDs found in filteredMessages:', duplicates);
    }
    console.log('Current messages:', messages.map(msg => ({ _id: msg._id, tempId: msg.tempId, content: msg.content })));
  }, [messages, filteredMessages]);

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'application/pdf':
        return '/icons/pdf-icon.png';
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return '/icons/doc-icon.png';
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        return '/icons/pptx-icon.png';
      case 'text/plain':
        return '/icons/txt-icon.png';
      default:
        return '/icons/file-icon.png';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#1F2A44]">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-[#25D366] animate-pulse"></div>
          <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-transparent border-t-[#128C7E] animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex h-screen bg-[#1F2A44] font-sans">
      {/* Sidebar */}
      <div className="w-80 bg-[#111B21] border-r border-[#2A3942] flex flex-col">
        <div className="p-4 bg-[#202C33] border-b border-[#2A3942]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#128C7E] flex items-center justify-center relative">
                {session.user.profilePicture ? (
                  <img src={session.user.profilePicture} alt="Profile" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-white" />
                )}
                {onlineUsers.includes(session.user.email) && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#25D366] rounded-full border-2 border-[#202C33]" />
                )}
              </div>
              <h1 className="text-lg font-semibold text-white">Chats</h1>
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-2 rounded-full bg-[#2A3942] text-gray-300 hover:bg-[#3B4A54] transition">
                <Bell className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setError(null);
                  fetchUsers();
                  loadConversations();
                }}
                className="p-2 rounded-full bg-[#2A3942] text-gray-300 hover:bg-[#3B4A54] transition"
                title="Refresh"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-10 pr-4 py-2 bg-[#2A3942] rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#25D366] outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 && (
            <div className="text-center py-8">
              <MessageCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No chats found</p>
            </div>
          )}
          <div className="divide-y divide-[#2A3942]">
            {filteredConversations.map((conversation) => {
              const otherParticipant = conversation.participants.find(email => email !== session?.user?.email);
              const user = users.find(u => u.email === otherParticipant);
              return (
                <div
                  key={conversation._id}
                  onClick={() => setActiveConversation(conversation._id)}
                  className={`flex items-center p-4 cursor-pointer hover:bg-[#2A3942] transition ${
                    activeConversation === conversation._id ? 'bg-[#25D366]/10' : ''
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-[#128C7E] flex items-center justify-center relative">
                    {user?.profilePicture ? (
                      <img src={user.profilePicture} alt={getConversationName(conversation)} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-white" />
                    )}
                    {onlineUsers.includes(otherParticipant || '') && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#25D366] rounded-full border-2 border-[#111B21]" />
                    )}
                  </div>
                  <div className="flex-1 ml-3 min-w-0">
                    <div className="flex justify-between">
                      <p className="font-semibold text-white truncate">{getConversationName(conversation)}</p>
                      <p className="text-xs text-gray-400">{formatTime(conversation.lastMessage?.timestamp || conversation.createdAt)}</p>
                    </div>
                    <p className="text-sm text-gray-400 truncate">{conversation.lastMessage?.content || 'Start a conversation...'}</p>
                  </div>
                  {conversation.lastMessage && <div className="w-3 h-3 bg-[#25D366] rounded-full ml-2" />}
                </div>
              );
            })}
          </div>
          <div className="p-4 border-t border-[#2A3942]">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Available Users</h3>
            {filteredUsers.length === 0 && (
              <div className="text-center py-4">
                <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No users found</p>
              </div>
            )}
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user._id}
                  onClick={() => startUserConversation(user.email)}
                  className="flex items-center p-4 cursor-pointer hover:bg-[#2A3942] rounded-lg transition"
                >
                  <div className="w-12 h-12 rounded-full bg-[#128C7E] flex items-center justify-center relative">
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt={`${user.firstName} ${user.lastName}`} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-white" />
                    )}
                    {onlineUsers.includes(user.email) && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#25D366] rounded-full border-2 border-[#111B21]" />
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold text-white truncate">{user.firstName} {user.lastName}</p>
                    <p className="text-sm text-gray-400 truncate">{user.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#0B141A] relative">
        {error && (
          <div className="absolute top-4 left-4 right-4 p-4 bg-[#2A3942] rounded-lg text-white flex items-center gap-3 z-10">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-sm flex-1">{error}</p>
            <button
              onClick={() => {
                setError(null);
                fetchUsers();
                loadConversations();
                reconnectSocket();
              }}
              className="px-3 py-1 bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] transition"
            >
              Retry
            </button>
          </div>
        )}

        {activeConversation ? (
          <>
            <div className="p-4 bg-[#202C33] border-b border-[#2A3942] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-[#128C7E] flex items-center justify-center relative">
                  {(() => {
                    const conversation = conversations.find(conv => conv._id === activeConversation);
                    const otherParticipant = conversation?.participants.find(email => email !== session?.user?.email);
                    const user = users.find(u => u.email === otherParticipant);
                    return user?.profilePicture ? (
                      <img src={user.profilePicture} alt={getConversationName(conversation!)} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-white" />
                    );
                  })()}
                  {(() => {
                    const otherParticipant = conversations.find(conv => conv._id === activeConversation)?.participants.find(email => email !== session?.user?.email);
                    return onlineUsers.includes(otherParticipant || '') && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#25D366] rounded-full border-2 border-[#202C33]" />
                    );
                  })()}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {getConversationName(conversations.find(conv => conv._id === activeConversation)!)}
                  </h2>
                  <p className="text-xs text-gray-400">{isTyping ? 'Typing...' : onlineUsers.includes(
                    conversations.find(conv => conv._id === activeConversation)?.participants.find(email => email !== session?.user?.email) || ''
                  ) ? 'Online' : 'Offline'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={messageSearchQuery}
                    onChange={(e) => setMessageSearchQuery(e.target.value)}
                    placeholder="Search messages..."
                    className="w-40 pl-10 pr-4 py-2 bg-[#2A3942] rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#25D366] outline-none"
                  />
                </div>
                <button className="p-2 text-gray-300 hover:text-[#25D366] transition">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-300 hover:text-[#25D366] transition">
                  <Video className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-300 hover:text-[#25D366] transition">
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-[#0B141A] relative">
              <div className="space-y-4">
                {filteredMessages.length === 0 && (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <MessageCircle className="w-10 h-10 mx-auto mb-2" />
                      <p className="text-lg font-semibold">{messageSearchQuery ? 'No messages found' : 'Start chatting!'}</p>
                    </div>
                  </div>
                )}

                {filteredMessages.map((message, index) => {
                  const dateSeparator = getMessageDateSeparator(message, filteredMessages[index - 1]);
                  const key = message.tempId ? `${message._id}-${message.tempId}` : message._id;
                  return (
                    <div key={key}>
                      {dateSeparator && (
                        <div className="text-center my-4">
                          <span className="inline-block px-4 py-1 bg-[#2A3942] rounded-full text-xs text-gray-400">
                            {dateSeparator}
                          </span>
                        </div>
                      )}
                      <div
                        className={`flex ${message.sender === session?.user?.email ? 'justify-end' : 'justify-start'} mb-2 animate-in fade-in duration-300`}
                      >
                        <div
                          className={`relative max-w-xs sm:max-w-md lg:max-w-lg p-3 rounded-lg ${
                            message.sender === session?.user?.email
                              ? 'bg-[#25D366] text-white'
                              : 'bg-[#ECE5DD] text-black'
                          }`}
                        >
                          <div className="absolute top-2 right-2 flex space-x-1 opacity-0 hover:opacity-100 transition">
                            {message.sender === session?.user?.email && isEditable(message) && message.contentType !== 'file' && message.contentType !== 'image' && (
                              <button
                                onClick={() => startEditing(message)}
                                className="p-1 bg-black/20 rounded-full hover:bg-black/40"
                                title="Edit message"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {message.sender === session?.user?.email && (
                              <button
                                onClick={() => deleteMessage(message._id, message.conversationId)}
                                className="p-1 bg-black/20 rounded-full hover:bg-black/40"
                                title="Delete message"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setReactionMessageId(message._id)}
                              className="p-1 bg-black/20 rounded-full hover:bg-black/40"
                              title="React to message"
                            >
                              <Smile className="w-4 h-4" />
                            </button>
                          </div>
                          {reactionMessageId === message._id && (
                            <div
                              ref={emojiPickerRef}
                              className="absolute top-[-300px] right-0 z-10"
                            >
                              <Picker
                                data={data}
                                onEmojiSelect={(emoji: any) => addReaction(message._id, emoji.native)}
                                theme="dark"
                                previewPosition="none"
                                skinTonePosition="none"
                              />
                            </div>
                          )}
                          {editingMessageId === message._id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                                className="w-full p-2 bg-[#2A3942] rounded-lg text-white focus:ring-2 focus:ring-[#25D366] outline-none"
                                autoFocus
                              />
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={cancelEditing}
                                  className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => saveEditedMessage(message._id)}
                                  disabled={!editedContent.trim()}
                                  className="px-3 py-1 bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] disabled:bg-gray-600"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {message.contentType === 'image' && message.attachments.length > 0 ? (
                                <div className="flex flex-col space-y-2">
                                  <a
                                    href={message.attachments[0].url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block"
                                  >
                                    <img
                                      src={message.attachments[0].url}
                                      alt={message.attachments[0].name}
                                      className="max-w-full h-auto rounded-lg max-h-64 object-contain"
                                    />
                                  </a>
                                  {message.content && <p className="text-sm mt-1">{message.content}</p>}
                                </div>
                              ) : message.contentType === 'file' && message.attachments.length > 0 ? (
                                <div className="flex items-center space-x-2">
                                  <img
                                    src={getFileIcon(message.attachments[0].type)}
                                    alt="File icon"
                                    className="w-8 h-8"
                                  />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{message.attachments[0].name}</p>
                                    <p className="text-xs text-gray-500">{formatFileSize(message.attachments[0].size)}</p>
                                    <div className="flex space-x-2 mt-1">
                                      <a
                                        href={message.attachments[0].url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2 py-1 bg-[#128C7E] text-white text-xs rounded hover:bg-[#0A6E5E]"
                                      >
                                        Open
                                      </a>
                                      <a
                                        href={message.attachments[0].url}
                                        download
                                        className="px-2 py-1 bg-[#2A3942] text-white text-xs rounded hover:bg-[#3B4A54]"
                                      >
                                        Download
                                      </a>
                                    </div>
                                    {message.content && message.content !== `Uploaded ${message.attachments[0].name}` && (
                                      <p className="text-sm mt-1">{message.content}</p>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm">{message.content}</p>
                              )}
                              <div className="flex justify-between items-center mt-1">
                                <p className="text-xs text-gray-500">{formatTime(message.timestamp)}</p>
                                {message.sender === session?.user?.email && (
                                  <div className="flex space-x-1">
                                    {message.read ? (
                                      <>
                                        <span className="text-[#53BDEB] text-xs">✓✓</span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-gray-400 text-xs">✓✓</span>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                              {message.reactions && message.reactions.length > 0 && (
                                <div className="flex space-x-2 mt-1">
                                  {message.reactions.map((reaction, idx) => (
                                    <span key={`${reaction.user}-${idx}`} className="text-sm bg-[#2A3942] rounded-full px-2 py-1">
                                      {reaction.emoji}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                          <div
                            className={`absolute top-0 ${
                              message.sender === session?.user?.email ? 'right-[-6px]' : 'left-[-6px]'
                            } w-0 h-0 border-t-8 border-b-8 ${
                              message.sender === session?.user?.email
                                ? 'border-l-8 border-l-[#25D366] border-t-transparent border-b-transparent'
                                : 'border-r-8 border-r-[#ECE5DD] border-t-transparent border-b-transparent'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex justify-start mb-2">
                    <div className="p-3 bg-[#ECE5DD] rounded-lg max-w-xs">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <form onSubmit={sendMessage} className="p-4 bg-[#202C33] border-t border-[#2A3942] relative">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 bg-[#2A3942] rounded-full text-gray-300 hover:bg-[#3B4A54] transition"
                >
                  <Smile className="w-5 h-5" />
                </button>
                {showEmojiPicker && (
                  <div ref={emojiPickerRef} className="absolute bottom-16 left-4 z-10">
                    <Picker
                      data={data}
                      onEmojiSelect={handleEmojiSelect}
                      theme="dark"
                      previewPosition="none"
                      skinTonePosition="none"
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-[#2A3942] rounded-full text-gray-300 hover:bg-[#3B4A54] transition"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <div
                  ref={dropZoneRef}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex-1 p-2 bg-[#2A3942] rounded-lg ${
                    isDragging ? 'border-2 border-dashed border-[#25D366]' : 'border border-[#2A3942]'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleFileSelect(e.target.files)}
                    accept=".pdf,.docx,.pptx,.txt,.jpg,.png"
                    className="hidden"
                  />
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message"
                      className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none"
                    />
                    {selectedFile && (
                      <p className="text-xs text-[#25D366] truncate">{selectedFile.name}</p>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!newMessage.trim() && !selectedFile}
                  className="p-2 bg-[#25D366] rounded-full text-white hover:bg-[#128C7E] disabled:bg-gray-600 transition"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#0B141A]">
            <div className="text-center text-gray-400">
              <MessageCircle className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white">Welcome to Chat</h3>
              <p className="mt-2">Select a contact to start chatting</p>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .font-sans {
          font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }
      `}</style>
    </div>
  );
} 
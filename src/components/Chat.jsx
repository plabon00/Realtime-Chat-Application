import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api';
import { getSocket } from '../utils/socket';
import Profile from './Profile';

const SYNC_INTERVAL = 3600000;
const CHAT_REFRESH_INTERVAL = 10000;

export default function Chat({ user, onLogout, onUserUpdate }) {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [sidebarFilter, setSidebarFilter] = useState('');
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const activeChatRef = useRef(null);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  const loadChats = useCallback(async () => {
    try {
      const data = await api.getChats();
      setChats(data);
    } catch {
      /* silent */
    }
  }, []);

  const loadMessages = useCallback(async (partnerId) => {
    try {
      const data = await api.getMessages(partnerId);
      setMessages(data);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadChats();
      setLoading(false);
    };
    init();
  }, [loadChats]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (data) => {
      const current = activeChatRef.current;
      if (current && data.senderId === current.partnerId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, data];
        });
      }
      loadChats();
    };

    const handleUserOnline = (userId) => {
      setOnlineUsers((prev) => new Set([...prev, userId]));
    };

    const handleUserOffline = (userId) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
    };
  }, [loadChats]);

  useEffect(() => {
    if (!activeChat) return;
    loadMessages(activeChat.partnerId);
  }, [activeChat?.partnerId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadChats();
      if (activeChatRef.current) {
        loadMessages(activeChatRef.current.partnerId);
      }
    }, CHAT_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadChats, loadMessages]);

  useEffect(() => {
    const syncInterval = setInterval(async () => {
      setSyncStatus('syncing');
      try {
        await api.syncChats();
        setSyncStatus('synced');
        setTimeout(() => setSyncStatus('idle'), 3000);
      } catch {
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    }, SYNC_INTERVAL);
    return () => clearInterval(syncInterval);
  }, []);

  const handleSearchUsers = (query) => {
    setNewChatSearch(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await api.searchUsers(query.trim());
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const handleSelectSearchResult = async (selectedUser) => {
    try {
      await api.createConversation(selectedUser.id);
      await loadChats();
      setActiveChat({
        partnerId: selectedUser.id,
        partnerName: selectedUser.username,
        partnerNumber: selectedUser.contactNumber,
        partnerPicture: selectedUser.profilePicture,
      });
      setNewChatSearch('');
      setSearchResults([]);
      setShowNewChat(false);
      setShowMobileSidebar(false);
    } catch {
      /* silent */
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChat) return;

    const text = messageInput.trim();
    setMessageInput('');

    try {
      const msg = await api.sendMessage(activeChat.partnerId, text);
      setMessages((prev) => [...prev, msg]);
      loadChats();
      messageInputRef.current?.focus();
    } catch {
      setMessageInput(text);
    }
  };

  const selectChat = (chat) => {
    setActiveChat({
      partnerId: chat.partnerId,
      partnerName: chat.partnerName,
      partnerNumber: chat.partnerNumber,
      partnerPicture: chat.partnerPicture,
    });
    setShowMobileSidebar(false);
  };

  const formatTime = (ts) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getLastMessagePreview = (chat) => {
    if (!chat.lastMessage) return '';
    const prefix = chat.lastMessageSenderId === user.id ? 'You: ' : '';
    const text = chat.lastMessage;
    return prefix + (text.length > 30 ? text.slice(0, 30) + '…' : text);
  };

  const getInitials = (name) => {
    return (name || '?')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const groupMessagesByDate = (msgs) => {
    const groups = [];
    let currentDate = '';
    msgs.forEach((msg) => {
      const date = formatDate(msg.timestamp);
      if (date !== currentDate) {
        currentDate = date;
        groups.push({ type: 'date', date, key: 'date-' + msg.timestamp });
      }
      groups.push({ type: 'message', ...msg, key: msg.id });
    });
    return groups;
  };

  const filteredChats = chats.filter(
    (c) =>
      c.partnerName.toLowerCase().includes(sidebarFilter.toLowerCase()) ||
      c.partnerNumber.includes(sidebarFilter)
  );

  if (loading) {
    return (
      <div className="chat-loading">
        <div className="loading-spinner"></div>
        <p>Loading your chats...</p>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className={`chat-sidebar ${showMobileSidebar ? 'sidebar-visible' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-user" onClick={() => setShowProfile(true)}>
            <div className="sidebar-avatar">
              {user.profilePicture ? (
                <img src={user.profilePicture} alt="" />
              ) : (
                <span>{getInitials(user.username)}</span>
              )}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-username">{user.username}</span>
              {syncStatus === 'syncing' && <span className="sync-badge syncing">Syncing…</span>}
              {syncStatus === 'synced' && <span className="sync-badge synced">Synced ✓</span>}
              {syncStatus === 'error' && <span className="sync-badge error">Sync failed</span>}
            </div>
          </div>
          <div className="sidebar-actions">
            <button className="icon-btn" onClick={() => setShowNewChat(!showNewChat)} title="New chat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                <line x1="12" y1="8" x2="12" y2="14" />
                <line x1="9" y1="11" x2="15" y2="11" />
              </svg>
            </button>
            <button className="icon-btn" onClick={onLogout} title="Sign out">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16,17 21,12 16,7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        {showNewChat && (
          <div className="new-chat-section">
            <div className="new-chat-header">
              <h3>New Chat</h3>
              <button className="icon-btn-sm" onClick={() => { setShowNewChat(false); setSearchResults([]); setNewChatSearch(''); }}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
            <div className="new-chat-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="tel"
                placeholder="Search by contact number..."
                value={newChatSearch}
                onChange={(e) => handleSearchUsers(e.target.value)}
                autoFocus
              />
            </div>
            <div className="search-results">
              {searching && (
                <div className="search-loading">
                  <div className="loading-spinner-sm"></div>
                  <span>Searching...</span>
                </div>
              )}
              {!searching && newChatSearch && searchResults.length === 0 && (
                <div className="search-empty">
                  <p>No users found</p>
                </div>
              )}
              {searchResults.map((u) => (
                <div key={u.id} className="search-result-item" onClick={() => handleSelectSearchResult(u)}>
                  <div className="search-result-avatar">
                    {u.profilePicture ? (
                      <img src={u.profilePicture} alt="" />
                    ) : (
                      <span>{getInitials(u.username)}</span>
                    )}
                  </div>
                  <div className="search-result-info">
                    <span className="search-result-name">{u.username}</span>
                    <span className="search-result-number">{u.contactNumber}</span>
                  </div>
                  <svg className="search-result-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9,18 15,12 9,6" />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        )}

        {!showNewChat && (
          <div className="sidebar-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Filter conversations..."
              value={sidebarFilter}
              onChange={(e) => setSidebarFilter(e.target.value)}
            />
          </div>
        )}

        <div className="chat-list">
          {filteredChats.length === 0 && !showNewChat ? (
            <div className="empty-chats">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              <p>No conversations yet</p>
              <span>Tap the + button to start a new chat</span>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.partnerId}
                className={`chat-item ${activeChat?.partnerId === chat.partnerId ? 'active' : ''}`}
                onClick={() => selectChat(chat)}
              >
                <div className="chat-item-avatar-wrap">
                  <div className="chat-item-avatar">
                    {chat.partnerPicture ? (
                      <img src={chat.partnerPicture} alt="" />
                    ) : (
                      <span>{getInitials(chat.partnerName)}</span>
                    )}
                  </div>
                  {onlineUsers.has(chat.partnerId) && <div className="online-dot"></div>}
                </div>
                <div className="chat-item-info">
                  <div className="chat-item-top">
                    <span className="chat-item-name">{chat.partnerName}</span>
                    {chat.lastMessageTime && (
                      <span className="chat-item-time">{formatTime(chat.lastMessageTime)}</span>
                    )}
                  </div>
                  <p className="chat-item-preview">{getLastMessagePreview(chat)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={`chat-main ${!showMobileSidebar ? 'main-visible' : ''}`}>
        {activeChat ? (
          <>
            <div className="chat-main-header">
              <button className="back-btn" onClick={() => setShowMobileSidebar(true)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15,18 9,12 15,6" />
                </svg>
              </button>
              <div className="chat-main-avatar-wrap">
                <div className="chat-main-avatar">
                  {activeChat.partnerPicture ? (
                    <img src={activeChat.partnerPicture} alt="" />
                  ) : (
                    <span>{getInitials(activeChat.partnerName)}</span>
                  )}
                </div>
                {onlineUsers.has(activeChat.partnerId) && <div className="online-dot"></div>}
              </div>
              <div className="chat-main-info">
                <h3>{activeChat.partnerName}</h3>
                <span className="chat-contact-number">
                  {onlineUsers.has(activeChat.partnerId) ? 'Online' : activeChat.partnerNumber}
                </span>
              </div>
            </div>

            <div className="messages-area">
              {messages.length === 0 ? (
                <div className="empty-messages">
                  <div className="empty-messages-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                    </svg>
                  </div>
                  <p>No messages yet</p>
                  <span>Say hi to {activeChat.partnerName}!</span>
                </div>
              ) : (
                groupMessagesByDate(messages).map((item) =>
                  item.type === 'date' ? (
                    <div key={item.key} className="date-separator">
                      <span>{item.date}</span>
                    </div>
                  ) : (
                    <div
                      key={item.key}
                      className={`message ${item.senderId === user.id ? 'message-sent' : 'message-received'}`}
                    >
                      <div className="message-bubble">
                        <p>{item.text}</p>
                        <span className="message-time">{formatTime(item.timestamp)}</span>
                      </div>
                    </div>
                  )
                )
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="message-input-area" onSubmit={handleSendMessage}>
              <input
                ref={messageInputRef}
                type="text"
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                autoFocus
              />
              <button type="submit" className="send-btn" disabled={!messageInput.trim()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </form>
          </>
        ) : (
          <div className="no-chat-selected">
            <div className="no-chat-icon">
              <svg width="80" height="80" viewBox="0 0 48 48" fill="none">
                <defs>
                  <linearGradient id="emptyGrad" x1="0" y1="0" x2="48" y2="48">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
                <rect width="48" height="48" rx="14" fill="url(#emptyGrad)" />
                <path d="M14 18C14 15.7909 15.7909 14 18 14H30C32.2091 14 34 15.7909 34 18V26C34 28.2091 32.2091 30 30 30H22L17 34V30H18C15.7909 30 14 28.2091 14 26V18Z" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeOpacity="0.5" />
              </svg>
            </div>
            <h2>Plaban Chat</h2>
            <p>Select a conversation or start a new chat</p>
          </div>
        )}
      </div>

      {showProfile && (
        <Profile
          user={user}
          onUpdate={onUserUpdate}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}

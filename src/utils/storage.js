const CHAT_KEY_PREFIX = 'plaban_chats_';
const USER_KEY = 'plaban_current_user';
const SYNC_LOG_KEY = 'plaban_last_sync';

export const saveCurrentUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getCurrentUser = () => {
  const data = localStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
};

export const clearCurrentUser = () => {
  localStorage.removeItem(USER_KEY);
};

export const getChatKey = (userId) => CHAT_KEY_PREFIX + userId;

export const loadChats = (userId) => {
  const data = localStorage.getItem(getChatKey(userId));
  return data ? JSON.parse(data) : null;
};

export const saveChats = (userId, chats) => {
  localStorage.setItem(getChatKey(userId), JSON.stringify(chats));
};

export const addMessageToChat = (userId, contactNumber, message, contactName) => {
  const chats = loadChats(userId) || [];
  let chat = chats.find((c) => c.contactNumber === contactNumber);
  if (!chat) {
    chat = { contactNumber, contactName: contactName || contactNumber, messages: [] };
    chats.push(chat);
  }
  chat.messages.push(message);
  chat.lastMessageTime = message.timestamp;
  saveChats(userId, chats);
  return chats;
};

export const getLastSyncTime = () => {
  const data = localStorage.getItem(SYNC_LOG_KEY);
  return data ? parseInt(data, 10) : null;
};

export const setLastSyncTime = (time) => {
  localStorage.setItem(SYNC_LOG_KEY, time.toString());
};

export const updateUserProfile = (updatedUser) => {
  saveCurrentUser(updatedUser);
  const users = JSON.parse(localStorage.getItem('plaban_users') || '[]');
  const idx = users.findIndex((u) => u.id === updatedUser.id);
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...updatedUser };
    localStorage.setItem('plaban_users', JSON.stringify(users));
  }
};

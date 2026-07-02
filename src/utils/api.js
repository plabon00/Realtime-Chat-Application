const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
const API_URL = `${BACKEND_URL}/api`;

const getHeaders = () => {
  const token = localStorage.getItem('plaban_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export const api = {
  signIn: (email, password) =>
    fetch(`${API_URL}/auth/signin`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password }),
    }).then(handleResponse),

  signUp: (data) =>
    fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  searchUsers: (query) =>
    fetch(`${API_URL}/users/search?q=${encodeURIComponent(query)}`, {
      headers: getHeaders(),
    }).then(handleResponse),

  getChats: () =>
    fetch(`${API_URL}/chats`, { headers: getHeaders() }).then(handleResponse),

  getMessages: (partnerId) =>
    fetch(`${API_URL}/messages/${partnerId}`, { headers: getHeaders() }).then(handleResponse),

  sendMessage: (recipientId, text) =>
    fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ recipientId, text }),
    }).then(handleResponse),

  createConversation: (partnerId) =>
    fetch(`${API_URL}/conversations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ partnerId }),
    }).then(handleResponse),

  updateProfile: (data) =>
    fetch(`${API_URL}/users/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  syncChats: () =>
    fetch(`${API_URL}/sync`, {
      method: 'POST',
      headers: getHeaders(),
    }).then(handleResponse),
};

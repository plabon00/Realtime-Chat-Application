import { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Chat from './components/Chat';
import { connectSocket, joinRoom, disconnectSocket } from './utils/socket';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('plaban_token');
    const savedUser = localStorage.getItem('plaban_user');
    if (savedToken && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setToken(savedToken);
      setUser(parsedUser);
      connectSocket();
      joinRoom(parsedUser.id);
    }
    setCheckingAuth(false);
  }, []);

  const handleAuthSuccess = (authenticatedUser, authToken) => {
    localStorage.setItem('plaban_token', authToken);
    localStorage.setItem('plaban_user', JSON.stringify(authenticatedUser));
    setToken(authToken);
    setUser(authenticatedUser);
    connectSocket();
    joinRoom(authenticatedUser.id);
  };

  const handleLogout = () => {
    localStorage.removeItem('plaban_token');
    localStorage.removeItem('plaban_user');
    disconnectSocket();
    setToken(null);
    setUser(null);
  };

  const handleUserUpdate = (updatedUser) => {
    localStorage.setItem('plaban_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  if (checkingAuth) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="app">
      {user ? (
        <Chat user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
      ) : (
        <Auth onAuthSuccess={handleAuthSuccess} />
      )}
    </div>
  );
}

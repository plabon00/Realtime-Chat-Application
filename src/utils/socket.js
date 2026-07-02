import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = () => {
  if (socket) return socket;
  const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || window.location.origin;
  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
  });
  return socket;
};

export const getSocket = () => socket;

export const joinRoom = (userId) => {
  if (socket) socket.emit('join', userId);
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

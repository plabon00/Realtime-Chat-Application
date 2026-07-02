export const mockFetchChats = (userId) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          contactNumber: '+1234567890',
          contactName: 'Alice',
          messages: [
            { id: 'mock-1', text: 'Hey, welcome to Plaban Chat!', sender: 'them', timestamp: Date.now() - 86400000 },
            { id: 'mock-2', text: 'Thanks! Great to be here.', sender: 'me', timestamp: Date.now() - 86300000 },
          ],
        },
      ]);
    }, 800);
  });
};

export const mockSyncChats = (userId, chatData) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, synced: chatData.length, timestamp: Date.now() });
    }, 500);
  });
};

export const mockSignIn = (email, password) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem('plaban_users') || '[]');
      const user = users.find((u) => u.email === email && u.password === password);
      if (user) {
        resolve({ ...user, password: undefined });
      } else {
        reject(new Error('Invalid email or password'));
      }
    }, 600);
  });
};

export const mockSignUp = (userData) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem('plaban_users') || '[]');
      const exists = users.find((u) => u.email === userData.email || u.contactNumber === userData.contactNumber);
      if (exists) {
        reject(new Error('User already exists with this email or contact number'));
        return;
      }
      const newUser = {
        id: 'user_' + Date.now(),
        ...userData,
        profilePicture: null,
        createdAt: Date.now(),
      };
      users.push(newUser);
      localStorage.setItem('plaban_users', JSON.stringify(users));
      resolve({ ...newUser, password: undefined });
    }, 600);
  });
};

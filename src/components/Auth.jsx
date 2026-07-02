import { useState } from 'react';
import { api } from '../utils/api';

export default function Auth({ onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    contactNumber: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;
      if (isSignUp) {
        if (!formData.username || !formData.email || !formData.password || !formData.contactNumber) {
          throw new Error('All fields are required');
        }
        result = await api.signUp(formData);
      } else {
        if (!formData.email || !formData.password) {
          throw new Error('Email and password are required');
        }
        result = await api.signIn(formData.email, formData.password);
      }
      onAuthSuccess(result.user, result.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setFormData({ username: '', email: '', password: '', contactNumber: '' });
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="48" y2="48">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <rect width="48" height="48" rx="14" fill="url(#logoGrad)" />
              <path d="M14 18C14 15.7909 15.7909 14 18 14H30C32.2091 14 34 15.7909 34 18V26C34 28.2091 32.2091 30 30 30H22L17 34V30H18C15.7909 30 14 28.2091 14 26V18Z" fill="white" fillOpacity="0.9" />
              <circle cx="21" cy="22" r="1.5" fill="#6366f1" />
              <circle cx="27" cy="22" r="1.5" fill="#6366f1" />
            </svg>
          </div>
          <h1>Plaban Chat</h1>
          <p className="auth-subtitle">{isSignUp ? 'Create your account' : 'Welcome back'}</p>
        </div>

        {error && (
          <div className="auth-error">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4.25a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0v-3zM8 11.5a.75.75 0 100-1.5.75.75 0 000 1.5z" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {isSignUp && (
            <>
              <div className="input-group">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={handleChange}
                  autoComplete="username"
                />
              </div>
              <div className="input-group">
                <label htmlFor="contactNumber">Contact Number</label>
                <input
                  id="contactNumber"
                  name="contactNumber"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  autoComplete="tel"
                />
              </div>
            </>
          )}

          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? (
              <span className="btn-spinner"></span>
            ) : isSignUp ? (
              'Create Account'
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <span>{isSignUp ? 'Already have an account?' : "Don't have an account?"}</span>
          <button type="button" className="auth-toggle" onClick={toggleMode}>
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>

        <div className="auth-demo-info">
          <p className="demo-title">Demo Accounts</p>
          <div className="demo-accounts">
            <span>alice@example.com</span>
            <span>bob@example.com</span>
            <span>charlie@example.com</span>
            <span>diana@example.com</span>
            <span>eve@example.com</span>
          </div>
          <p className="demo-password">Password for all: <strong>password123</strong></p>
        </div>
      </div>
    </div>
  );
}

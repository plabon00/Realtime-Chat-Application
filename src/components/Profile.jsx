import { useState, useRef } from 'react';
import { api } from '../utils/api';

export default function Profile({ user, onUpdate, onClose }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: user.username || '',
    email: user.email || '',
    contactNumber: user.contactNumber || '',
    profilePicture: user.profilePicture || null,
  });
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData({ ...formData, profilePicture: ev.target.result });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.updateProfile(formData);
      onUpdate(updated);
      setEditing(false);
    } catch {
      /* silent */
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name) => {
    return (name || 'U')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-panel" onClick={(e) => e.stopPropagation()}>
        <div className="profile-header">
          <h2>Profile</h2>
          <button className="profile-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="profile-body">
          <div className="profile-avatar-section">
            <div
              className="profile-avatar"
              onClick={() => editing && fileInputRef.current?.click()}
              style={{ cursor: editing ? 'pointer' : 'default' }}
            >
              {formData.profilePicture ? (
                <img src={formData.profilePicture} alt="Profile" />
              ) : (
                <span className="avatar-initials">{getInitials(formData.username)}</span>
              )}
              {editing && (
                <div className="avatar-edit-overlay">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M12 9a3 3 0 100 6 3 3 0 000-6zm0 8a5 5 0 110-10 5 5 0 010 10zm6.5-12.5h-3l-1.3-1.5H9.8L8.5 4.5h-3A2.5 2.5 0 003 7v10a2.5 2.5 0 002.5 2.5h13A2.5 2.5 0 0021 17V7a2.5 2.5 0 00-2.5-2.5z" />
                  </svg>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            {!editing && <p className="profile-name">{formData.username}</p>}
          </div>

          {editing ? (
            <div className="profile-form">
              <div className="input-group">
                <label htmlFor="profile-username">Username</label>
                <input id="profile-username" name="username" type="text" value={formData.username} onChange={handleChange} />
              </div>
              <div className="input-group">
                <label htmlFor="profile-email">Email</label>
                <input id="profile-email" name="email" type="email" value={formData.email} onChange={handleChange} />
              </div>
              <div className="input-group">
                <label htmlFor="profile-contact">Contact Number</label>
                <input id="profile-contact" name="contactNumber" type="tel" value={formData.contactNumber} onChange={handleChange} />
              </div>
              <div className="profile-actions">
                <button className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? <span className="btn-spinner"></span> : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <div className="profile-details">
              <div className="detail-row">
                <div className="detail-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="detail-content">
                  <span className="detail-label">Username</span>
                  <span className="detail-value">{formData.username}</span>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div className="detail-content">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{formData.email}</span>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                  </svg>
                </div>
                <div className="detail-content">
                  <span className="detail-label">Contact</span>
                  <span className="detail-value">{formData.contactNumber}</span>
                </div>
              </div>
              <button className="btn-primary edit-btn" onClick={() => setEditing(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

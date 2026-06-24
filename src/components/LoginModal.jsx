import React, { useState } from 'react';
import './LoginModal.css';

const ROLES = [
  {
    id: 'student',
    label: 'Student',
    emoji: '🎓',
    description: 'Discover clubs, RSVP events & track participation',
    color: '#3B82F6',
  },
  {
    id: 'society_admin',
    label: 'Society Admin',
    emoji: '🏛️',
    description: 'Manage society profile, events & member records',
    color: '#F59E0B',
  },
  {
    id: 'faculty',
    label: 'Faculty Coordinator',
    emoji: '👨‍🏫',
    description: 'Review events, verify participation & approve certificates',
    color: '#10B981',
  },
  {
    id: 'dean',
    label: 'Dean / Authority',
    emoji: '🏫',
    description: 'Approve events, venues, sponsorships & monitor all activities',
    color: '#8B5CF6',
  },
  {
    id: 'admin',
    label: 'Platform Admin',
    emoji: '⚙️',
    description: 'Manage users, societies, settings & system security',
    color: '#EF4444',
  },
];

export default function LoginModal({ onClose, onLogin }) {
  const [step, setStep] = useState('role'); // role | form
  const [selectedRole, setSelectedRole] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setStep('form');
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Please fill all fields.'); return; }
    setLoading(true);
    setError('');
    setTimeout(() => {
      setLoading(false);
      onLogin({ role: selectedRole, name: form.name || form.email.split('@')[0] });
    }, 1200);
  };

  const selectedRoleData = ROLES.find(r => r.id === selectedRole);

  return (
    <div className="modal-backdrop" onClick={onClose} aria-modal="true" role="dialog" aria-label="Login">
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-logo">
            <span className="modal-logo-icon">🔗</span>
            <span className="modal-logo-text">ClubConnect</span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {step === 'role' && (
          <div className="modal-body anim-fade-up">
            <h2 className="modal-title">Welcome to BPIT ClubConnect</h2>
            <p className="modal-subtitle">Select your role to continue</p>
            <div className="role-grid">
              {ROLES.map(role => (
                <button
                  key={role.id}
                  className="role-card"
                  onClick={() => handleRoleSelect(role.id)}
                  id={`role-${role.id}`}
                  style={{ '--role-color': role.color }}
                >
                  <span className="role-emoji">{role.emoji}</span>
                  <span className="role-label">{role.label}</span>
                  <span className="role-desc">{role.description}</span>
                  <span className="role-arrow">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'form' && selectedRoleData && (
          <div className="modal-body anim-fade-up">
            <button className="back-btn" onClick={() => setStep('role')}>← Back</button>
            <div className="selected-role-badge" style={{ '--role-color': selectedRoleData.color }}>
              <span>{selectedRoleData.emoji}</span>
              <span>{selectedRoleData.label}</span>
            </div>

            <div className="form-tabs">
              <button
                className={`form-tab ${!isRegister ? 'active' : ''}`}
                onClick={() => { setIsRegister(false); setError(''); }}
                id="tab-login"
              >Sign In</button>
              <button
                className={`form-tab ${isRegister ? 'active' : ''}`}
                onClick={() => { setIsRegister(true); setError(''); }}
                id="tab-register"
              >Register</button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {isRegister && (
                <div className="form-group">
                  <label htmlFor="auth-name">Full Name</label>
                  <input
                    id="auth-name"
                    type="text"
                    placeholder="Your full name"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    autoComplete="name"
                  />
                </div>
              )}
              <div className="form-group">
                <label htmlFor="auth-email">College Email</label>
                <input
                  id="auth-email"
                  type="email"
                  placeholder="you@bpit.ac.in"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  autoComplete="email"
                />
              </div>
              <div className="form-group">
                <label htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                />
              </div>

              {error && <p className="form-error">{error}</p>}

              <button
                type="submit"
                className="submit-btn"
                id="auth-submit"
                style={{ '--role-color': selectedRoleData.color }}
                disabled={loading}
              >
                {loading
                  ? <span className="spinner" />
                  : isRegister ? `Register as ${selectedRoleData.label}` : `Sign In as ${selectedRoleData.label}`
                }
              </button>

              {!isRegister && (
                <a href="#" className="forgot-link" onClick={e => e.preventDefault()}>
                  Forgot password?
                </a>
              )}
            </form>

            <p className="form-footer">
              {isRegister
                ? 'Already have an account? '
                : 'New to ClubConnect? '}
              <button
                className="link-btn"
                onClick={() => { setIsRegister(!isRegister); setError(''); }}
              >
                {isRegister ? 'Sign In' : 'Register'}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useAuth, ROLE_META } from '../context/AuthContext';
import './LoginModal.css';

const ROLES = [
  {
    id:          'admin',
    label:       'Platform Admin',
    emoji:       '⚙️',
    description: 'Manage users, societies, settings & system security',
    color:       '#EF4444',
  },
  {
    id:          'student_coordinator',
    label:       'Student Coordinator',
    emoji:       '🏛️',
    description: 'Manage society profile, events & member records',
    color:       '#F59E0B',
  },
  {
    id:          'faculty_coordinator',
    label:       'Faculty Coordinator',
    emoji:       '👨‍🏫',
    description: 'Review events, verify participation & approve certificates',
    color:       '#10B981',
  },
  {
    id:          'hod',
    label:       'Head of Department (HOD)',
    emoji:       '🏫',
    description: 'Approve department events, assign coordinators & monitor analytics',
    color:       '#8B5CF6',
  },
  {
    id:          'principal_dean',
    label:       'Principal / Dean',
    emoji:       '🎓',
    color:       '#3B82F6',
    description: 'Overall institutional oversight and final authority',
    color:       '#3B82F6',
  },
];

export default function LoginModal({ onClose, onLoginSuccess }) {
  const { login } = useAuth();

  const [step,         setStep]         = useState('role'); // 'role' | 'form'
  const [selectedRole, setSelectedRole] = useState(null);
  const [form,         setForm]         = useState({ email: '', password: '' });
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    setStep('form');
    setError('');

    // Auto-fill default seeded credentials for easy testing
    const defaultEmails = {
      admin: 'admin@bpit.ac.in',
      student_coordinator: 'student.coord@bpit.ac.in',
      faculty_coordinator: 'faculty.coord@bpit.ac.in',
      hod: 'hod@bpit.ac.in',
      principal_dean: 'principal@bpit.ac.in',
    };
    const defaultPasswords = {
      admin: 'Admin@123',
      student_coordinator: 'Student@123',
      faculty_coordinator: 'Faculty@123',
      hod: 'Hod@123',
      principal_dean: 'Principal@123',
    };

    setForm({
      email: defaultEmails[roleId] || '',
      password: defaultPasswords[roleId] || '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userData = await login(form.email, form.password);
      onLoginSuccess?.(`Welcome, ${userData.name}! Signed in as ${ROLE_META[userData.role]?.label ?? userData.role} ${ROLE_META[userData.role]?.emoji ?? ''}`);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
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

        {/* ── Step 1: Role selection ── */}
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

        {/* ── Step 2: Login form ── */}
        {step === 'form' && selectedRoleData && (
          <div className="modal-body anim-fade-up">
            <button className="back-btn" onClick={() => { setStep('role'); setError(''); }}>← Back</button>

            <div className="selected-role-badge" style={{ '--role-color': selectedRoleData.color }}>
              <span>{selectedRoleData.emoji}</span>
              <span>{selectedRoleData.label}</span>
            </div>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="auth-email">College Email</label>
                <input
                  id="auth-email"
                  type="email"
                  placeholder="you@bpit.ac.in"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  autoComplete="email"
                  disabled={loading}
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
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="form-error" role="alert">
                  <span>⚠️</span> {error}
                </div>
              )}

              <button
                type="submit"
                className="submit-btn"
                id="auth-submit"
                style={{ '--role-color': selectedRoleData.color }}
                disabled={loading}
              >
                {loading
                  ? <span className="spinner" />
                  : `Sign In as ${selectedRoleData.label}`
                }
              </button>

              <a href="#" className="forgot-link" onClick={e => e.preventDefault()}>
                Forgot password?
              </a>
            </form>

            <p className="form-footer" style={{ marginTop: '1rem', fontSize: '0.78rem', color: '#64748b', textAlign: 'center' }}>
              🔒 Credentials are verified securely via JWT &amp; Neon PostgreSQL
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

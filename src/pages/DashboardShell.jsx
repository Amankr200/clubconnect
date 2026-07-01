import React from 'react';
import { useAuth, ROLE_META } from '../context/AuthContext';
import './Dashboard.css';

/**
 * DashboardShell — shared layout used by all role dashboards.
 *
 * Props:
 *  - modules: string[]  — list of upcoming module names to display
 */
export default function DashboardShell({ modules = [] }) {
  const { user, logout } = useAuth();

  const meta = ROLE_META[user?.role] || {
    label: 'User',
    emoji: '👤',
    color: '#6366f1',
    description: 'Your personalised dashboard',
  };

  return (
    <div className="dashboard-root" style={{ '--role-color': meta.color }}>
      {/* ── Top Bar ────────────────────────────────────────── */}
      <header className="dash-topbar">
        {/* Brand */}
        <div className="dash-brand">
          <span className="dash-brand-icon">🔗</span>
          <span className="dash-brand-name">ClubConnect</span>
        </div>

        {/* Role badge */}
        <div className="dash-role-badge">
          <span>{meta.emoji}</span>
          <span>{meta.label}</span>
        </div>

        {/* Right: user info + logout */}
        <div className="dash-topbar-right">
          <div className="dash-user-info">
            <span className="dash-user-name">{user?.name}</span>
            <span className="dash-user-email">{user?.email}</span>
          </div>

          <button
            className="dash-logout-btn"
            onClick={logout}
            id="btn-logout"
            aria-label="Logout"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────── */}
      <main className="dash-main">
        <div className="dash-welcome-card">
          <span className="dash-role-emoji-big">{meta.emoji}</span>

          <h1 className="dash-welcome-title">
            Welcome, <span>{user?.name?.split(' ')[0] || 'there'}!</span>
          </h1>

          <p className="dash-welcome-subtitle">
            You are logged in as <strong>{meta.label}</strong>.<br />
            {meta.description}.
          </p>

          <div className="dash-coming-soon">
            🚧 &nbsp; Dashboard modules coming soon
          </div>

          {modules.length > 0 && (
            <div className="dash-modules-grid">
              {modules.map((m, i) => (
                <div key={i} className="dash-module-chip">
                  {m}
                </div>
              ))}
            </div>
          )}

          <div className="dash-dots">
            <span className="dash-dot" />
            <span className="dash-dot" />
            <span className="dash-dot" />
          </div>
        </div>
      </main>
    </div>
  );
}

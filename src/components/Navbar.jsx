import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { ROLE_META } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar({
  onLoginClick,
  user,
  onLogout,
  currentPage,
  onNavigate,
  onReportBugClick,
  onOpenDashboard,
}) {
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  /* Close profile dropdown on outside click */
  useEffect(() => {
    if (!profileOpen) return;
    const handleClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [profileOpen]);

  /* Get initials from name */
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const meta = user ? (ROLE_META[user.role] || { label: user.role, emoji: '👤', color: '#6366f1', description: '' }) : null;

  /* Smooth scroll within a page, or navigate page first */
  const handleNav = (href) => {
    setMenuOpen(false);
    setProfileOpen(false);
    if (href === '#clubs') { onNavigate('clubs'); return; }
    if (href === '#calendar') { onNavigate('calendar'); return; }
    if (currentPage !== 'home') {
      onNavigate('home');
      setTimeout(() => {
        const el = document.querySelector(href);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const NAV_LINKS = [
    { label: 'Home',              href: '#home',     page: 'home' },
    { label: 'Stories',           href: '#stories',  page: 'home' },
    { label: 'Events',            href: '#events',   page: 'home' },
    { label: 'Calendar',          href: '#calendar', page: 'calendar' },
    { label: 'Clubs & Societies', href: '#clubs',    page: 'clubs' },
    { label: 'About',             href: '#about',    page: 'home' },
  ];

  /* Role-specific quick actions for profile dropdown */
  const ROLE_ACTIONS = {
    admin:               [{ icon: '🏛️', label: 'Society Registrations' }, { icon: '📍', label: 'Venue Availability' }, { icon: '🐛', label: 'Bug Reports' }],
    student_coordinator: [{ icon: '📅', label: 'My Event Requests' }, { icon: '📸', label: 'Publish 24h Story' }],
    faculty_coordinator: [{ icon: '📋', label: 'Pending Approvals' }, { icon: '📊', label: 'Analytics' }, { icon: '📸', label: 'Publish Story' }],
    hod:                 [{ icon: '📋', label: 'Dept Approvals' }, { icon: '👥', label: 'Assign Coordinators' }],
    principal_dean:      [{ icon: '🎓', label: 'Final Approvals' }, { icon: '🏛️', label: 'College Analytics' }],
    student:             [{ icon: '🏛️', label: 'Browse Clubs' }, { icon: '📅', label: 'My Events' }],
  };
  const quickActions = meta ? (ROLE_ACTIONS[user?.role] || []) : [];

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">

      {/* ── Row 1: BPIT Identity ── */}
      <div className="navbar-identity">
        <button
          className="navbar-bpit-brand"
          onClick={() => onNavigate('home')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
          aria-label="Go to home"
        >
          <div className="navbar-bpit-logo-box" aria-label="BPIT Logo">BPIT</div>
          <div>
            <div className="navbar-bpit-title">Bhagwan Parshuram Institute of Technology</div>
            <div className="navbar-bpit-subtitle">
              A Unit of Bhartiya Brahmin Charitable Trust (Regd.) | Affiliated to GGSIPU, Delhi
            </div>
          </div>
        </button>

        <div className="navbar-platform-name">
          <div className="platform-badge">🔗 ClubConnect</div>
          <div className="platform-tagline">Unified Clubs &amp; Societies Platform</div>
        </div>
      </div>

      {/* ── Row 2: Nav links & actions ── */}
      <div className="navbar-inner">
        <div className="navbar-links" role="menubar">
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              className={`nav-link ${currentPage === link.page && link.href === '#clubs' ? 'active' : ''} ${link.href === '#clubs' ? 'nav-link-clubs' : ''}`}
              role="menuitem"
              onClick={e => { e.preventDefault(); handleNav(link.href); }}
            >
              {link.href === '#clubs' && <span>🏛️ </span>}
              {link.href === '#calendar' && <span>🗓️ </span>}
              {link.label}
            </a>
          ))}
        </div>

        <div className="navbar-actions">
          {/* Theme Toggle */}
          <button
            className="theme-toggle-btn nav-theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            aria-label="Toggle theme mode"
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>

          {/* Report Bug */}
          <button className="nav-bug-btn" onClick={onReportBugClick} title="Report a bug">
            🐛 Report Bug
          </button>

          {/* ── Profile Dropdown (when logged in) ── */}
          {user ? (
            <div className="nav-profile-wrap" ref={profileRef}>
              <button
                className="nav-profile-btn"
                onClick={() => setProfileOpen(v => !v)}
                aria-expanded={profileOpen}
                aria-label="Open user profile"
                id="nav-profile-btn"
                style={{ '--role-color': meta?.color || '#1A3A8B' }}
              >
                <span
                  className="nav-profile-avatar"
                  style={{ background: meta?.color || '#1A3A8B' }}
                >
                  {getInitials(user.name)}
                </span>
                <span className="nav-profile-name">{user.name}</span>
                <span className="nav-profile-caret" style={{ transform: profileOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
              </button>

              {/* ── Profile Dropdown Panel ── */}
              {profileOpen && (
                <div className="nav-profile-dropdown" role="menu" aria-label="User profile menu">

                  {/* Identity */}
                  <div className="npd-identity">
                    <div className="npd-avatar-lg" style={{ background: meta?.color || '#1A3A8B' }}>
                      {getInitials(user.name)}
                    </div>
                    <div className="npd-info">
                      <span className="npd-name">{user.name}</span>
                      <span className="npd-email">{user.email}</span>
                      <span
                        className="npd-role-badge"
                        style={{
                          background: `${meta?.color || '#1A3A8B'}18`,
                          color: meta?.color || '#1A3A8B',
                          border: `1px solid ${meta?.color || '#1A3A8B'}40`,
                        }}
                      >
                        {meta?.emoji} {meta?.label}
                      </span>
                    </div>
                  </div>

                  <div className="npd-divider" />

                  {/* Open My Dashboard */}
                  <button
                    className="npd-dashboard-btn"
                    onClick={() => { setProfileOpen(false); onOpenDashboard?.(); }}
                    role="menuitem"
                    id="open-my-dashboard"
                    style={{ '--role-color': meta?.color || '#1A3A8B' }}
                  >
                    <span>⚡</span>
                    <span>Open My Dashboard</span>
                    <span className="npd-dashboard-arrow">→</span>
                  </button>

                  <div className="npd-divider" />

                  {/* Quick Actions */}
                  {quickActions.length > 0 && (
                    <>
                      <div className="npd-section-label">Quick Actions</div>
                      <div className="npd-actions-list">
                        {quickActions.map((action, i) => (
                          <button
                            key={i}
                            className="npd-action-item"
                            onClick={() => { setProfileOpen(false); onOpenDashboard?.(); }}
                            role="menuitem"
                          >
                            <span className="npd-action-icon">{action.icon}</span>
                            <span>{action.label}</span>
                          </button>
                        ))}
                      </div>
                      <div className="npd-divider" />
                    </>
                  )}

                  {/* Navigation & Auth */}
                  <div className="npd-actions-list">
                    <button
                      className="npd-action-item"
                      onClick={() => { setProfileOpen(false); onNavigate('home'); }}
                      role="menuitem"
                    >
                      <span className="npd-action-icon">🏠</span>
                      <span>Go to Home</span>
                    </button>
                    <button
                      className="npd-action-item"
                      onClick={() => { setProfileOpen(false); onReportBugClick?.(); }}
                      role="menuitem"
                    >
                      <span className="npd-action-icon">🐛</span>
                      <span>Report a Bug</span>
                    </button>
                    <button
                      className="npd-action-item npd-logout"
                      onClick={() => { setProfileOpen(false); onLogout(); }}
                      role="menuitem"
                      id="navbar-logout-btn"
                    >
                      <span className="npd-action-icon">🚪</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button className="nav-login-btn" id="nav-login" onClick={onLoginClick}>
              🔑 Login / Register
            </button>
          )}

          {/* Hamburger */}
          <button
            className={`hamburger ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(m => !m)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            id="hamburger-btn"
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="mobile-menu">
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              className={`mobile-nav-link ${link.href === '#clubs' ? 'mobile-nav-clubs' : ''}`}
              onClick={e => { e.preventDefault(); handleNav(link.href); }}
            >
              {link.href === '#clubs' ? '🏛️ ' : ''}
              {link.href === '#calendar' ? '🗓️ ' : ''}{link.label}
            </a>
          ))}

          <div style={{ display: 'flex', gap: '8px', margin: '0.75rem 0' }}>
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              style={{ flex: 1, justifyContent: 'center', padding: '0.6rem' }}
            >
              {theme === 'light' ? '🌙 Switch to Dark Mode' : '☀️ Switch to Light Mode'}
            </button>
          </div>

          <button
            onClick={() => { setMenuOpen(false); onReportBugClick?.(); }}
            style={{
              background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)',
              color: '#fb7185', padding: '0.65rem', borderRadius: '8px',
              fontWeight: 600, width: '100%', margin: '0 0 0.5rem 0',
              fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            🐛 Report Bug in Site
          </button>

          <div className="mobile-actions">
            {user ? (
              <>
                {onOpenDashboard && (
                  <button
                    className="nav-login-btn"
                    onClick={() => { setMenuOpen(false); onOpenDashboard(); }}
                    style={{ background: meta?.color, color: 'white', border: 'none' }}
                  >
                    ⚡ My Dashboard
                  </button>
                )}
                <button className="nav-login-btn" onClick={() => { setMenuOpen(false); onLogout(); }}>
                  🚪 Sign Out
                </button>
              </>
            ) : (
              <button className="nav-login-btn" onClick={() => { setMenuOpen(false); onLoginClick(); }}>
                🔑 Login / Register
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

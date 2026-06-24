import React, { useState } from 'react';
import './Navbar.css';

export default function Navbar({ onLoginClick, user, onLogout, currentPage, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);

  /* Smooth scroll within a page, or navigate page first */
  const handleNav = (href) => {
    setMenuOpen(false);
    setDropOpen(false);

    if (href === '#clubs') {
      onNavigate('clubs');
      return;
    }
    // For home-page anchors
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
    { label: 'Home',             href: '#home',    page: 'home' },
    { label: 'Stories',          href: '#stories', page: 'home' },
    { label: 'Events',           href: '#events',  page: 'home' },
    { label: 'Clubs & Societies', href: '#clubs',  page: 'clubs' },
    { label: 'About',            href: '#about',   page: 'home' },
  ];

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

      {/* ── Row 2: Blue nav links ── */}
      <div className="navbar-inner">
        <div className="navbar-links" role="menubar">
          {NAV_LINKS.map(link => {
            const isActive = link.page === 'clubs'
              ? currentPage === 'clubs'
              : currentPage === 'home' && link.href !== '#clubs';
            return (
              <a
                key={link.href}
                href={link.href}
                className={`nav-link ${currentPage === link.page && link.href === '#clubs' ? 'active' : ''} ${link.href === '#clubs' ? 'nav-link-clubs' : ''}`}
                role="menuitem"
                onClick={e => { e.preventDefault(); handleNav(link.href); }}
                aria-current={link.page === 'clubs' && currentPage === 'clubs' ? 'page' : undefined}
              >
                {link.href === '#clubs' && <span>🏛️ </span>}
                {link.label}
              </a>
            );
          })}
        </div>

        <div className="navbar-actions">
          {user ? (
            <div className="user-menu" onBlur={() => setTimeout(() => setDropOpen(false), 150)}>
              <button
                className="user-btn"
                onClick={() => setDropOpen(d => !d)}
                id="user-menu-btn"
                aria-expanded={dropOpen}
              >
                <div className="user-avatar">{user.name?.[0]?.toUpperCase() || 'U'}</div>
                <span className="user-name">{user.name}</span>
                <span className="user-role-badge">{user.role?.label}</span>
                <span className="chevron">{dropOpen ? '▲' : '▼'}</span>
              </button>
              {dropOpen && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <div className="dropdown-name">{user.name}</div>
                    <div className="dropdown-role">{user.role?.emoji} {user.role?.label}</div>
                  </div>
                  <a href="#" className="dropdown-item" onClick={e => e.preventDefault()}>📊 Dashboard</a>
                  <a href="#" className="dropdown-item" onClick={e => e.preventDefault()}>👤 My Profile</a>
                  <a href="#" className="dropdown-item" onClick={e => e.preventDefault()}>📜 Certificates</a>
                  <a href="#" className="dropdown-item" onClick={e => e.preventDefault()}>🔔 Notifications</a>
                  <hr className="dropdown-divider" />
                  <button className="dropdown-item logout" onClick={() => { setDropOpen(false); onLogout(); }}>
                    🚪 Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="nav-login-btn" id="nav-login" onClick={onLoginClick}>
              🔑 Login / Register
            </button>
          )}

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
              {link.href === '#clubs' ? '🏛️ ' : ''}{link.label}
            </a>
          ))}
          <div className="mobile-actions">
            {user ? (
              <button className="nav-login-btn" onClick={onLogout}>Sign Out</button>
            ) : (
              <button className="nav-login-btn" onClick={() => { setMenuOpen(false); onLoginClick(); }}>
                Login / Register
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

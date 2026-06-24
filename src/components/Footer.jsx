import React from 'react';
import './Footer.css';

const SOCIETIES_QUICK = [
  '#DEFINE', 'GDSC', 'IEEE', 'Mavericks', 'Octave', 'E-Cell', 'NSS', 'Kalam'
];

export default function Footer({ onNavigate }) {
  const QUICK_LINKS = [
    { label: 'Home',                  action: () => onNavigate?.('home') },
    { label: 'Stories',               action: () => onNavigate?.('home') },
    { label: 'Events',                action: () => onNavigate?.('home') },
    { label: 'All Clubs & Societies', action: () => onNavigate?.('clubs') },
    { label: 'Login / Register',      action: null },
  ];
  return (
    <footer className="footer" id="about" aria-label="Footer">
      <div className="footer-glow" />
      <div className="footer-inner">
        <div className="footer-top">
          {/* Brand */}
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="footer-logo-icon">🔗</span>
              <div>
                <div className="footer-logo-name">ClubConnect</div>
                <div className="footer-logo-sub">BPIT – Bhagwan Parshuram Institute of Technology</div>
              </div>
            </div>
            <p className="footer-brand-desc">
              A unified digital platform for all BPIT clubs and societies — bringing students, societies,
              faculty, and administration onto one transparent, organized platform.
            </p>
            <div className="footer-socials">
              <a href="#" className="social-link" aria-label="Instagram">📸</a>
              <a href="#" className="social-link" aria-label="LinkedIn">💼</a>
              <a href="#" className="social-link" aria-label="Twitter">🐦</a>
              <a href="#" className="social-link" aria-label="Email">✉️</a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-col">
            <h4 className="footer-col-title">Quick Links</h4>
            <ul className="footer-links">
              {QUICK_LINKS.map(link => (
                <li key={link.label}>
                  <button
                    className="footer-link footer-link-btn"
                    onClick={link.action || undefined}
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Societies */}
          <div className="footer-col">
            <h4 className="footer-col-title">Societies</h4>
            <ul className="footer-links">
              {SOCIETIES_QUICK.map(s => (
                <li key={s}><a href="#" className="footer-link">{s}</a></li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="footer-col">
            <h4 className="footer-col-title">Contact</h4>
            <div className="contact-items">
              <div className="contact-item">
                <span>🏫</span>
                <span>BPIT, PSP Area, Dr. KN Katju Marg, Sector 17, Rohini, Delhi 110089</span>
              </div>
              <div className="contact-item">
                <span>📧</span>
                <span>clubconnect@bpit.ac.in</span>
              </div>
              <div className="contact-item">
                <span>📞</span>
                <span>011-2700-7500</span>
              </div>
            </div>

            <div className="footer-badges">
              <div className="footer-badge badge badge-maroon">AICTE Approved</div>
              <div className="footer-badge badge badge-blue">Affiliated GGSIPU</div>
            </div>
          </div>
        </div>

        <div className="footer-divider" />

        <div className="footer-bottom">
          <div className="footer-bottom-left">
            © 2025 ClubConnect – BPIT. All rights reserved.
          </div>
          <div className="footer-bottom-right">
            <span>Made with ❤️ for BPIT Students</span>
            <span className="footer-version">v1.0.0 Beta</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

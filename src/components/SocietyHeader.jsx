import React from 'react';
import './SocietyHeader.css';

export default function SocietyHeader({ society }) {
  if (!society) return null;

  return (
    <section className="society-header" style={{
      '--grad-from': society.gradFrom,
      '--grad-to': society.gradTo,
    }}>
      {/* Hero background */}
      <div className="society-hero" style={{
        background: `linear-gradient(135deg, ${society.gradFrom}, ${society.gradTo})`
      }} />

      {/* Content */}
      <div className="society-header-content">
        {/* Logo/Avatar */}
        <div className="society-logo" style={{
          background: `linear-gradient(135deg, ${society.gradFrom}, ${society.gradTo})`
        }}>
          <span className="society-emoji">{society.emoji}</span>
        </div>

        {/* Info */}
        <div className="society-info">
          <div className="society-meta">
            <span className="badge badge-category">{society.category}</span>
            <span className="badge badge-founded">Est. {society.founded}</span>
          </div>

          <h1 className="society-name">{society.name}</h1>
          <p className="society-fullname">{society.fullName}</p>
          <p className="society-tagline">"{society.tagline}"</p>

          {/* Stats */}
          <div className="society-stats">
            <div className="stat-item">
              <span className="stat-number">{society.members}</span>
              <span className="stat-label">Members</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{society.events}</span>
              <span className="stat-label">Events</span>
            </div>
          </div>

          {/* Social Links */}
          <div className="society-social">
            <a href={society.social.instagram} className="social-link" title="Instagram">📱</a>
            <a href={society.social.linkedin} className="social-link" title="LinkedIn">💼</a>
            <a href={`mailto:${society.social.email}`} className="social-link" title="Email">✉️</a>
          </div>
        </div>
      </div>
    </section>
  );
}

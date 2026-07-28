import React, { useEffect, useState } from 'react';
import './SocietyHeader.css';

export default function SocietyHeader({ society }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [society?.logo]);

  if (!society) return null;

  const showLogo = Boolean(society.logo) && !imageFailed;

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
          {showLogo ? (
            <img
              className="society-logo-image"
              src={society.logo}
              alt={`${society.name} logo`}
              onError={() => setImageFailed(true)}
            />
          ) : null}
          <span className="society-emoji" style={{ display: showLogo ? 'none' : 'block' }}>{society.emoji}</span>
        </div>

        {/* Info */}
        <div className="society-info">
          <div className="society-meta">
            <span className="badge badge-category">{society.category}</span>
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
            {society?.social?.instagram && (
              <a href={society.social.instagram} className="social-link" title="Instagram">📱</a>
            )}
            {society?.social?.linkedin && (
              <a href={society.social.linkedin} className="social-link" title="LinkedIn">💼</a>
            )}
            {society?.social?.email && (
              <a href={`mailto:${society.social.email}`} className="social-link" title="Email">✉️</a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

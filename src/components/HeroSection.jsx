import React from 'react';
import './HeroSection.css';

const STATS = [
  { icon: '🏛️', num: '20+', label: 'Active Clubs & Societies' },
  { icon: '👨‍🎓', num: '2000+', label: 'Student Members' },
  { icon: '📅', num: '100+', label: 'Events Per Year' },
  { icon: '🏆', num: '5', label: 'Society Categories' },
];

const BANNER_ICONS = [
  { emoji: '💻', label: 'Technical' },
  { emoji: '🎭', label: 'Cultural' },
  { emoji: '🚀', label: 'Entrepreneur' },
  { emoji: '🤝', label: 'Social' },
  { emoji: '🎵', label: 'Arts' },
];

export default function HeroSection({ onLoginClick, onNavigateClubs }) {
  return (
    <section className="hero" id="home" aria-label="Hero section">
      <div className="hero-container">

        {/* Main Banner */}
        <div className="hero-banner">
          <div className="hero-banner-bg" />
          <div className="hero-banner-overlay" />

          {/* Background icon decorations */}
          <div className="hero-banner-icons" aria-hidden="true">
            {BANNER_ICONS.map(ic => (
              <div key={ic.label} className="hero-banner-icon-item">
                <span>{ic.emoji}</span>
                <span>{ic.label}</span>
              </div>
            ))}
          </div>

          <div className="hero-banner-content">
            <div className="hero-banner-eyebrow">
              🔗 ClubConnect – BPIT
            </div>
            <h1 className="hero-title">
              Unified Clubs &amp; Societies<br />Management Platform
            </h1>
            <p className="hero-subtitle">
              Discover all BPIT clubs, RSVP for events, track participation records,
              view society stories, and connect with your campus community — all in one place.
            </p>
            <div className="hero-cta-row">
              <button className="hero-btn-main" onClick={onLoginClick} id="hero-explore-btn">
                🔍 Explore Platform
              </button>
              <button className="hero-btn-sec" onClick={onNavigateClubs} id="hero-clubs-btn">
                🏛️ Browse All Clubs
              </button>
            </div>
          </div>

          {/* Slide dots (decorative, like BPIT carousel) */}
          <div className="hero-dots" aria-hidden="true">
            <div className="hero-dot active" />
            <div className="hero-dot" />
            <div className="hero-dot" />
          </div>
        </div>

        {/* Stats row */}
        <div className="hero-stats-row">
          {STATS.map((s, i) => (
            <div key={i} className="hero-stat-card">
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

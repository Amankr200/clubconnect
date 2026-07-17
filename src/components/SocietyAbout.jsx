import React from 'react';
import './SocietyAbout.css';

export default function SocietyAbout({ society }) {
  if (!society) return null;

  return (
    <section className="society-about">
      <div className="section-container">
        <div className="about-grid">
          {/* About the Society */}
          <div className="about-card">
            <div className="about-icon">📝</div>
            <h3 className="about-title">About the Society</h3>
            <p className="about-text">{society.description}</p>
          </div>

          {/* Vision & Mission */}
          <div className="about-card">
            <div className="about-icon">🎯</div>
            <h3 className="about-title">Vision & Mission</h3>
            <div className="vision-content">
              <div className="mission-item">
                <strong>Vision:</strong>
                <p>To foster innovation, creativity, and excellence within the {society.fullName} community.</p>
              </div>
              <div className="mission-item">
                <strong>Mission:</strong>
                <p>Organize impactful events, develop skills, build networks, and create meaningful opportunities for our members.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import React, { useState, useEffect } from 'react';
import { announcements } from '../data/clubs';
import './AnnouncementBar.css';

export default function AnnouncementBar() {
  const doubled = [...announcements, ...announcements];

  return (
    <div className="ann-bar" role="marquee" aria-label="Announcements">
      <div className="ann-label">
        <span>📢</span>
        <span>LIVE</span>
      </div>
      <div className="ann-track-wrapper">
        <div className="ann-track">
          {doubled.map((a, i) => (
            <span key={i} className="ann-item">{a}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

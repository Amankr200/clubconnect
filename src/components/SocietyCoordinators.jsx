import React from 'react';
import './SocietyCoordinators.css';

export default function SocietyCoordinators({ society }) {
  if (!society) return null;

  const coordinators = [
    {
      id: 1,
      name: society.coordinator,
      role: 'Faculty Coordinator',
      emoji: '👨‍🏫',
      email: society.social.email,
      contact: '+91 XXXXXXXXXX'
    },
    {
      id: 2,
      name: society.head,
      role: 'Student Coordinator',
      emoji: '👨‍💼',
      email: society.social.email,
      contact: '+91 XXXXXXXXXX'
    },
  ];

  return (
    <section className="society-coordinators">
      <div className="section-container">
        <div className="coordinators-header">
          <h2 className="section-heading-blue">
            <span>👥</span> Coordinators & Contacts
          </h2>
          <p className="section-sub-desc">
            Reach out to our coordinators for events, membership, and collaboration.
          </p>
        </div>

        <div className="coordinators-grid">
          {coordinators.map(coord => (
            <div key={coord.id} className="coordinator-card card">
              <div className="coord-avatar">
                <span>{coord.emoji}</span>
              </div>

              <h3 className="coord-name">{coord.name}</h3>
              <p className="coord-role">{coord.role}</p>

              <div className="coord-contact">
                <a href={`mailto:${coord.email}`} className="contact-link" title="Email">
                  ✉️ Email
                </a>
                <a href={`tel:${coord.contact}`} className="contact-link" title="Phone">
                  📱 Call
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

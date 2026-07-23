import React, { useState, useEffect } from 'react';
import { upcomingEvents, clubs } from '../data/clubs';
import { venues } from '../data/venues';
import './EventsSection.css';

const STATUS_MAP = {
  approved: { label: 'Live', color: '#1A6B1A', bg: '#EEF8EE', border: '#AADDAA', icon: '✅' },
  upcoming: { label: 'Upcoming', color: '#805500', bg: '#FFF8E8', border: '#DDCC88', icon: '⏳' },
  rejected: { label: 'Rejected', color: '#8B1A1A', bg: '#FFF0F0', border: '#FFBBBB', icon: '❌' },
};

const EVENT_TYPE_ICONS = {
  Competition: '🏆',
  Cultural: '🎭',
  Entrepreneurship: '🚀',
  Technical: '💻',
  'Social Service': '🤝',
};

function getVenueName(venueId) {
  return venues.find((v) => v.id === Number(venueId))?.name || `Venue #${venueId}`;
}

export default function EventsSection({ onLoginClick }) {
  const [rsvpd, setRsvpd] = useState(new Set());
  const [pinned, setPinned] = useState(new Set());
  const [activeFilter, setActiveFilter] = useState('All');
  const [approvedBookings, setApprovedBookings] = useState([]);

  useEffect(() => {
    fetch('/api/venue-bookings/public?status=approved')
      .then((res) => res.json())
      .then((data) => {
        if (data.bookings) {
          setApprovedBookings(data.bookings);
        }
      })
      .catch(() => {});
  }, []);

  const filters = ['All', 'Technical', 'Cultural', 'Entrepreneurship', 'Social Service', 'Competition'];

  // Convert live approved venue bookings to event card format
  const liveApprovedEvents = approvedBookings.map((b) => ({
    id: `db-${b.id}`,
    title: b.eventName,
    club: b.hostClub,
    clubEmoji: '🎉',
    date: b.date,
    time: b.timeSlots?.[0] ? `${b.timeSlots[0].startTime} - ${b.timeSlots[0].endTime}` : 'Full Day',
    venue: getVenueName(b.venueId),
    rsvp: 120,
    status: 'approved',
    type: 'Technical',
    color: '#6366f1',
    description: b.description,
    photo: b.photo,
  }));

  const allEvents = [...liveApprovedEvents, ...upcomingEvents];

  const filtered = activeFilter === 'All'
    ? allEvents
    : allEvents.filter((e) => e.type === activeFilter);

  const handleRsvp = (id, status) => {
    if (status !== 'approved') return;
    setRsvpd((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handlePin = (id) => {
    setPinned((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  return (
    <section className="events-section" id="events" aria-label="Upcoming Events">
      <div className="section-container">
        {/* Section heading */}
        <div className="section-heading-blue">
          <span>📅</span> Upcoming Events &amp; Programs – BPIT
        </div>
        <p className="section-sub-desc">
          RSVP for workshops, competitions, orientations, and cultural programs.
        </p>

        {/* Stats bar */}
        <div className="events-stats-bar">
          <div className="evt-stat">
            <span className="evt-stat-num">{allEvents.length}</span>
            <span className="evt-stat-label">Events Listed</span>
          </div>
          <div className="evt-stat-div" />
          <div className="evt-stat">
            <span className="evt-stat-num">{allEvents.filter((e) => e.status === 'approved').length}</span>
            <span className="evt-stat-label">Approved Live Events</span>
          </div>
          <div className="evt-stat-div" />
          <div className="evt-stat">
            <span className="evt-stat-num">{allEvents.filter((e) => e.status === 'upcoming').length}</span>
            <span className="evt-stat-label">Upcoming Programs</span>
          </div>
          <div className="evt-stat-div" />
          <div className="evt-stat">
            <span className="evt-stat-num">{allEvents.reduce((a, e) => a + e.rsvp, 0)}+</span>
            <span className="evt-stat-label">Total RSVPs</span>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="events-filter-row">
          {filters.map((f) => (
            <button
              key={f}
              className={`evt-filter-tab ${activeFilter === f ? 'active' : ''}`}
              onClick={() => setActiveFilter(f)}
              id={`evt-filter-${f.toLowerCase().replace(/\s/g, '-')}`}
            >
              {EVENT_TYPE_ICONS[f] || '📋'} {f}
            </button>
          ))}
        </div>

        {/* Events Grid */}
        <div className="events-grid">
          {filtered.map((event) => {
            const st = STATUS_MAP[event.status] || STATUS_MAP.approved;
            const isRsvpd = rsvpd.has(event.id);
            const isPinned = pinned.has(event.id);
            return (
              <article
                key={event.id}
                className={`event-card card ${isPinned ? 'pinned' : ''}`}
                style={{ '--event-color': event.color }}
                id={`event-${event.id}`}
              >
                {/* Image Poster Preview if available */}
                {event.photo && (
                  <div style={{ margin: '-1.5rem -1.5rem 1rem -1.5rem', maxHeight: '180px', overflow: 'hidden', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                    <img src={event.photo} alt={event.title} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                  </div>
                )}

                {/* Pinned ribbon */}
                {isPinned && <div className="pin-ribbon">📌 Pinned</div>}

                {/* Status */}
                <div className="event-status" style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                  {st.icon} {st.label}
                </div>

                {/* Club row */}
                <div className="event-header-row">
                  <div className="event-club-icon">{event.clubEmoji}</div>
                  <div className="event-club-info">
                    <div className="event-club">{event.club}</div>
                    <span
                      className="event-type-pill"
                      style={{ background: `${event.color}15`, color: event.color, border: `1px solid ${event.color}40` }}
                    >
                      {EVENT_TYPE_ICONS[event.type] || '📋'} {event.type}
                    </span>
                  </div>
                  {/* Pin button */}
                  <button
                    className={`pin-btn ${isPinned ? 'active' : ''}`}
                    onClick={() => handlePin(event.id)}
                    title={isPinned ? 'Unpin event' : 'Pin event'}
                    aria-label={isPinned ? 'Unpin' : 'Pin to top'}
                  >
                    📌
                  </button>
                </div>

                {/* Title */}
                <h3 className="event-title">{event.title}</h3>

                {/* Description */}
                <p className="event-desc">{event.description}</p>

                {/* Detail grid */}
                <div className="event-detail-grid">
                  <div className="event-detail-item">
                    <span className="edl">📅 Date</span>
                    <span className="edv">{event.date}</span>
                  </div>
                  <div className="event-detail-item">
                    <span className="edl">⏰ Time</span>
                    <span className="edv">{event.time}</span>
                  </div>
                  <div className="event-detail-item">
                    <span className="edl">📍 Venue</span>
                    <span className="edv">{event.venue}</span>
                  </div>
                  <div className="event-detail-item">
                    <span className="edl">👥 RSVPs</span>
                    <span className="edv">{event.rsvp + (isRsvpd ? 1 : 0)} registered</span>
                  </div>
                </div>

                {/* RSVP progress bar */}
                <div className="rsvp-bar-wrap">
                  <div className="rsvp-bar-label">
                    <span>RSVP Progress</span>
                    <span>{Math.min(event.rsvp + (isRsvpd ? 1 : 0), 300)} / 300</span>
                  </div>
                  <div className="rsvp-bar-track">
                    <div
                      className="rsvp-bar-fill"
                      style={{
                        width: `${Math.min(((event.rsvp + (isRsvpd ? 1 : 0)) / 300) * 100, 100)}%`,
                        background: event.color,
                      }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="event-actions">
                  <button
                    className={`rsvp-btn ${isRsvpd ? 'rsvpd' : ''}`}
                    onClick={() => handleRsvp(event.id, event.status)}
                    id={`rsvp-${event.id}`}
                    style={!isRsvpd ? { background: event.color, borderColor: event.color } : {}}
                  >
                    {isRsvpd ? '✅ RSVP\'d!' : '🎟️ RSVP Now'}
                  </button>
                  <button className="btn-outline event-details-btn" onClick={onLoginClick}>
                    View Details
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {/* Load more / view all */}
        <div className="events-footer-row">
          <button className="btn-primary" onClick={onLoginClick} id="view-all-events">
            📅 View All Events &amp; History
          </button>
          <button className="btn-outline" onClick={onLoginClick}>
            🔔 Subscribe to Event Alerts
          </button>
        </div>
      </div>
    </section>
  );
}

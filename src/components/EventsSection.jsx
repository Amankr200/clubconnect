import React, { useState, useEffect } from 'react';
import { upcomingEvents, clubs } from '../data/clubs';
import { venues } from '../data/venues';
import './EventsSection.css';

const STATUS_MAP = {
  approved: { label: 'Live', color: '#1A6B1A', bg: '#EEF8EE', border: '#AADDAA', icon: '✅' },
  upcoming: { label: 'Upcoming', color: '#805500', bg: '#FFF8E8', border: '#DDCC88', icon: '⏳' },
  ended: { label: 'Ended', color: '#475569', bg: '#F1F5F9', border: '#CBD5E1', icon: '🔴' },
  rejected: { label: 'Rejected', color: '#8B1A1A', bg: '#FFF0F0', border: '#FFBBBB', icon: '❌' },
};

const EVENT_TYPE_ICONS = {
  Competition: '🏆',
  Cultural: '🎭',
  'Research & Innovation': '🚀',
  Technical: '💻',
  'Social & Environment': '🤝',
};


function formatDateLabel(value) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function formatEventTime(event) {
  if (event.allDay) {
    return 'All day';
  }

  if (!event.start) {
    return 'Time not available';
  }

  const start = new Date(`${event.start}Z`);
  const end = event.end ? new Date(`${event.end}Z`) : null;
  const options = { hour: '2-digit', minute: '2-digit', hour12: true };

  return `${start.toLocaleTimeString('en-US', options)}${end ? ` - ${end.toLocaleTimeString('en-US', options)}` : ''}`;
}

function getEventRegistrationUrl(event) {
  return event.extendedProps?.registrationLink || event.extendedProps?.registrationUrl || event.url || '';
}

function getVenueName(venueId) {
  return venues.find((v) => v.id === Number(venueId))?.name || `Venue #${venueId}`;
}

// Helper to determine if an event date has passed
function isEventEnded(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let eventDate = new Date(dateStr);
  if (isNaN(eventDate.getTime())) {
    const year = today.getFullYear();
    eventDate = new Date(`${dateStr}, ${year}`);
  }

  if (isNaN(eventDate.getTime())) return false;

  eventDate.setHours(23, 59, 59, 999);
  return eventDate < today;
}

export default function EventsSection({ onLoginClick }) {
  const [rsvpd, setRsvpd] = useState(new Set());
  const [pinned, setPinned] = useState(() => {
    try {
      const saved = localStorage.getItem('clubconnect_pinned_events');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [activeFilter, setActiveFilter] = useState('All');
  const [approvedBookings, setApprovedBookings] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [activeEvent, setActiveEvent] = useState(null);

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

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const response = await fetch("/api/societies");

        if (!response.ok) {
          throw new Error("Failed to fetch societies");
        }

        const data = await response.json();
        setClubs(data.societies || []);
      } catch (error) {
        console.error("Error fetching societies:", error);
        setClubs([]);
      }
    };

    fetchClubs();
  }, []);

  const getClubName = (clubId) => {
    return (
      clubs.find(
        (club) => String(club.id) === String(clubId)
      )?.name || "Unknown club"
    );
  };

  const filters = ['All', 'Technical', 'Cultural', 'Research & Innovation', 'Social & Environment', 'Competition'];

  // Convert live approved venue bookings to event card format
  const liveApprovedEvents = approvedBookings.map((b) => ({
    id: `db-${b.id}`,
    title: `${b.eventName} (${getClubName(b.hostClub)})`,
    club: getClubName(b.hostClub),
    clubEmoji: '🎉',
    date: b.date,
    time: b.timeSlots?.[0] ? `${b.timeSlots[0].startTime} - ${b.timeSlots[0].endTime}` : 'Full Day',
    venue: getVenueName(b.venueId),
    location: getVenueName(b.venueId),
    rsvp: 120,
    status: 'approved',
    type: 'Technical',
    color: '#6366f1',
    description: b.description,
    photo: b.photo,
    extendedProps: {
      bookingId: b.id,
      hostClub: b.hostClub,
      photo: b.photo,
      photoFileName: b.photoFileName,
      descriptionText: b.description,
      eligibility: b.eligibility,
      attendance: b.attendance,
      feedback: b.feedback,
      studentCoordinators: b.studentCoordinators,
      isBooked: true
    }
  }));

  const allEvents = [...liveApprovedEvents, ...upcomingEvents];

  // Map events to calculate ended status dynamically
  const processedEvents = allEvents.map((e) => {
    const ended = isEventEnded(e.date);
    return {
      ...e,
      isEnded: ended,
      effectiveStatus: ended ? 'ended' : e.status,
    };
  });

  const filtered = activeFilter === 'All'
    ? processedEvents
    : processedEvents.filter((e) => e.type === activeFilter);

  // Sorting order:
  // 1. Pinned events FIRST (move to top-left corner)
  // 2. Live & Upcoming active events
  // 3. Ended / Past events AT THE BOTTOM
  const sortedEvents = [...filtered].sort((a, b) => {
    const aPinned = pinned.has(a.id);
    const bPinned = pinned.has(b.id);

    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    if (!a.isEnded && b.isEnded) return -1;
    if (a.isEnded && !b.isEnded) return 1;

    return 0;
  });

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
      try {
        localStorage.setItem('clubconnect_pinned_events', JSON.stringify([...n]));
      } catch {}
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
          RSVP for workshops, competitions, orientations, and cultural programs. Pin your favorite events to the top!
        </p>

        {/* Stats bar */}
        <div className="events-stats-bar">
          <div className="evt-stat">
            <span className="evt-stat-num">{allEvents.length}</span>
            <span className="evt-stat-label">Events Listed</span>
          </div>
          <div className="evt-stat-div" />
          <div className="evt-stat">
            <span className="evt-stat-num">{processedEvents.filter((e) => !e.isEnded && e.effectiveStatus === 'approved').length}</span>
            <span className="evt-stat-label">Approved Live Events</span>
          </div>
          <div className="evt-stat-div" />
          <div className="evt-stat">
            <span className="evt-stat-num">{processedEvents.filter((e) => !e.isEnded && e.effectiveStatus === 'upcoming').length}</span>
            <span className="evt-stat-label">Upcoming Programs</span>
          </div>
          <div className="evt-stat-div" />
          <div className="evt-stat">
            <span className="evt-stat-num">{processedEvents.filter((e) => e.isEnded).length}</span>
            <span className="evt-stat-label">Past / Ended Events</span>
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
          {sortedEvents.map((event) => {
            const st = STATUS_MAP[event.effectiveStatus] || STATUS_MAP.approved;
            const isRsvpd = rsvpd.has(event.id);
            const isPinned = pinned.has(event.id);
            return (
              <article
                key={event.id}
                className={`event-card card ${isPinned ? 'pinned' : ''} ${event.isEnded ? 'ended-card' : ''}`}
                style={{ '--event-color': event.isEnded ? '#94A3B8' : event.color }}
                id={`event-${event.id}`}
              >
                {/* Image Poster Preview if available */}
                {event.photo && (
                  <div style={{ margin: '-1.5rem -1.5rem 1rem -1.5rem', maxHeight: '180px', overflow: 'hidden', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                    <img src={event.photo} alt={event.title} style={{ width: '100%', height: '180px', objectFit: 'cover', opacity: event.isEnded ? 0.75 : 1 }} />
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
                    title={isPinned ? 'Unpin event' : 'Pin to top left'}
                    aria-label={isPinned ? 'Unpin' : 'Pin to top left'}
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
                    <span className="edl">👥 SIGN-UPS</span>
                    <span className="edv">{event.rsvp + (isRsvpd ? 1 : 0)} registered</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="event-actions">
                  {event.isEnded ? (
                    <button className="rsvp-btn ended" disabled style={{ background: '#94A3B8', borderColor: '#94A3B8', cursor: 'not-allowed', color: '#FFF' }}>
                      Event Ended
                    </button>
                  ) : (
                    <button
                      className={`rsvp-btn ${isRsvpd ? 'rsvpd' : ''}`}
                      onClick={onLoginClick}
                      style={!isRsvpd ? { background: event.color, borderColor: event.color } : {}}
                    >
                      Register Here
                    </button>
                  )}
                  <button className="btn-outline event-details-btn"
                    type="button" onClick={() => setActiveEvent(event)}>
                    View Details
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {/* Load more / view all */}
        <div className="events-footer-row">
          <button className="btn-primary" id="view-all-events">
            📅 View All Events &amp; History
          </button>
          <button className="btn-outline" onClick={onLoginClick}>
            🔔 Subscribe to Event Alerts
          </button>
        </div>
      </div>

      {activeEvent && (
        <div className="calendar-detail-modal" onClick={() => setActiveEvent(null)} role="presentation">
          <div className="calendar-detail-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="calendar-detail-header">
              <div>
                <h3>{activeEvent.title}</h3>
                <p>{activeEvent.location || activeEvent.extendedProps?.venue || 'Location not specified'}</p>
              </div>
              <button className="calendar-detail-close" onClick={() => setActiveEvent(null)} aria-label="Close event details">✕</button>
            </div>
            <div className="calendar-detail-body">
              {activeEvent.extendedProps?.photo && (
                <img
                  src={activeEvent.extendedProps.photo}
                  alt={activeEvent.extendedProps.photoFileName || activeEvent.title}
                  className="calendar-detail-image"
                />
              )}
              <div className="calendar-detail-section">
                <strong>Date</strong>
                <span>{formatDateLabel(activeEvent.start?.slice(0, 10) || selectedDate)}</span>
              </div>
              <div className="calendar-detail-section">
                <strong>Time</strong>
                <span>{formatEventTime(activeEvent)}</span>
              </div>
              <div className="calendar-detail-section">
                <strong>Description</strong>
                <p>{activeEvent.extendedProps?.descriptionText || activeEvent.description || 'No description available.'}</p>
              </div>
              {activeEvent.extendedProps?.eligibility && (
                <div className="calendar-detail-section">
                  <strong>Eligibility</strong>
                  <span>{activeEvent.extendedProps.eligibility}</span>
                </div>
              )}
              {activeEvent.extendedProps?.studentCoordinators && (
                <div className="calendar-detail-section">
                  <strong>Student Coordinators</strong>
                  <span>{activeEvent.extendedProps.studentCoordinators}</span>
                </div>
              )}
              {activeEvent.extendedProps?.attendance && (
                <div className="calendar-detail-section">
                  <strong>Expected Attendance</strong>
                  <span>{activeEvent.extendedProps.attendance}</span>
                </div>
              )}
              {activeEvent.extendedProps?.feedback && (
                <div className="calendar-detail-section">
                  <strong>Feedback Notes</strong>
                  <p>{activeEvent.extendedProps.feedback}</p>
                </div>
              )}
              {getEventRegistrationUrl(activeEvent) ? (
                <div className="calendar-detail-action">
                  <a
                    href={getEventRegistrationUrl(activeEvent)}
                    target="_blank"
                    rel="noreferrer"
                    className="calendar-detail-button"
                  >
                    Open registration link
                  </a>
                </div>
              ) : (
                <div className="calendar-detail-section">
                  <strong>Registration</strong>
                  <span>No registration link provided.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

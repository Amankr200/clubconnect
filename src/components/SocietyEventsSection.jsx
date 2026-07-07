import React, { useState } from 'react';
import './SocietyEventsSection.css';

export default function SocietyEventsSection({ society, isCoordinator, onCreateEvent }) {
  const [activeTab, setActiveTab] = useState('upcoming');

  // Mock events data - in a real app, this would come from the backend
  const mockEvents = [
    {
      id: 1,
      name: 'Monthly Meetup',
      date: 'Dec 15, 2024',
      time: '6:00 PM',
      location: 'Main Auditorium',
      status: 'approved',
      attendees: 145,
      description: 'Join us for our monthly meetup and networking session.'
    },
    {
      id: 2,
      name: 'Workshop Series',
      date: 'Dec 20, 2024',
      time: '4:00 PM',
      location: 'Lab A',
      status: 'approved',
      attendees: 89,
      description: 'Hands-on workshop on latest technologies and trends.'
    },
    {
      id: 3,
      name: 'Annual Fest',
      date: 'Jan 15, 2025',
      time: '10:00 AM',
      location: 'Grounds',
      status: 'pending',
      attendees: 0,
      description: 'Our flagship annual event celebrating community and culture.'
    },
  ];

  const pastEvents = [
    {
      id: 101,
      name: 'Spring Conference 2024',
      date: 'Mar 10, 2024',
      location: 'Convention Center',
      attendees: 320,
      description: 'Successfully organized spring conference with keynote speakers.'
    },
    {
      id: 102,
      name: 'Hackathon 2024',
      date: 'Feb 18, 2024',
      location: 'Tech Labs',
      attendees: 256,
      description: '24-hour hackathon with amazing innovations from students.'
    },
  ];

  const upcomingEvents = mockEvents.filter(e => e.status === 'approved');
  const pendingEvents = mockEvents.filter(e => e.status === 'pending');

  return (
    <section className="society-events-section">
      <div className="section-container">
        <div className="events-header">
          <div className="events-title-row">
            <h2 className="section-heading-blue">
              <span>📅</span> Events & Activities
            </h2>
            {isCoordinator && (
              <button className="btn-primary btn-create-event" onClick={onCreateEvent}>
                + Create Event
              </button>
            )}
          </div>
          <p className="section-sub-desc">
            Discover upcoming events and explore past activities from {society.name}
          </p>
        </div>

        {/* Tabs */}
        <div className="events-tabs">
          <button
            className={`event-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            🔮 Upcoming ({upcomingEvents.length})
          </button>
          <button
            className={`event-tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            ⏳ Pending Approval ({pendingEvents.length})
          </button>
          <button
            className={`event-tab ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            📸 Past Events ({pastEvents.length})
          </button>
        </div>

        {/* Events Grid */}
        <div className="events-grid">
          {activeTab === 'upcoming' && upcomingEvents.length > 0 && (
            upcomingEvents.map(event => (
              <EventCard key={event.id} event={event} isPast={false} />
            ))
          )}

          {activeTab === 'pending' && pendingEvents.length > 0 && (
            pendingEvents.map(event => (
              <EventCard key={event.id} event={event} isPending={true} />
            ))
          )}

          {activeTab === 'past' && pastEvents.length > 0 && (
            pastEvents.map(event => (
              <EventCard key={event.id} event={event} isPast={true} />
            ))
          )}

          {((activeTab === 'upcoming' && upcomingEvents.length === 0) ||
            (activeTab === 'pending' && pendingEvents.length === 0) ||
            (activeTab === 'past' && pastEvents.length === 0)) && (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>No {activeTab} events at the moment</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function EventCard({ event, isPast, isPending }) {
  const statusConfig = {
    approved: { label: 'Approved & Live', color: '#1A6B1A', bg: '#EEF8EE', icon: '✅' },
    pending: { label: 'Pending Approval', color: '#805500', bg: '#FFF8E8', icon: '⏳' },
  };

  const status = isPending ? 'pending' : (isPast ? 'past' : 'approved');
  const statusInfo = statusConfig[status];

  return (
    <article className={`event-card card ${isPast ? 'past-event' : 'upcoming-event'}`}>
      {statusInfo && !isPast && (
        <div className="event-status" style={{
          background: statusInfo.bg,
          borderColor: statusInfo.color,
        }}>
          <span className="status-icon">{statusInfo.icon}</span>
          <span className="status-label" style={{ color: statusInfo.color }}>
            {statusInfo.label}
          </span>
        </div>
      )}

      <div className="event-content">
        <h3 className="event-name">{event.name}</h3>
        <p className="event-desc">{event.description}</p>

        <div className="event-details">
          {!isPast && (
            <>
              <div className="detail-item">
                <span className="detail-icon">📅</span>
                <span className="detail-text">{event.date}</span>
              </div>
              <div className="detail-item">
                <span className="detail-icon">🕐</span>
                <span className="detail-text">{event.time}</span>
              </div>
            </>
          )}

          <div className="detail-item">
            <span className="detail-icon">📍</span>
            <span className="detail-text">{event.location}</span>
          </div>

          <div className="detail-item">
            <span className="detail-icon">👥</span>
            <span className="detail-text">
              {isPast ? `${event.attendees} attended` : `${event.attendees} interested`}
            </span>
          </div>
        </div>

        {!isPast && !isPending && (
          <button className="btn-primary btn-rsvp">
            ✓ Interested
          </button>
        )}
      </div>
    </article>
  );
}

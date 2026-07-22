import React, { useEffect, useMemo, useState } from 'react';
import { useAuth, ROLE_META } from '../context/AuthContext';
import { decideVenueBooking, getMyVenueBookings, getVenueBookingInbox, resubmitVenueBooking } from '../api/venueBookings.js';
import { venues } from '../data/venues.js';
import VenueBookingModal from '../components/VenueBookingModal.jsx';
import './Dashboard.css';

/**
 * DashboardShell — shared layout used by all role dashboards.
 *
 * Props:
 *  - modules: string[]  — list of upcoming module names to display
 */
function formatDateTime(dateString) {
  const value = new Date(dateString);
  if (Number.isNaN(value.getTime())) {
    return dateString;
  }

  return value.toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSlotRange(booking) {
  const slots = booking.timeSlots || [];
  if (slots.length === 0) {
    return 'No time selected';
  }

  return `${slots[0].startTime} - ${slots[slots.length - 1].endTime}`;
}

function renderLinkValue(value) {
  const text = String(value || '').trim();
  if (!text) {
    return null;
  }

  if (/^https?:\/\//i.test(text)) {
    return (
      <a href={text} target="_blank" rel="noreferrer" className="dash-link-value">
        {text}
      </a>
    );
  }

  return <span>{text}</span>;
}

function renderBookingDetails(booking) {
  return (
    <div className="dash-booking-details">
      {booking.photo && (
        <div className="dash-booking-photo-wrap">
          <img
            src={booking.photo}
            alt={booking.photoFileName || booking.eventName || 'Booking photo'}
            className="dash-booking-photo"
          />
        </div>
      )}

      <div className="dash-booking-detail-grid">
        <div><strong>Description:</strong> <span>{booking.description || '—'}</span></div>
        <div><strong>Eligibility:</strong> <span>{booking.eligibility || '—'}</span></div>
        <div><strong>Attendance:</strong> {renderLinkValue(booking.attendance) || <span>—</span>}</div>
        <div><strong>Feedback:</strong> {renderLinkValue(booking.feedback) || <span>—</span>}</div>
        <div><strong>Student Coordinators:</strong> <span>{booking.studentCoordinators || '—'}</span></div>
      </div>
    </div>
  );
}

function getVenueName(venueId) {
  return venues.find((venue) => venue.id === venueId)?.name || 'Unknown Venue';
}

export default function DashboardShell({ modules = [] }) {
  const { user, token, logout } = useAuth();
  const [inbox, setInbox] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [selectedNotes, setSelectedNotes] = useState({});
  const [isVenueModalOpen, setIsVenueModalOpen] = useState(false);
  const meta = ROLE_META[user?.role] || {
    label: 'User',
    emoji: '👤',
    color: '#6366f1',
    description: 'Your personalised dashboard',
  };

  const canReview = user?.role === 'faculty_coordinator' || user?.role === 'principal';
  const isStudent = user?.role === 'student_coordinator';

  useEffect(() => {
    let cancelled = false;

    if (canReview && token) {
      getVenueBookingInbox(token)
        .then((data) => {
          if (!cancelled) {
            setInbox(data.bookings || []);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setInbox([]);
          }
        });
    }

    if (isStudent && token) {
      getMyVenueBookings(token)
        .then((data) => {
          if (!cancelled) {
            setMyRequests(data.bookings || []);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setMyRequests([]);
          }
        });
    }

    return () => {
      cancelled = true;
    };
  }, [canReview, isStudent, token]);

  const pendingRequests = useMemo(() => inbox.filter((booking) => booking.currentReviewerRole === user?.role), [inbox, user?.role]);
  const needsRevision = useMemo(() => myRequests.filter((booking) => booking.currentReviewerRole === 'student_coordinator' || booking.currentReviewerRole === 'faculty_coordinator'), [myRequests]);

  const refreshData = async () => {
    if (canReview && token) {
      const data = await getVenueBookingInbox(token);
      setInbox(data.bookings || []);
    }

    if (isStudent && token) {
      const data = await getMyVenueBookings(token);
      setMyRequests(data.bookings || []);
    }
  };

  const handleDecision = async (bookingId, decision) => {
    const notes = selectedNotes[bookingId] || '';
    const result = await decideVenueBooking(token, bookingId, decision, notes);
    setSelectedNotes((current) => ({ ...current, [bookingId]: '' }));
    await refreshData();
    return result;
  };

  const handleResubmit = async (booking) => {
    const result = await resubmitVenueBooking(token, booking.id, {
      venueId: booking.venueId,
      date: booking.date,
      timeSlots: booking.timeSlots,
      eventName: booking.eventName,
      hostClub: booking.hostClub,
      photo: booking.photo,
      photoFileName: booking.photoFileName,
      description: booking.description,
      eligibility: booking.eligibility,
      attendance: booking.attendance,
      feedback: booking.feedback,
      studentCoordinators: booking.studentCoordinators,
      notes: selectedNotes[booking.id] || '',
    });
    setSelectedNotes((current) => ({ ...current, [booking.id]: '' }));
    await refreshData();
    return result;
  };

  return (
    <div className="dashboard-root" style={{ '--role-color': meta.color }}>
      {/* ── Top Bar ────────────────────────────────────────── */}
      <header className="dash-topbar">
        {/* Brand */}
        <div className="dash-brand">
          <span className="dash-brand-icon">🔗</span>
          <span className="dash-brand-name">ClubConnect</span>
        </div>

        {/* Role badge */}
        <div className="dash-role-badge">
          <span>{meta.emoji}</span>
          <span>{meta.label}</span>
        </div>

        {/* Right: user info + logout */}
        <div className="dash-topbar-right">
          <div className="dash-user-info">
            <span className="dash-user-name">{user?.name}</span>
            <span className="dash-user-email">{user?.email}</span>
          </div>

          <button
            className="dash-logout-btn"
            onClick={logout}
            id="btn-logout"
            aria-label="Logout"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────── */}
      <main className="dash-main">
        <div className="dash-welcome-card">
          <span className="dash-role-emoji-big">{meta.emoji}</span>

          <h1 className="dash-welcome-title">
            Welcome, <span>{user?.name?.split(' ')[0] || 'there'}!</span>
          </h1>

          <p className="dash-welcome-subtitle">
            You are logged in as <strong>{meta.label}</strong>.<br />
            {meta.description}.
          </p>

          {isStudent && (
            <div className="dash-student-cta">
              <div>
                <strong>Request a venue</strong>
                <p>Send the request to faculty coordinator first, then principal for final approval.</p>
              </div>
              <button className="dash-action-btn dash-allow-btn" onClick={() => setIsVenueModalOpen(true)}>
                Open booking form
              </button>
            </div>
          )}

          {canReview && (
            <section className="dash-approval-panel">
              <div className="dash-panel-header">
                <div>
                  <h2>Pending approvals</h2>
                  <p>{pendingRequests.length} request(s) awaiting your decision</p>
                </div>
              </div>

              {pendingRequests.length > 0 ? (
                <div className="dash-request-list">
                  {pendingRequests.map((booking) => (
                    <article key={booking.id} className="dash-request-card">
                      <div className="dash-request-main">
                        <div>
                          <h3>{booking.eventName}</h3>
                          <p>{getVenueName(booking.venueId)} · {formatDateTime(`${booking.date}T12:00:00`)}</p>
                          <p>{formatSlotRange(booking)} · {booking.hostClub}</p>
                        </div>
                        <span className="dash-status-pill">{booking.status}</span>
                      </div>

                      <div className="dash-request-meta">
                        <div>Submitted by: {booking.requestedBy?.name}</div>
                        <div>Current reviewer: {booking.currentReviewerRole}</div>
                      </div>

                      {renderBookingDetails(booking)}

                      {booking.changeRequest?.notes && (
                        <div className="dash-change-note">
                          Changes requested: {booking.changeRequest.notes}
                        </div>
                      )}

                      <textarea
                        className="dash-notes-input"
                        placeholder={canReview ? 'Add decision notes or revision instructions' : 'Add your revision notes'}
                        value={selectedNotes[booking.id] || ''}
                        onChange={(event) => setSelectedNotes((current) => ({ ...current, [booking.id]: event.target.value }))}
                      />

                      <div className="dash-action-row">
                        <button className="dash-action-btn dash-allow-btn" onClick={() => handleDecision(booking.id, 'allow')}>
                          Allow
                        </button>
                        <button className="dash-action-btn dash-disallow-btn" onClick={() => handleDecision(booking.id, 'disallow')}>
                          Disallow
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="dash-empty-state">No approvals are pending right now.</div>
              )}
            </section>
          )}

          {isStudent && (
            <section className="dash-approval-panel">
              <div className="dash-panel-header">
                <div>
                  <h2>My venue requests</h2>
                  <p>{needsRevision.length} request(s) need your update</p>
                </div>
              </div>

              {myRequests.length > 0 ? (
                <div className="dash-request-list">
                  {myRequests.map((booking) => (
                    <article key={booking.id} className="dash-request-card">
                      <div className="dash-request-main">
                        <div>
                          <h3>{booking.eventName}</h3>
                          <p>{getVenueName(booking.venueId)} · {booking.date}</p>
                          <p>{formatSlotRange(booking)} · {booking.hostClub}</p>
                        </div>
                        <span className="dash-status-pill">{booking.status}</span>
                      </div>

                      {booking.changeRequest?.notes && (
                        <div className="dash-change-note">
                          Requested changes: {booking.changeRequest.notes}
                        </div>
                      )}

                      {renderBookingDetails(booking)}

                      <textarea
                        className="dash-notes-input"
                        placeholder="Update details before resubmitting"
                        value={selectedNotes[booking.id] || ''}
                        onChange={(event) => setSelectedNotes((current) => ({ ...current, [booking.id]: event.target.value }))}
                      />

                      <div className="dash-action-row">
                        <button className="dash-action-btn dash-allow-btn" onClick={() => handleResubmit(booking)}>
                          Resubmit
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="dash-empty-state">No venue requests yet.</div>
              )}
            </section>
          )}

          <div className="dash-coming-soon">
            🚧 &nbsp; Dashboard modules coming soon
          </div>

          {modules.length > 0 && (
            <div className="dash-modules-grid">
              {modules.map((m, i) => (
                <div key={i} className="dash-module-chip">
                  {m}
                </div>
              ))}
            </div>
          )}

          <div className="dash-dots">
            <span className="dash-dot" />
            <span className="dash-dot" />
            <span className="dash-dot" />
          </div>
        </div>
      </main>

      {isStudent && (
        <VenueBookingModal
          isOpen={isVenueModalOpen}
          token={token}
          onClose={() => setIsVenueModalOpen(false)}
          onBookingSuccess={async () => {
            setIsVenueModalOpen(false);
            if (token) {
              const data = await getMyVenueBookings(token);
              setMyRequests(data.bookings || []);
            }
          }}
        />
      )}
    </div>
  );
}

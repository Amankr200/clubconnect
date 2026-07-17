import React, { useState } from 'react';
import VenueBookingModal from '../components/VenueBookingModal.jsx';
import { getAllBookings } from '../data/bookings.js';
import { venues } from '../data/venues.js';
import './VenueBookingPage.css';
import { Calendar, MapPin, Users } from 'lucide-react';

export default function VenueBookingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allBookings, setAllBookings] = useState(getAllBookings());

  const handleBookingSuccess = (newBooking) => {
    // Refresh bookings list
    setAllBookings(getAllBookings());
  };

  const getVenueName = (venueId) => {
    return venues.find(v => v.id === venueId)?.name || 'Unknown Venue';
  };

  const formatDate = (dateStr) => {
    const date = new Date(`${dateStr}T12:00:00`);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const convertTo12Hour = (time) => {
    const [hour, minute] = time.split(':').map(Number);
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
  };

  const getBookingDuration = (timeSlots) => {
    return `${timeSlots.length * 50} min`;
  };

  const confirmedBookings = allBookings.filter(b => b.status === 'confirmed');

  return (
    <div className="venue-booking-page">
      <div className="section-container">
        {/* Header */}
        <div className="booking-page-header">
          <div>
            <h2>Venue Booking System</h2>
            <p>Book a campus venue for your club events. Available slots are 50 minutes each, from 9:30 AM to 5:00 PM.</p>
          </div>
          <button className="btn-book-now" onClick={() => setIsModalOpen(true)}>
            + Book a Venue
          </button>
        </div>

        {/* Two Column Layout */}
        <div className="booking-layout">
          {/* Left Column - System Info */}
          <aside className="booking-info-card">
            <div className="info-section">
              <h3>📋 How It Works</h3>
              <ol>
                <li>Select a venue from our list</li>
                <li>Choose your preferred date and time</li>
                <li>System checks availability instantly</li>
                <li>If available, confirm your booking</li>
                <li>If not, select another time slot</li>
              </ol>
            </div>

            <div className="info-section">
              <h3>⏱️ Booking Details</h3>
              <ul>
                <li><strong>Duration:</strong> 50 minutes per slot</li>
                <li><strong>Start Time:</strong> 9:30 AM</li>
                <li><strong>End Time:</strong> 5:00 PM</li>
                <li><strong>Time Slots:</strong> Auto-generated</li>
              </ul>
            </div>

            <div className="info-section">
              <h3>🏢 Available Venues</h3>
              <div className="venues-mini-list">
                {venues.map(venue => (
                  <div key={venue.id} className="venue-mini-item">
                    <strong>{venue.name}</strong>
                    <small>{venue.capacity} persons</small>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Right Column - Bookings */}
          <main className="booking-list-container">
            <div className="booking-list-header">
              <h3>📅 Upcoming Bookings</h3>
              <span className="booking-count">{confirmedBookings.length} bookings</span>
            </div>

            {confirmedBookings.length > 0 ? (
              <div className="bookings-list">
                {confirmedBookings.map(booking => (
                  <div key={booking.id} className="booking-card">
                    <div className="booking-card-left">
                      <div className="booking-date">
                        <Calendar size={18} />
                        <span>{formatDate(booking.date)}</span>
                      </div>
                      <div className="booking-time">
                        <span className="time-badge">
                          {convertTo12Hour(booking.timeSlots[0].startTime)} - {convertTo12Hour(booking.timeSlots[booking.timeSlots.length - 1].endTime)}
                        </span>
                        <span className="duration-badge" style={{ marginLeft: '8px', fontSize: '11px', background: '#dbeafe', color: '#0c4a6e', padding: '4px 8px', borderRadius: '4px' }}>
                          {getBookingDuration(booking.timeSlots)}
                        </span>
                      </div>
                    </div>

                    <div className="booking-card-content">
                      <h4 className="event-title">{booking.eventName}</h4>
                      <div className="booking-meta">
                        <div className="meta-item">
                          <MapPin size={16} />
                          <span>{getVenueName(booking.venueId)}</span>
                        </div>
                        <div className="meta-item">
                          <Users size={16} />
                          <span>{booking.hostClub}</span>
                        </div>
                      </div>
                    </div>

                    <div className="booking-status">
                      <span className="status-badge confirmed">✓ Confirmed</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <p>No bookings yet</p>
                <small>Click "Book a Venue" to create your first event booking</small>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Venue Booking Modal */}
      <VenueBookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onBookingSuccess={handleBookingSuccess}
      />
    </div>
  );
}

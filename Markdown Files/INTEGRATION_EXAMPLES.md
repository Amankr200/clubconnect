// Integration example for VenueBookingModal in your App
// This shows how to use the modal in different contexts

import React, { useState } from 'react';
import VenueBookingModal from './components/VenueBookingModal.jsx';

/**
 * Example 1: Add as a standalone button in navbar or main menu
 */
export function VenueBookingButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsModalOpen(true)}
        style={{
          padding: '10px 20px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '14px'
        }}
      >
        📅 Book a Venue
      </button>

      <VenueBookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onBookingSuccess={(booking) => {
          console.log('Booking created:', booking);
          // You can add additional logic here after successful booking
          // e.g., show notification, update calendar, etc.
        }}
      />
    </>
  );
}

/**
 * Example 2: Add as a context menu or action
 */
export function EventBookingContext() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState(null);

  const handleBookForClub = (clubName) => {
    setSelectedClub(clubName);
    setIsModalOpen(true);
  };

  return (
    <div>
      {/* Sample club list with book buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        <div style={{ padding: '16px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>#DEFINE</h3>
          <button onClick={() => handleBookForClub('#DEFINE')}>Book Venue</button>
        </div>
        <div style={{ padding: '16px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>IEEE</h3>
          <button onClick={() => handleBookForClub('IEEE')}>Book Venue</button>
        </div>
      </div>

      <VenueBookingModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedClub(null);
        }}
        onBookingSuccess={(booking) => {
          console.log(`Venue booked for ${selectedClub}:`, booking);
        }}
      />
    </div>
  );
}

/**
 * Example 3: Programmatic availability checking before booking
 */
import { checkVenueAvailability } from './utils/availabilityChecker.js';
import { generateTimeSlots } from './utils/timeSlots.js';

export function CheckAvailabilityBeforeBooking() {
  const [result, setResult] = useState(null);

  const checkSlot = () => {
    // Check if Main Auditorium (venue 1) is available on 2026-07-05 at 09:30
    const availability = checkVenueAvailability(
      1,                // venueId
      '2026-07-05',    // date
      '09:30',         // startTime
      '10:20'          // endTime
    );

    setResult(availability);
  };

  return (
    <div>
      <button onClick={checkSlot}>Check Availability</button>
      {result && (
        <div>
          <h4>{result.available ? '✅ Available' : '❌ Not Available'}</h4>
          <p>{result.message}</p>
          {result.conflictingBookings.length > 0 && (
            <div>
              <h5>Conflicting Bookings:</h5>
              {result.conflictingBookings.map((booking, idx) => (
                <div key={idx}>
                  {booking.eventName} - {booking.hostClub}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Example 4: Display time slots for a venue
 */
export function DisplayAvailableSlots() {
  const [venueId] = useState(1);
  const [date] = useState('2026-07-05');
  
  const allSlots = generateTimeSlots();
  const { getAvailableSlots } = require('./utils/availabilityChecker.js');
  const availableSlots = getAvailableSlots(venueId, date, allSlots);

  return (
    <div>
      <h3>Available Slots for {date}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {availableSlots.map((slot, idx) => (
          <div
            key={idx}
            style={{
              padding: '12px',
              border: '2px solid #10b981',
              borderRadius: '6px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: '#f0fdf4',
              color: '#166534'
            }}
          >
            {slot.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Example 5: Quick booking card for clubs
 */
export function QuickBookingCard({ clubName, venueId }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div style={{
        backgroundColor: '#f3f4f6',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <h4>{clubName}</h4>
        <p style={{ margin: '8px 0', color: '#6b7280', fontSize: '14px' }}>
          Need a venue for your next event?
        </p>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            padding: '10px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Book Now
        </button>
      </div>

      <VenueBookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onBookingSuccess={(booking) => {
          console.log('Booking successful:', booking);
          // Show success notification
        }}
      />
    </>
  );
}

/**
 * Example 6: Using in a modal/wizard flow
 */
export function EventCreationWizard({ step, onStepChange }) {
  const [isVenueBookingOpen, setIsVenueBookingOpen] = useState(false);
  const [bookedVenue, setBookedVenue] = useState(null);

  const handleVenueBooked = (booking) => {
    setBookedVenue(booking);
    onStepChange('next'); // Move to next step in wizard
  };

  if (step !== 'venue-booking') {
    return null;
  }

  return (
    <div>
      {!bookedVenue ? (
        <>
          <h2>Step 1: Book a Venue</h2>
          <p>First, select and book a venue for your event.</p>
          <button onClick={() => setIsVenueBookingOpen(true)}>
            Open Venue Booking
          </button>

          <VenueBookingModal
            isOpen={isVenueBookingOpen}
            onClose={() => setIsVenueBookingOpen(false)}
            onBookingSuccess={handleVenueBooked}
          />
        </>
      ) : (
        <div style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '8px' }}>
          <h3>✓ Venue Booked!</h3>
          <p>Event: {bookedVenue.eventName}</p>
          <p>Date: {bookedVenue.date}</p>
          <p>Time: {bookedVenue.startTime} - {bookedVenue.endTime}</p>
          <button onClick={() => onStepChange('next')}>Continue to Next Step</button>
        </div>
      )}
    </div>
  );
}

/**
 * Example 7: In ClubsSection - Add booking option to club cards
 */
export function ClubCardWithBooking({ club }) {
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  return (
    <>
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px'
      }}>
        <h3>{club.name}</h3>
        <p>{club.tagline}</p>
        <button onClick={() => setIsBookingOpen(true)}>
          📅 Book a Venue for {club.name}
        </button>
      </div>

      <VenueBookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        onBookingSuccess={(booking) => {
          console.log(`${club.name} booked a venue!`);
        }}
      />
    </>
  );
}

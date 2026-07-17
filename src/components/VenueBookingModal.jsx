import React, { useState, useMemo } from 'react';
import { venues } from '../data/venues.js';
import { addBooking } from '../data/bookings.js';
import { generateTimeSlots, convertTo12HourFormat } from '../utils/timeSlots.js';
import { checkMultipleSlotAvailability, getAvailableSlots, getBookedSlots } from '../utils/availabilityChecker.js';
import './VenueBookingModal.css';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export default function VenueBookingModal({ isOpen, onClose, onBookingSuccess }) {
  const [selectedVenue, setSelectedVenue] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlots, setSelectedSlots] = useState([]); // Multiple slots
  const [eventName, setEventName] = useState('');
  const [hostClub, setHostClub] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');

  const allTimeSlots = useMemo(() => generateTimeSlots(), []);

  // Get venue details
  const venueDetails = selectedVenue ? venues.find(v => v.id === parseInt(selectedVenue)) : null;

  // Get available time slots for selected venue and date
  const availableSlots = useMemo(() => {
    if (!selectedVenue || !selectedDate) return [];
    return getAvailableSlots(parseInt(selectedVenue), selectedDate, allTimeSlots);
  }, [selectedVenue, selectedDate, allTimeSlots]);

  // Get booked slots
  const bookedSlots = useMemo(() => {
    if (!selectedVenue || !selectedDate) return [];
    return getBookedSlots(parseInt(selectedVenue), selectedDate);
  }, [selectedVenue, selectedDate]);

  // Check current slots availability
  const slotsAvailability = useMemo(() => {
    if (!selectedVenue || !selectedDate || selectedSlots.length === 0) return null;
    const slotsToCheck = allTimeSlots.filter(s => selectedSlots.includes(s.startTime));
    return checkMultipleSlotAvailability(parseInt(selectedVenue), selectedDate, slotsToCheck);
  }, [selectedVenue, selectedDate, selectedSlots, allTimeSlots]);

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Toggle slot selection
  const toggleSlotSelection = (startTime) => {
    setSelectedSlots(prev => {
      if (prev.includes(startTime)) {
        return prev.filter(s => s !== startTime);
      } else {
        return [...prev, startTime].sort();
      }
    });
    setBookingError('');
  };

  // Check if slots are consecutive
  const areSlotConsecutive = (slots) => {
    if (slots.length <= 1) return true;
    const sortedSlots = slots.sort();
    for (let i = 0; i < sortedSlots.length - 1; i++) {
      const currentSlot = allTimeSlots.find(s => s.startTime === sortedSlots[i]);
      const nextSlot = allTimeSlots.find(s => s.startTime === sortedSlots[i + 1]);
      if (!currentSlot || !nextSlot) return false;
      if (currentSlot.endTime !== nextSlot.startTime) return false;
    }
    return true;
  };

  const handleBooking = (e) => {
    e.preventDefault();
    setBookingError('');
    setBookingSuccess('');

    // Validation
    if (!selectedVenue || !selectedDate || selectedSlots.length === 0 || !eventName || !hostClub) {
      setBookingError('Please select venue, date, at least one time slot, and enter event details');
      return;
    }

    // Check if slots are consecutive
    if (!areSlotConsecutive(selectedSlots)) {
      setBookingError('Selected time slots must be consecutive');
      return;
    }

    // Check availability
    if (!slotsAvailability || !slotsAvailability.available) {
      setBookingError(slotsAvailability?.message || 'Selected time slots are not available');
      return;
    }

    // Create booking with multiple slots
    try {
      const slotsData = allTimeSlots.filter(s => selectedSlots.includes(s.startTime));
      const firstSlot = slotsData[0];
      const lastSlot = slotsData[slotsData.length - 1];

      const booking = addBooking({
        venueId: parseInt(selectedVenue),
        date: selectedDate,
        timeSlots: slotsData.map(s => ({ startTime: s.startTime, endTime: s.endTime })),
        eventName,
        hostClub
      });

      const durationMins = selectedSlots.length * 50;
      const durationHours = Math.floor(durationMins / 60);
      const durationRemainingMins = durationMins % 60;
      const durationStr = durationHours > 0 
        ? `${durationHours}h ${durationRemainingMins}m`
        : `${durationMins}m`;

      setBookingSuccess(`✓ Event "${eventName}" successfully booked at ${venueDetails.name} on ${selectedDate} from ${convertTo12HourFormat(firstSlot.startTime)} to ${convertTo12HourFormat(lastSlot.endTime)} (${durationStr})`);

      // Reset form
      setSelectedVenue('');
      setSelectedDate('');
      setSelectedSlots([]);
      setEventName('');
      setHostClub('');

      // Call success callback if provided
      if (onBookingSuccess) {
        onBookingSuccess(booking);
      }

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        setBookingSuccess('');
      }, 2000);
    } catch (error) {
      setBookingError('Failed to create booking. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="booking-modal-overlay" onClick={onClose}>
      <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="booking-modal-header">
          <h2>Book a Venue</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Messages */}
        {bookingSuccess && (
          <div className="success-message">
            <CheckCircle size={18} style={{ display: 'inline-block', marginRight: '8px' }} />
            {bookingSuccess}
          </div>
        )}
        {bookingError && (
          <div className="error-message">
            <AlertCircle size={18} style={{ display: 'inline-block', marginRight: '8px' }} />
            {bookingError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleBooking}>
          {/* Venue Selection */}
          <div className="booking-form-group">
            <label htmlFor="venue">Select Venue *</label>
            <select
              id="venue"
              value={selectedVenue}
              onChange={(e) => {
                setSelectedVenue(e.target.value);
                setSelectedSlots([]);
                setBookingError('');
              }}
            >
              <option value="">-- Choose a venue --</option>
              {venues.map(venue => (
                <option key={venue.id} value={venue.id}>
                  {venue.name} (Capacity: {venue.capacity})
                </option>
              ))}
            </select>
          </div>

          {/* Venue Details */}
          {venueDetails && (
            <div className="venue-details-card">
              <h3>{venueDetails.name}</h3>
              <div className="venue-info-grid">
                <div className="venue-info-item">
                  <strong>Capacity</strong>
                  <span>{venueDetails.capacity} persons</span>
                </div>
                <div className="venue-info-item">
                  <strong>Location</strong>
                  <span>{venueDetails.location}</span>
                </div>
                <div className="venue-info-item">
                  <strong>Contact Person</strong>
                  <span>{venueDetails.contactPerson}</span>
                </div>
                <div className="venue-info-item">
                  <strong>Phone</strong>
                  <span>{venueDetails.contactPhone}</span>
                </div>
              </div>
              <div className="venue-facilities">
                <strong style={{ display: 'block', marginBottom: '8px' }}>Facilities:</strong>
                <div className="venue-facilities-list">
                  {venueDetails.facilities.map((facility, idx) => (
                    <span key={idx} className="facility-badge">{facility}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Date Selection */}
          <div className="booking-form-group">
            <label htmlFor="date">Select Date *</label>
            <input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedSlots([]);
                setBookingError('');
              }}
              min={getMinDate()}
            />
          </div>

          {/* Time Slots Selection */}
          {selectedDate && selectedVenue && (
            <>
              <div className="time-slots-info">
                <p><strong>📌 Select one or more consecutive time slots (50 min each)</strong></p>
              </div>

              <div className="available-slots">
                <h4>✓ Available Time Slots</h4>
                <div className="slots-grid">
                  {availableSlots.length > 0 ? (
                    availableSlots.map((slot, idx) => (
                      <div
                        key={idx}
                        className={`slot-badge ${selectedSlots.includes(slot.startTime) ? 'selected' : ''}`}
                        onClick={() => toggleSlotSelection(slot.startTime)}
                        style={{ cursor: 'pointer' }}
                      >
                        {convertTo12HourFormat(slot.startTime)}
                      </div>
                    ))
                  ) : (
                    <div style={{ color: '#6b7280', fontSize: '13px' }}>No available slots for this date</div>
                  )}
                </div>
              </div>

              {/* Selected Slots Summary */}
              {selectedSlots.length > 0 && (
                <div className="selected-slots-summary">
                  <h4>📋 Selected Slots</h4>
                  <div className="selected-slots-list">
                    {selectedSlots.map((startTime, idx) => {
                      const slot = allTimeSlots.find(s => s.startTime === startTime);
                      return (
                        <div key={idx} className="selected-slot-item">
                          <span>{convertTo12HourFormat(slot.startTime)} - {convertTo12HourFormat(slot.endTime)}</span>
                          <button
                            type="button"
                            className="remove-slot-btn"
                            onClick={() => toggleSlotSelection(startTime)}
                            title="Remove this slot"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="slots-duration">
                    Total Duration: <strong>{selectedSlots.length * 50} minutes</strong>
                  </div>
                </div>
              )}

              {/* Booked Slots */}
              {bookedSlots.length > 0 && (
                <div className="booked-slots">
                  <h4>✗ Booked Time Slots</h4>
                  {bookedSlots.map((slot, idx) => (
                    <div key={idx} className="booking-item">
                      <div className="time">{convertTo12HourFormat(slot.startTime)} - {convertTo12HourFormat(slot.endTime)}</div>
                      <div className="event">{slot.eventName} by {slot.hostClub}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Availability Status */}
          {selectedSlots.length > 0 && slotsAvailability && (
            <div className={`availability-status ${slotsAvailability.available ? 'available' : 'unavailable'}`}>
              {slotsAvailability.available ? (
                <>
                  <CheckCircle size={18} />
                  <span>{slotsAvailability.message}</span>
                </>
              ) : (
                <>
                  <AlertCircle size={18} />
                  <span>{slotsAvailability.message}</span>
                </>
              )}
            </div>
          )}

          {/* Event Name */}
          <div className="booking-form-group">
            <label htmlFor="eventName">Event Name *</label>
            <input
              id="eventName"
              type="text"
              placeholder="e.g., Tech Talk on AI, Workshop: DSA Basics"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Host Club */}
          <div className="booking-form-group">
            <label htmlFor="hostClub">Host Club/Organization *</label>
            <input
              id="hostClub"
              type="text"
              placeholder="e.g., #DEFINE, IEEE, WIE"
              value={hostClub}
              onChange={(e) => setHostClub(e.target.value)}
              maxLength={50}
            />
          </div>

          {/* Actions */}
          <div className="booking-actions">
            <button type="submit" className="btn btn-primary">
              Confirm Booking
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

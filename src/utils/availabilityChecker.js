// Venue availability checker utility
import { getBookingsForVenueAndDate } from '../data/bookings.js';
import { doTimeSlotsOverlap } from './timeSlots.js';

/**
 * Check if a time slot is booked by any existing booking
 * @param {Array} existingBookings - Bookings for a venue/date
 * @param {string} startTime - Slot start time (HH:MM)
 * @param {string} endTime - Slot end time (HH:MM)
 * @returns {Booking|null} - Conflicting booking or null
 */
const findConflictingBooking = (existingBookings, startTime, endTime) => {
  return existingBookings.find(booking => {
    return booking.timeSlots.some(slot => doTimeSlotsOverlap(
      { startTime, endTime },
      { startTime: slot.startTime, endTime: slot.endTime }
    ));
  });
};

/**
 * Check if multiple time slots are available
 * @param {number} venueId - The venue ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Array} slots - Array of slots {startTime, endTime}
 * @returns {Object} {available: boolean, message: string, conflictingBookings: Array}
 */
export const checkMultipleSlotAvailability = (venueId, date, slots) => {
  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedDate < today) {
    return {
      available: false,
      message: "Cannot book for past dates",
      conflictingBookings: []
    };
  }

  const existingBookings = getBookingsForVenueAndDate(venueId, date);
  const activeBookings = existingBookings.filter(b => b.status !== 'cancelled');

  if (activeBookings.length === 0) {
    return {
      available: true,
      message: `All ${slots.length} time slot(s) available`,
      conflictingBookings: []
    };
  }

  // Check each slot for conflicts
  const conflicts = [];
  for (const slot of slots) {
    const conflict = findConflictingBooking(activeBookings, slot.startTime, slot.endTime);
    if (conflict && !conflicts.find(c => c.id === conflict.id)) {
      conflicts.push(conflict);
    }
  }

  if (conflicts.length > 0) {
    return {
      available: false,
      message: `${conflicts.length} of your selected slot(s) conflict with existing bookings`,
      conflictingBookings: conflicts
    };
  }

  return {
    available: true,
    message: `All ${slots.length} time slot(s) available`,
    conflictingBookings: []
  };
};

/**
 * Get available time slots for a venue on a specific date
 * @param {number} venueId - The venue ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Array} allTimeSlots - All possible time slots for the day
 * @returns {Array} Available time slots
 */
export const getAvailableSlots = (venueId, date, allTimeSlots) => {
  const bookings = getBookingsForVenueAndDate(venueId, date);
  const activeBookings = bookings.filter(b => b.status !== 'cancelled');

  return allTimeSlots.filter(slot => {
    const isAvailable = !activeBookings.some(booking => {
      const existingSlot = {
        startTime: booking.startTime,
        endTime: booking.endTime
      };
      return doTimeSlotsOverlap(slot, existingSlot);
    });
    return isAvailable;
  });
};

/**
 * Get booked slots for a venue on a specific date
 * @param {number} venueId - The venue ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Array} Booked slots
 */
export const getBookedSlots = (venueId, date) => {
  const bookings = getBookingsForVenueAndDate(venueId, date);
  return bookings.filter(b => b.status !== 'cancelled').map(b => ({
    startTime: b.startTime,
    endTime: b.endTime,
    eventName: b.eventName,
    hostClub: b.hostClub
  }));
};

// Quick Reference: Venue Booking System API
// Use this guide for rapid development and integration

// ============================================
// 1. GENERATE TIME SLOTS
// ============================================
import { generateTimeSlots, convertTo12HourFormat } from './utils/timeSlots.js';

// Get all time slots for a day (9:30 AM - 5 PM, 50-min each)
const slots = generateTimeSlots();
// [
//   { startTime: "09:30", endTime: "10:20", label: "09:30 - 10:20", ... },
//   { startTime: "10:20", endTime: "11:10", label: "10:20 - 11:10", ... },
//   ...
// ]

// Convert 24-hour time to 12-hour format
convertTo12HourFormat("14:30"); // Returns "02:30 PM"


// ============================================
// 2. CHECK VENUE AVAILABILITY
// ============================================
import { checkVenueAvailability } from './utils/availabilityChecker.js';

// Check if specific slot is available
const availability = checkVenueAvailability(
  1,              // venueId
  '2026-07-10',  // date (YYYY-MM-DD)
  '09:30',       // startTime (HH:MM)
  '10:20'        // endTime (HH:MM)
);
// Returns: {
//   available: true,
//   message: "Venue is available for this time slot",
//   conflictingBookings: []
// }


// ============================================
// 3. GET AVAILABLE SLOTS FOR A VENUE
// ============================================
import { getAvailableSlots } from './utils/availabilityChecker.js';

const availableSlots = getAvailableSlots(
  1,                        // venueId
  '2026-07-10',            // date
  generateTimeSlots()      // all time slots
);
// Returns only slots that are not booked


// ============================================
// 4. GET BOOKED SLOTS FOR A VENUE
// ============================================
import { getBookedSlots } from './utils/availabilityChecker.js';

const bookedSlots = getBookedSlots(1, '2026-07-10');
// [
//   {
//     startTime: "09:30",
//     endTime: "10:20",
//     eventName: "Tech Talk on AI",
//     hostClub: "#DEFINE"
//   },
//   ...
// ]


// ============================================
// 5. CREATE A NEW BOOKING
// ============================================
import { addBooking } from './data/bookings.js';

const newBooking = addBooking({
  venueId: 1,
  date: '2026-07-10',
  startTime: '09:30',
  endTime: '10:20',
  eventName: 'Tech Talk on AI',
  hostClub: '#DEFINE'
});
// Returns: {
//   id: 5,
//   venueId: 1,
//   date: '2026-07-10',
//   startTime: '09:30',
//   endTime: '10:20',
//   eventName: 'Tech Talk on AI',
//   hostClub: '#DEFINE',
//   status: 'confirmed'
// }


// ============================================
// 6. GET BOOKINGS FOR A VENUE
// ============================================
import { getBookingsForVenueAndDate } from './data/bookings.js';

const bookings = getBookingsForVenueAndDate(1, '2026-07-10');
// Returns all bookings for venue 1 on 2026-07-10


// ============================================
// 7. GET ALL BOOKINGS
// ============================================
import { getAllBookings } from './data/bookings.js';

const allBookings = getAllBookings();
// Returns all bookings across all venues


// ============================================
// 8. CANCEL A BOOKING
// ============================================
import { cancelBooking } from './data/bookings.js';

cancelBooking(5); // bookingId
// Sets the booking status to 'cancelled'


// ============================================
// 9. FULL BOOKING WORKFLOW
// ============================================

import {
  generateTimeSlots,
  convertTo12HourFormat
} from './utils/timeSlots.js';
import {
  checkVenueAvailability,
  getAvailableSlots,
  getBookedSlots
} from './utils/availabilityChecker.js';
import {
  addBooking,
  getBookingsForVenueAndDate
} from './data/bookings.js';
import { venues } from './data/venues.js';

function completeBookingFlow(venueId, date, startTime, endTime, eventName, hostClub) {
  // Step 1: Validate inputs
  if (!venueId || !date || !startTime || !endTime) {
    return { success: false, message: 'Missing required fields' };
  }

  // Step 2: Check availability
  const availability = checkVenueAvailability(venueId, date, startTime, endTime);
  if (!availability.available) {
    return { success: false, message: availability.message };
  }

  // Step 3: Get venue details
  const venue = venues.find(v => v.id === venueId);
  if (!venue) {
    return { success: false, message: 'Venue not found' };
  }

  // Step 4: Create booking
  try {
    const booking = addBooking({
      venueId,
      date,
      startTime,
      endTime,
      eventName,
      hostClub
    });

    return {
      success: true,
      message: `Event "${eventName}" booked at ${venue.name}`,
      booking
    };
  } catch (error) {
    return { success: false, message: 'Booking creation failed' };
  }
}

// Usage:
const result = completeBookingFlow(
  1,
  '2026-07-10',
  '09:30',
  '10:20',
  'Tech Talk',
  '#DEFINE'
);
console.log(result);


// ============================================
// 10. VALIDATE VENUE BEFORE BOOKING
// ============================================

function validateAndBookVenue(venueId, date, startTime, endTime, eventName, hostClub) {
  // Check if venue exists
  const venue = venues.find(v => v.id === venueId);
  if (!venue) {
    return { success: false, error: 'Venue not found' };
  }

  // Check if date is valid (not in past)
  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (selectedDate < today) {
    return { success: false, error: 'Cannot book for past dates' };
  }

  // Check availability
  const availability = checkVenueAvailability(venueId, date, startTime, endTime);
  if (!availability.available) {
    return {
      success: false,
      error: availability.message,
      conflicts: availability.conflictingBookings
    };
  }

  // Create booking
  const booking = addBooking({ venueId, date, startTime, endTime, eventName, hostClub });
  return { success: true, booking };
}


// ============================================
// 11. GET VENUE DASHBOARD DATA
// ============================================

function getVenueStats(venueId, date) {
  const allSlots = generateTimeSlots();
  const available = getAvailableSlots(venueId, date, allSlots);
  const booked = getBookedSlots(venueId, date);
  const allBookings = getBookingsForVenueAndDate(venueId, date);

  return {
    totalSlots: allSlots.length,
    availableSlots: available.length,
    bookedSlots: booked.length,
    occupancyPercentage: Math.round((booked.length / allSlots.length) * 100),
    bookingDetails: allBookings
  };
}

// Usage:
const stats = getVenueStats(1, '2026-07-10');
console.log(`Main Auditorium: ${stats.occupancyPercentage}% booked`);


// ============================================
// 12. TIME SLOT HELPER FUNCTIONS
// ============================================

// Check if two slots overlap
import { doTimeSlotsOverlap } from './utils/timeSlots.js';

const overlap = doTimeSlotsOverlap(
  { startTime: '09:30', endTime: '10:20' },
  { startTime: '10:10', endTime: '11:00' }
); // true (they overlap)


// ============================================
// COMMON PATTERNS
// ============================================

// Pattern 1: Show available slots for venue selection
async function showAvailableSlotsForVenue(venueId, date) {
  const allSlots = generateTimeSlots();
  const available = getAvailableSlots(venueId, date, allSlots);
  
  return available.map(slot => ({
    displayText: `${convertTo12HourFormat(slot.startTime)} - ${convertTo12HourFormat(slot.endTime)}`,
    value: slot.startTime
  }));
}

// Pattern 2: Highlight unavailable slots
async function getUnavailableSlots(venueId, date) {
  const allSlots = generateTimeSlots();
  const available = getAvailableSlots(venueId, date, allSlots);
  return allSlots.filter(slot => !available.includes(slot));
}

// Pattern 3: Get venue occupancy for day
async function getVenueOccupancy(venueId, date) {
  const allSlots = generateTimeSlots();
  const booked = getBookedSlots(venueId, date);
  const occupancy = (booked.length / allSlots.length) * 100;
  return {
    total: allSlots.length,
    booked: booked.length,
    available: allSlots.length - booked.length,
    percentage: occupancy.toFixed(1)
  };
}

// Pattern 4: Find free slots for next N days
function getAvailableSlotsForNextDays(venueId, daysCount = 7) {
  const results = {};
  const today = new Date();
  
  for (let i = 0; i < daysCount; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    const allSlots = generateTimeSlots();
    const available = getAvailableSlots(venueId, dateStr, allSlots);
    
    if (available.length > 0) {
      results[dateStr] = available;
    }
  }
  
  return results;
}

// Pattern 5: Get first available slot
function getFirstAvailableSlot(venueId, startDate) {
  const allSlots = generateTimeSlots();
  let currentDate = new Date(startDate);
  
  for (let i = 0; i < 30; i++) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const available = getAvailableSlots(venueId, dateStr, allSlots);
    
    if (available.length > 0) {
      return {
        date: dateStr,
        slot: available[0]
      };
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return null; // No slots available in next 30 days
}


// ============================================
// ERROR HANDLING
// ============================================

async function safeBookingOperation(venueId, date, startTime, endTime, eventName, hostClub) {
  try {
    // Validate all inputs
    if (!venueId || !date || !startTime || !endTime || !eventName || !hostClub) {
      throw new Error('Missing required booking information');
    }

    // Check venue exists
    const venue = venues.find(v => v.id === venueId);
    if (!venue) {
      throw new Error('Venue not found');
    }

    // Check availability
    const availability = checkVenueAvailability(venueId, date, startTime, endTime);
    if (!availability.available) {
      throw new Error(availability.message);
    }

    // Create booking
    const booking = addBooking({
      venueId,
      date,
      startTime,
      endTime,
      eventName,
      hostClub
    });

    return {
      success: true,
      booking,
      message: 'Booking created successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export default {
  // Utilities
  generateTimeSlots,
  convertTo12HourFormat,
  doTimeSlotsOverlap,
  
  // Availability
  checkVenueAvailability,
  getAvailableSlots,
  getBookedSlots,
  
  // Bookings
  addBooking,
  getBookingsForVenueAndDate,
  getAllBookings,
  cancelBooking,
  
  // Helpers
  completeBookingFlow,
  validateAndBookVenue,
  getVenueStats,
  getVenueOccupancy,
  getAvailableSlotsForNextDays,
  getFirstAvailableSlot,
  safeBookingOperation
};

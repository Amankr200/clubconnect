// Venue bookings data
// Structure: { venueId, date, timeSlots: [{startTime, endTime}], eventName, hostClub, status }
export let venueBookings = [
  {
    id: 1,
    venueId: 1,
    date: "2026-07-05",
    timeSlots: [
      { startTime: "09:30", endTime: "10:20" }
    ],
    eventName: "Tech Talk on AI",
    hostClub: "#DEFINE",
    status: "confirmed"
  },
  {
    id: 2,
    venueId: 1,
    date: "2026-07-05",
    timeSlots: [
      { startTime: "14:00", endTime: "14:50" }
    ],
    eventName: "Club Meeting",
    hostClub: "IEEE",
    status: "confirmed"
  },
  {
    id: 3,
    venueId: 2,
    date: "2026-07-06",
    timeSlots: [
      { startTime: "10:20", endTime: "11:10" }
    ],
    eventName: "Workshop: DSA Basics",
    hostClub: "#DEFINE",
    status: "confirmed"
  },
  {
    id: 4,
    venueId: 3,
    date: "2026-07-06",
    timeSlots: [
      { startTime: "11:10", endTime: "12:00" }
    ],
    eventName: "Career Talk",
    hostClub: "WIE",
    status: "confirmed"
  }
];

// Function to add a new booking (supports multiple time slots)
export const addBooking = (booking) => {
  const newBooking = {
    id: venueBookings.length + 1,
    ...booking,
    status: "confirmed",
    timeSlots: booking.timeSlots || [{ startTime: booking.startTime, endTime: booking.endTime }]
  };
  venueBookings.push(newBooking);
  return newBooking;
};

// Function to get bookings for a specific venue and date
export const getBookingsForVenueAndDate = (venueId, date) => {
  return venueBookings.filter(
    booking => booking.venueId === venueId && booking.date === date
  );
};

// Function to cancel a booking
export const cancelBooking = (bookingId) => {
  const index = venueBookings.findIndex(b => b.id === bookingId);
  if (index > -1) {
    venueBookings[index].status = "cancelled";
  }
};

// Function to get all bookings
export const getAllBookings = () => {
  return venueBookings;
};

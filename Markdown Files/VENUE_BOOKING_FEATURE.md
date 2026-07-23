# Venue Availability Checking Feature

## Overview
This feature allows clubs and organizations to book campus venues for their events. The system checks real-time availability and prevents double-booking of venues.

## Features

### ✅ Core Features
- **Real-time Availability Checking**: Instantly checks if a venue is available for selected date and time
- **50-Minute Time Slots**: Automatic slot generation (9:30 AM - 5:00 PM)
- **Conflict Prevention**: Prevents overbooking through overlap detection
- **Venue Management**: 6 campus venues with detailed information
- **Interactive UI**: User-friendly modal with visual feedback
- **Booking Confirmation**: Immediate confirmation with booking details

### 🎨 UI Components
- **VenueBookingModal.jsx**: Main modal component for booking
- **VenueBookingPage.jsx**: Demo page showing all bookings

### 📦 Data & Utilities
- **venues.js**: Venue database with capacity, facilities, and contact info
- **bookings.js**: Booking data store with CRUD operations
- **timeSlots.js**: Time slot generation and formatting utilities
- **availabilityChecker.js**: Core availability checking logic

---

## Time Slot Configuration

### Working Hours
- **Start**: 9:30 AM
- **End**: 5:00 PM (17:00)
- **Slot Duration**: 50 minutes
- **Gap Between Slots**: 0 minutes (back-to-back)

### Generated Time Slots
```
09:30 - 10:20
10:20 - 11:10
11:10 - 12:00
12:00 - 12:50
12:50 - 13:40 (1:40 PM)
13:40 - 14:30 (2:30 PM)
14:30 - 15:20 (3:20 PM)
15:20 - 16:10 (4:10 PM)
16:10 - 17:00 (5:00 PM)
```
**Total Slots per Day**: 9

---

## Available Venues

| Venue | Capacity | Location | Facilities |
|-------|----------|----------|------------|
| Main Auditorium | 500 | Building A, Ground Floor | Projector, Sound System, Stage, Lighting, AC |
| Seminar Hall A | 150 | Building B, 1st Floor | Whiteboard, Projector, Sound System, AC |
| Seminar Hall B | 150 | Building B, 2nd Floor | Whiteboard, Projector, Sound System, AC |
| Conference Room 1 | 50 | Building C, 3rd Floor | Conference Table, Whiteboard, AC |
| Open Air Theatre | 300 | Sports Complex | Stage, Lighting, Sound System, Seating |
| Innovation Lab | 100 | Building D, Ground Floor | WiFi, Power Outlets, Projector, AC, Tables |

---

## API Usage

### 1. Generate Time Slots
```javascript
import { generateTimeSlots } from './utils/timeSlots.js';

const slots = generateTimeSlots();
// Returns array of slot objects with startTime, endTime, label
```

### 2. Check Venue Availability
```javascript
import { checkVenueAvailability } from './utils/availabilityChecker.js';

const result = checkVenueAvailability(
  1,                    // venueId
  '2026-07-10',        // date (YYYY-MM-DD)
  '09:30',             // startTime (HH:MM)
  '10:20'              // endTime (HH:MM)
);

// Returns: {
//   available: true/false,
//   message: string,
//   conflictingBookings: Array
// }
```

### 3. Get Available Slots for a Venue
```javascript
import { getAvailableSlots } from './utils/availabilityChecker.js';
import { generateTimeSlots } from './utils/timeSlots.js';

const allSlots = generateTimeSlots();
const available = getAvailableSlots(1, '2026-07-10', allSlots);
// Returns only available slots for that venue and date
```

### 4. Create a Booking
```javascript
import { addBooking } from './data/bookings.js';

const booking = addBooking({
  venueId: 1,
  date: '2026-07-10',
  startTime: '09:30',
  endTime: '10:20',
  eventName: 'Tech Talk on AI',
  hostClub: '#DEFINE'
});
```

### 5. Get Bookings for a Venue
```javascript
import { getBookingsForVenueAndDate } from './data/bookings.js';

const bookings = getBookingsForVenueAndDate(1, '2026-07-10');
// Returns all bookings for that venue on that date
```

---

## Booking Workflow

### User Flow
1. User clicks "Book a Venue" button
2. Selects a venue from dropdown
   - System displays venue details (capacity, facilities, contact)
3. Selects a date
   - System shows available and booked slots for that date
4. Selects a time slot
   - System validates availability in real-time
5. Enters event details:
   - Event Name
   - Host Club/Organization
6. Confirms booking
   - System checks final availability
   - If available: Booking confirmed with details
   - If unavailable: Error message with conflicting bookings shown
7. Receives confirmation or sees error

### Conflict Handling
If a booking conflicts with an existing one:
- ❌ Error message displayed
- Details of conflicting bookings shown
- User can select a different time slot
- System prevents booking creation

### Validation Rules
- ✅ Only future dates can be booked (no past dates)
- ✅ All fields are required
- ✅ Time slot duration is fixed at 50 minutes
- ✅ No overlapping bookings allowed
- ✅ Cancelled bookings don't block availability

---

## Data Structure

### Venue Object
```javascript
{
  id: number,
  name: string,
  capacity: number,
  description: string,
  facilities: string[],
  location: string,
  contactPerson: string,
  contactPhone: string
}
```

### Booking Object
```javascript
{
  id: number,
  venueId: number,
  date: string,           // YYYY-MM-DD
  startTime: string,      // HH:MM
  endTime: string,        // HH:MM
  eventName: string,
  hostClub: string,
  status: 'confirmed' | 'cancelled'
}
```

### Time Slot Object
```javascript
{
  startTime: string,      // HH:MM
  endTime: string,        // HH:MM
  label: string,          // "09:30 - 10:20"
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number
}
```

### Availability Check Result
```javascript
{
  available: boolean,
  message: string,
  conflictingBookings: Booking[]
}
```

---

## Integration Examples

### Adding to App.jsx
```javascript
import VenueBookingPage from './pages/VenueBookingPage.jsx';

// In your routing setup:
<Route path="/venues" element={<VenueBookingPage />} />
```

### Using Modal Standalone
```javascript
import VenueBookingModal from './components/VenueBookingModal.jsx';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setIsOpen(true)}>Book</button>
      <VenueBookingModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onBookingSuccess={(booking) => {
          console.log('Booked:', booking);
        }}
      />
    </>
  );
}
```

### Checking Availability Programmatically
```javascript
import { checkVenueAvailability } from './utils/availabilityChecker.js';

const result = checkVenueAvailability(1, '2026-07-10', '09:30', '10:20');

if (result.available) {
  // Proceed with booking
  console.log('✅ Venue is available');
} else {
  // Show error
  console.log('❌', result.message);
  console.log('Conflicts:', result.conflictingBookings);
}
```

---

## Styling

### CSS Files
- **VenueBookingModal.css**: Modal and form styling
- **VenueBookingPage.css**: Booking page layout and list styling

### Color Scheme
- **Primary**: #3B82F6 (Blue)
- **Success**: #10B981 (Green)
- **Error**: #EF4444 (Red)
- **Neutral**: #6B7280 (Gray)

---

## Features Checklist

- [x] Time slot generation (50 min slots, 9:30 AM - 5 PM)
- [x] Venue database with 6 venues
- [x] Real-time availability checking
- [x] Conflict detection algorithm
- [x] Booking creation and storage
- [x] User-friendly modal interface
- [x] Visual feedback (available/booked slots)
- [x] Responsive design
- [x] Error handling
- [x] Booking confirmation
- [x] Past date validation
- [x] Booking list display

---

## Future Enhancements

1. **Persistent Database**: Replace in-memory bookings with backend storage
2. **User Authentication**: Link bookings to authenticated users
3. **Cancellation**: Allow users to cancel their own bookings
4. **Recurring Events**: Support recurring bookings
5. **Notifications**: Email/SMS notifications for bookings
6. **Approvals**: Admin approval workflow for bookings
7. **Search & Filter**: Advanced search by date range, venue, club
8. **Export**: Export bookings as PDF/CSV
9. **Capacity Management**: Validate event size against venue capacity
10. **Calendar View**: Integrated calendar showing all bookings

---

## Testing the Feature

1. Open the VenueBookingPage at `/venues`
2. Click "Book a Venue"
3. Select a venue (e.g., Main Auditorium)
4. Choose a date (e.g., 2026-07-05 or later)
5. View available and booked slots
6. Select an available time slot
7. Enter event name and host club
8. See confirmation or error message
9. Check the bookings list below

### Test Cases
- ✅ Book available slot
- ✅ Try to book an already booked slot (should fail)
- ✅ Try to book a past date (should fail)
- ✅ Change venue and see different availability
- ✅ Check modal closes after successful booking
- ✅ Verify 50-minute slot duration

---

## File Structure
```
src/
├── components/
│   ├── VenueBookingModal.jsx      # Main booking modal
│   └── VenueBookingModal.css      # Modal styles
├── pages/
│   ├── VenueBookingPage.jsx       # Demo/management page
│   └── VenueBookingPage.css       # Page styles
├── data/
│   ├── venues.js                  # Venue database
│   └── bookings.js                # Booking store & operations
└── utils/
    ├── timeSlots.js               # Slot generation & formatting
    └── availabilityChecker.js      # Availability logic
```

---

## Support & Documentation

For issues or questions:
1. Check the provided examples above
2. Review the inline code comments in utility files
3. Examine the component prop documentation
4. Test with the VenueBookingPage demo

Happy booking! 🎉

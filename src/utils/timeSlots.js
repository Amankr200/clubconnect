// Generate time slots for venue booking
// Slots: 50 minutes duration, starting from 9:30 AM to 5:00 PM

const START_HOUR = 9;
const START_MINUTE = 30;
const END_HOUR = 17; // 5 PM
const END_MINUTE = 0;
const SLOT_DURATION = 50; // minutes

/**
 * Generate all available time slots for a day
 * @returns {Array} Array of time slot objects {startTime, endTime, label}
 */
export const generateTimeSlots = () => {
  const slots = [];
  let currentHour = START_HOUR;
  let currentMinute = START_MINUTE;

  while (true) {
    // Calculate end time
    let endMinute = currentMinute + SLOT_DURATION;
    let endHour = currentHour;

    if (endMinute >= 60) {
      endHour += Math.floor(endMinute / 60);
      endMinute = endMinute % 60;
    }

    // Check if slot exceeds end time (5 PM)
    if (endHour > END_HOUR || (endHour === END_HOUR && endMinute > END_MINUTE)) {
      break;
    }

    const startTimeStr = formatTime(currentHour, currentMinute);
    const endTimeStr = formatTime(endHour, endMinute);

    slots.push({
      startTime: startTimeStr,
      endTime: endTimeStr,
      label: `${startTimeStr} - ${endTimeStr}`,
      startHour: currentHour,
      startMinute: currentMinute,
      endHour: endHour,
      endMinute: endMinute
    });

    // Move to next slot
    currentHour = endHour;
    currentMinute = endMinute;
  }

  return slots;
};

/**
 * Format time as HH:MM
 */
const formatTime = (hour, minute) => {
  const h = String(hour).padStart(2, '0');
  const m = String(minute).padStart(2, '0');
  return `${h}:${m}`;
};

/**
 * Convert 24-hour format to 12-hour format with AM/PM
 * @param {string} time - Time in HH:MM format
 * @returns {string} Time in 12-hour format (e.g., "09:30 AM")
 */
export const convertTo12HourFormat = (time) => {
  const [hour, minute] = time.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
};

/**
 * Check if two time slots overlap
 * @param {Object} slot1 - First slot {startTime, endTime}
 * @param {Object} slot2 - Second slot {startTime, endTime}
 * @returns {boolean} True if slots overlap
 */
export const doTimeSlotsOverlap = (slot1, slot2) => {
  const [h1Start, m1Start] = slot1.startTime.split(':').map(Number);
  const [h1End, m1End] = slot1.endTime.split(':').map(Number);
  const [h2Start, m2Start] = slot2.startTime.split(':').map(Number);
  const [h2End, m2End] = slot2.endTime.split(':').map(Number);

  const start1 = h1Start * 60 + m1Start;
  const end1 = h1End * 60 + m1End;
  const start2 = h2Start * 60 + m2Start;
  const end2 = h2End * 60 + m2End;

  return start1 < end2 && start2 < end1;
};

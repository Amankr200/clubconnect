const crypto = require('crypto');
const db = require('../db');

class EventPassError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function generatePassToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function ensureForRegistration(client, registrationId) {
  const token = generatePassToken();
  const inserted = await client.query(
    `INSERT INTO event_passes (registration_id, pass_token)
     VALUES ($1, $2)
     ON CONFLICT (registration_id) DO NOTHING
     RETURNING pass_token`,
    [registrationId, token],
  );

  if (inserted.rows[0]) return inserted.rows[0].pass_token;

  const existing = await client.query(
    'SELECT pass_token FROM event_passes WHERE registration_id = $1',
    [registrationId],
  );
  if (!existing.rows[0]) throw new Error('Unable to create or retrieve the event pass.');
  return existing.rows[0].pass_token;
}

function getAttendanceWindow(row) {
  let start = row.attendance_start_time ? new Date(row.attendance_start_time) : null;
  let end = row.attendance_end_time ? new Date(row.attendance_end_time) : null;
  const slots = Array.isArray(row.time_slots) ? row.time_slots : [];
  const firstSlot = slots[0];
  const lastSlot = slots[slots.length - 1];

  if ((!start || Number.isNaN(start.getTime())) && firstSlot?.startTime) {
    start = new Date(`${row.event_date}T${firstSlot.startTime}:00+05:30`);
  }
  if ((!end || Number.isNaN(end.getTime())) && lastSlot?.endTime) {
    end = new Date(`${row.event_date}T${lastSlot.endTime}:00+05:30`);
    if (!Number.isNaN(end.getTime())) end.setMinutes(end.getMinutes() + 10);
  }

  return {
    start: start && !Number.isNaN(start.getTime()) ? start : null,
    end: end && !Number.isNaN(end.getTime()) ? end : null,
  };
}

function getQrStatus(start, end, now = Date.now()) {
  if (!start || !end) return 'not_started';
  if (now < start.getTime()) return 'not_started';
  if (now > end.getTime()) return 'closed';
  return 'active';
}

function formatPass(row, includeToken = false) {
  const window = getAttendanceWindow(row);
  const qrStatus = getQrStatus(window.start, window.end);
  const pass = {
    registrationId: Number(row.registration_id),
    eventName: row.event_name,
    societyName: row.society_name || 'Society event',
    venue: row.venue_name || 'Venue to be announced',
    eventDate: row.event_date,
    registrationStatus: row.registration_status,
    attendanceStartTime: window.start?.toISOString() || null,
    attendanceEndTime: window.end?.toISOString() || null,
    qrActive: qrStatus === 'active',
    qrStatus,
  };

  if (includeToken && qrStatus === 'active') pass.passToken = row.pass_token;
  return pass;
}

async function getForStudent(registrationId, studentId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT
         registration.id AS registration_id,
         registration.registration_status,
         booking.id AS event_id,
         booking.event_name,
         booking.date AS event_date,
         booking.time_slots,
         booking.attendance_start_time,
         booking.attendance_end_time,
         venue.name AS venue_name,
         society.name AS society_name,
         pass.pass_token
       FROM event_registrations AS registration
       LEFT JOIN venue_bookings AS booking ON booking.id = registration.event_id
       LEFT JOIN venues AS venue ON venue.id = booking.venue_id
       LEFT JOIN societies AS society ON society.id = booking.host_club
       LEFT JOIN event_passes AS pass ON pass.registration_id = registration.id
       WHERE registration.id = $1 AND registration.student_id = $2
       FOR UPDATE OF registration`,
      [registrationId, studentId],
    );

    const row = result.rows[0];
    if (!row) throw new EventPassError('REGISTRATION_NOT_FOUND', 'Registration not found.');
    if (!row.event_id) throw new EventPassError('EVENT_NOT_FOUND', 'Event not found.');
    if (row.registration_status !== 'REGISTERED') {
      throw new EventPassError('REGISTRATION_INACTIVE', 'An active registration is required to view this pass.');
    }

    row.pass_token = row.pass_token || await ensureForRegistration(client, registrationId);
    await client.query('COMMIT');
    return formatPass(row, true);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function findAllForStudent(studentId) {
  const result = await db.query(
    `SELECT
       registration.id AS registration_id,
       registration.registration_status,
       booking.id AS event_id,
       booking.event_name,
       booking.date AS event_date,
       booking.time_slots,
       booking.attendance_start_time,
       booking.attendance_end_time,
       venue.name AS venue_name,
       society.name AS society_name
     FROM event_registrations AS registration
     JOIN event_passes AS pass ON pass.registration_id = registration.id
     JOIN venue_bookings AS booking ON booking.id = registration.event_id
     LEFT JOIN venues AS venue ON venue.id = booking.venue_id
     LEFT JOIN societies AS society ON society.id = booking.host_club
     WHERE registration.student_id = $1
       AND registration.registration_status = 'REGISTERED'
     ORDER BY booking.date ASC, registration.registered_at DESC`,
    [studentId],
  );

  return result.rows.map((row) => formatPass(row));
}

module.exports = {
  EventPassError,
  ensureForRegistration,
  getForStudent,
  findAllForStudent,
};

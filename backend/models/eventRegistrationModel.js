const db = require('../db');
const studentModel = require('./studentModel');
const eventPassModel = require('./eventPassModel');
const eventAttendanceModel = require('./eventAttendanceModel');

class RegistrationError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function formatRegistration(row) {
  return {
    id: row.id,
    eventId: row.event_id,
    title: row.event_name,
    date: row.event_date,
    time: row.event_time || 'Time not specified',
    venue: row.venue_name || 'Venue to be announced',
    societyName: row.society_name || 'Society event',
    registrationStatus: row.registration_status,
  };
}

async function register(eventId, studentId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const eventResult = await client.query(
      `SELECT
         vb.id,
         vb.event_name,
         vb.date AS event_date,
         vb.time_slots,
         vb.capacity,
         vb.registration_deadline,
         vb.status,
         v.name AS venue_name,
         s.name AS society_name
       FROM venue_bookings vb
       LEFT JOIN venues v ON v.id = vb.venue_id
       LEFT JOIN societies s ON s.id = vb.host_club
       WHERE vb.id = $1
      FOR UPDATE OF vb`,
      [eventId],
    );

    const event = eventResult.rows[0];
    if (!event) {
      throw new RegistrationError('EVENT_NOT_FOUND', 'Event not found.');
    }

    if (String(event.status).toLowerCase() !== 'approved') {
      throw new RegistrationError('EVENT_NOT_APPROVED', 'This event is not approved for registration.');
    }

    const eventStart = new Date(`${event.event_date}T${(event.time_slots?.[0]?.startTime || '00:00')}:00`).getTime();
    const registrationDeadline = event.registration_deadline ? new Date(event.registration_deadline).getTime() : eventStart;
    const effectiveDeadline = Math.min(registrationDeadline, eventStart);
    if (!Number.isFinite(effectiveDeadline) || effectiveDeadline <= Date.now()) {
      throw new RegistrationError('REGISTRATION_CLOSED', 'Registration is closed for this event.');
    }

    const existingResult = await client.query(
      `SELECT id, registration_status
       FROM event_registrations
       WHERE event_id = $1 AND student_id = $2
       FOR UPDATE`,
      [eventId, studentId],
    );

    const existing = existingResult.rows[0];
    if (existing && existing.registration_status === 'REGISTERED') {
      throw new RegistrationError('ALREADY_REGISTERED', 'You are already registered for this event.');
    }

    const countResult = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM event_registrations
       WHERE event_id = $1 AND registration_status = 'REGISTERED'`,
      [eventId],
    );

    if (event.capacity && Number(event.capacity) <= Number(countResult.rows[0].total)) {
      throw new RegistrationError('CAPACITY_REACHED', 'Registration is closed because this event is full.');
    }

    let registrationId = existing?.id;
    if (existing) {
      await client.query(
        `UPDATE event_registrations
         SET registration_status = 'REGISTERED', registered_at = CURRENT_TIMESTAMP, cancelled_at = NULL
         WHERE id = $1`,
        [existing.id],
      );
    } else {
      const inserted = await client.query(
        `INSERT INTO event_registrations (event_id, student_id, registration_status)
         VALUES ($1, $2, 'REGISTERED')
         RETURNING id`,
        [eventId, studentId],
      );
      registrationId = inserted.rows[0]?.id;
    }

    await eventPassModel.ensureForRegistration(client, registrationId);
    await eventAttendanceModel.ensureForRegistration(client, registrationId);

    const student = await studentModel.findById(studentId);

    await client.query('COMMIT');
    return {
      event,
      student: student && {
        id: student.enrollmentId,
        name: student.name,
        email: student.collegeEmailId,
      },
    };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error && error.code === '23505') {
      throw new RegistrationError('ALREADY_REGISTERED', 'You are already registered for this event.');
    }
    throw error;
  } finally {
    client.release();
  }
}

async function findForStudent(studentId) {
  const result = await db.query(
    `SELECT
       er.id,
       er.event_id,
       er.registration_status,
       vb.event_name,
       vb.date AS event_date,
       vb.time_slots,
       v.name AS venue_name,
      s.name AS society_name,
      attendance.attendance_status,
      attendance.attendance_marked_at
     FROM event_registrations er
     JOIN venue_bookings vb ON vb.id = er.event_id
     LEFT JOIN venues v ON v.id = vb.venue_id
     LEFT JOIN societies s ON s.id = vb.host_club
    LEFT JOIN event_attendance attendance ON attendance.registration_id = er.id
     WHERE er.student_id = $1
     ORDER BY vb.date ASC, er.registered_at DESC`,
    [studentId],
  );

  return result.rows.map((row) => {
    const slots = Array.isArray(row.time_slots) ? row.time_slots : [];
    const first = slots[0];
    const last = slots[slots.length - 1];
    const eventTime = first && last ? `${first.startTime} - ${last.endTime}` : 'Time not specified';

    return {
      id: row.id,
      eventId: row.event_id,
      title: row.event_name,
      date: row.event_date,
      time: eventTime,
      venue: row.venue_name || 'Venue to be announced',
      societyName: row.society_name || 'Society event',
      registrationStatus: row.registration_status,
      attendanceStatus: row.attendance_status === true ? 'PRESENT' : 'NOT_MARKED',
      attendanceTime: row.attendance_marked_at,
    };
  });
}

async function cancel(registrationId, studentId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const registrationResult = await client.query(
      `SELECT id, event_id
       FROM event_registrations
       WHERE id = $1 AND student_id = $2
       FOR UPDATE`,
      [registrationId, studentId],
    );

    const registration = registrationResult.rows[0];
    if (!registration) {
      throw new RegistrationError('REGISTRATION_NOT_FOUND', 'Registration not found.');
    }

    const eventResult = await client.query(
      `SELECT
         vb.id,
         vb.event_name,
         vb.date AS event_date,
         vb.time_slots,
         vb.registration_deadline,
         vb.status
       FROM venue_bookings vb
       WHERE vb.id = $1
       FOR UPDATE`,
      [registration.event_id],
    );

    const event = eventResult.rows[0];
    if (!event) {
      throw new RegistrationError('EVENT_NOT_FOUND', 'Event not found.');
    }

    const eventStart = new Date(`${event.event_date}T${(event.time_slots?.[0]?.startTime || '00:00')}:00`).getTime();
    const registrationDeadline = event.registration_deadline ? new Date(event.registration_deadline).getTime() : eventStart;
    const effectiveDeadline = Math.min(registrationDeadline, eventStart);
    if (!Number.isFinite(effectiveDeadline) || effectiveDeadline <= Date.now()) {
      throw new RegistrationError('REGISTRATION_CLOSED', 'Registration is closed for this event.');
    }

    const result = await client.query(
      `UPDATE event_registrations
       SET registration_status = 'CANCELLED', cancelled_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND student_id = $2 AND registration_status = 'REGISTERED'
       RETURNING id`,
      [registrationId, studentId],
    );

    if (result.rowCount === 0) {
      throw new RegistrationError('ALREADY_CANCELLED', 'This registration is already cancelled.');
    }

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  register,
  findForStudent,
  cancel,
  RegistrationError,
  formatRegistration,
};

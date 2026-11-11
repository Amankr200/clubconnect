const db = require('../db');

class FeedbackError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function parseInteger(value, fallback = null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function getEventEndTimestamp(eventRow) {
  if (eventRow?.attendance_end_time) {
    const parsed = new Date(eventRow.attendance_end_time);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const slots = Array.isArray(eventRow?.time_slots) ? eventRow.time_slots : [];
  const lastSlot = slots[slots.length - 1];
  if (!lastSlot?.endTime) return null;

  const end = new Date(`${eventRow.date}T${lastSlot.endTime}:00+05:30`);
  if (Number.isNaN(end.getTime())) return null;
  return end;
}

function getFeedbackDeadline(eventRow) {
  const end = getEventEndTimestamp(eventRow);
  if (!end) return null;
  const hours = parseInteger(eventRow?.feedback_deadline_hours, 48);
  return new Date(end.getTime() + hours * 60 * 60 * 1000);
}

function toStatusPayload(eventRow, feedbackRow, now = Date.now()) {
  const eventEnd = getEventEndTimestamp(eventRow);
  const deadline = getFeedbackDeadline(eventRow);

  if (feedbackRow?.feedback_id) {
    return {
      status: 'SUBMITTED',
      canSubmitFeedback: false,
      feedbackDeadline: deadline ? deadline.toISOString() : null,
      submittedAt: feedbackRow.feedback_created_at || null,
      feedback: {
        id: feedbackRow.feedback_id,
        overallRating: Number(feedbackRow.overall_rating),
        organisationRating: Number(feedbackRow.organisation_rating),
        contentRating: Number(feedbackRow.content_rating),
        writtenFeedback: feedbackRow.written_feedback || '',
        suggestions: feedbackRow.suggestions || '',
      },
    };
  }

  if (!eventRow || !eventRow.registration_id || eventRow.registration_status !== 'REGISTERED') {
    return {
      status: 'NOT_ELIGIBLE',
      canSubmitFeedback: false,
      feedbackDeadline: deadline ? deadline.toISOString() : null,
      submittedAt: null,
      feedback: null,
    };
  }

  if (eventRow.attendance_status !== true) {
    return {
      status: 'NOT_ELIGIBLE',
      canSubmitFeedback: false,
      feedbackDeadline: deadline ? deadline.toISOString() : null,
      submittedAt: null,
      feedback: null,
    };
  }

  if (eventEnd && now < eventEnd.getTime()) {
    return {
      status: 'FEEDBACK_PENDING',
      canSubmitFeedback: false,
      feedbackDeadline: deadline ? deadline.toISOString() : null,
      submittedAt: null,
      feedback: null,
    };
  }

  if (deadline && now > deadline.getTime()) {
    return {
      status: 'EXPIRED',
      canSubmitFeedback: false,
      feedbackDeadline: deadline.toISOString(),
      submittedAt: null,
      feedback: null,
    };
  }

  return {
    status: 'FEEDBACK_PENDING',
    canSubmitFeedback: true,
    feedbackDeadline: deadline ? deadline.toISOString() : null,
    submittedAt: null,
    feedback: null,
  };
}

function facultyEventPredicate(alias, firstParameter) {
  const userId = `$${firstParameter}`;
  const email = `$${firstParameter + 1}`;
  const name = `$${firstParameter + 2}`;

  return `(
    ${alias}.requested_by->>'id' = ${userId}
    OR lower(COALESCE(${alias}.assigned_faculty_coordinator->>'id', '')) = lower(${userId})
    OR (${email} <> '' AND lower(COALESCE(${alias}.assigned_faculty_coordinator->>'email', '')) = lower(${email}))
    OR (${name} <> '' AND lower(COALESCE(${alias}.assigned_faculty_coordinator->>'name', '')) = lower(${name}))
    OR EXISTS (
      SELECT 1 FROM societies AS assigned_society
      WHERE assigned_society.id = ${alias}.host_club
        AND (
          (${email} <> '' AND lower(COALESCE(assigned_society.faculty_coordinator->>'email', '')) = lower(${email}))
          OR (${name} <> '' AND lower(COALESCE(assigned_society.faculty_coordinator->>'name', '')) = lower(${name}))
        )
    )
  )`;
}

async function ensureAuthorizedEventAccess(client, eventId, user) {
  if (user.role === 'admin') {
    const event = await client.query('SELECT id FROM venue_bookings WHERE id = $1', [eventId]);
    if (!event.rows[0]) throw new FeedbackError('EVENT_NOT_FOUND', 'Event not found.');
    return;
  }

  if (!['faculty_coordinator', 'hod'].includes(user.role)) {
    throw new FeedbackError('FORBIDDEN', 'You do not have access to this event feedback.');
  }

  const predicate = facultyEventPredicate('event_row', 2);
  const result = await client.query(
    `SELECT event_row.id, ${predicate} AS can_manage
     FROM venue_bookings AS event_row
     WHERE event_row.id = $1
     FOR SHARE OF event_row`,
    [eventId, user.id, user.email || '', user.name || ''],
  );

  if (!result.rows[0]) throw new FeedbackError('EVENT_NOT_FOUND', 'Event not found.');
  if (!result.rows[0].can_manage) throw new FeedbackError('FORBIDDEN', 'You are not assigned to manage this event feedback.');
}

async function getFeedbackStateForStudent(eventId, studentId) {
  const result = await db.query(
    `SELECT
      vb.id AS event_id,
      vb.event_name,
      vb.date,
      vb.time_slots,
      vb.attendance_end_time,
      vb.feedback_deadline_hours,
      vb.status,
      reg.id AS registration_id,
      reg.registration_status,
      attendance.attendance_status,
      attendance.attendance_marked_at,
      feedback.id AS feedback_id,
      feedback.overall_rating,
      feedback.organisation_rating,
      feedback.content_rating,
      feedback.written_feedback,
      feedback.suggestions,
      feedback.created_at AS feedback_created_at
    FROM venue_bookings vb
    LEFT JOIN event_registrations AS reg
      ON reg.event_id = vb.id AND reg.student_id = $1
    LEFT JOIN event_attendance AS attendance
      ON attendance.registration_id = reg.id
    LEFT JOIN event_feedbacks AS feedback
      ON feedback.event_id = vb.id AND feedback.student_id = $1
    WHERE vb.id = $2`,
    [studentId, eventId],
  );

  const row = result.rows[0];
  if (!row) throw new FeedbackError('EVENT_NOT_FOUND', 'Event not found.');

  return toStatusPayload(row, row);
}

async function submitFeedback(eventId, studentId, payload) {
  const cleaned = {
    overallRating: parseInteger(payload?.overallRating, null),
    organisationRating: parseInteger(payload?.organisationRating, null),
    contentRating: parseInteger(payload?.contentRating, null),
    writtenFeedback: typeof payload?.writtenFeedback === 'string' ? payload.writtenFeedback.trim() : '',
    suggestions: typeof payload?.suggestions === 'string' ? payload.suggestions.trim() : '',
  };

  if (![cleaned.overallRating, cleaned.organisationRating, cleaned.contentRating].every((rating) => Number.isInteger(rating) && rating >= 1 && rating <= 5)) {
    throw new FeedbackError('INVALID_RATING', 'All ratings must be integers between 1 and 5.');
  }

  if (cleaned.writtenFeedback.length > 2000) {
    throw new FeedbackError('INVALID_FEEDBACK', 'Written feedback must be 2000 characters or fewer.');
  }

  if (cleaned.suggestions.length > 1000) {
    throw new FeedbackError('INVALID_FEEDBACK', 'Suggestions must be 1000 characters or fewer.');
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const eventResult = await client.query(
      `SELECT
        vb.id,
        vb.event_name,
        vb.date,
        vb.time_slots,
        vb.attendance_end_time,
        vb.feedback_deadline_hours,
        vb.status
      FROM venue_bookings vb
      WHERE vb.id = $1
      FOR UPDATE`,
      [eventId],
    );

    const eventRow = eventResult.rows[0];
    if (!eventRow) throw new FeedbackError('EVENT_NOT_FOUND', 'Event not found.');
    if (eventRow.status !== 'approved') throw new FeedbackError('EVENT_NOT_APPROVED', 'Feedback is only available for approved events.');

    const eventEnd = getEventEndTimestamp(eventRow);
    const deadline = getFeedbackDeadline(eventRow);
    const now = Date.now();

    if (!eventEnd || now < eventEnd.getTime()) {
      throw new FeedbackError('FEEDBACK_NOT_AVAILABLE', 'Feedback is only available after the event has ended.');
    }

    if (deadline && now > deadline.getTime()) {
      throw new FeedbackError('FEEDBACK_EXPIRED', 'The feedback deadline for this event has ended.');
    }

    const registrationResult = await client.query(
      `SELECT reg.id AS registration_id, reg.registration_status
       FROM event_registrations reg
       WHERE reg.event_id = $1 AND reg.student_id = $2
       FOR UPDATE`,
      [eventId, studentId],
    );

    const registrationRow = registrationResult.rows[0];
    if (!registrationRow) throw new FeedbackError('NOT_ELIGIBLE', 'Only registered students may submit feedback.');

    const attendanceResult = await client.query(
      `SELECT attendance_status
       FROM event_attendance
       WHERE registration_id = $1
       FOR UPDATE`,
      [registrationRow.registration_id],
    );

    const attendanceRecord = attendanceResult.rows[0];
    if (!attendanceRecord || attendanceRecord.attendance_status !== true) {
      throw new FeedbackError('NOT_ELIGIBLE', 'Only students with verified attendance can submit feedback.');
    }

    const existing = await client.query(
      'SELECT id FROM event_feedbacks WHERE event_id = $1 AND student_id = $2',
      [eventId, studentId],
    );

    if (existing.rows[0]) {
      throw new FeedbackError('DUPLICATE_FEEDBACK', 'You have already submitted feedback for this event.');
    }

    const inserted = await client.query(
      `INSERT INTO event_feedbacks (
        event_id,
        student_id,
        overall_rating,
        organisation_rating,
        content_rating,
        written_feedback,
        suggestions,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *`,
      [
        eventId,
        studentId,
        cleaned.overallRating,
        cleaned.organisationRating,
        cleaned.contentRating,
        cleaned.writtenFeedback,
        cleaned.suggestions,
      ],
    );

    await client.query('COMMIT');
    return {
      id: inserted.rows[0].id,
      eventId: inserted.rows[0].event_id,
      studentId: inserted.rows[0].student_id,
      overallRating: Number(inserted.rows[0].overall_rating),
      organisationRating: Number(inserted.rows[0].organisation_rating),
      contentRating: Number(inserted.rows[0].content_rating),
      writtenFeedback: inserted.rows[0].written_feedback,
      suggestions: inserted.rows[0].suggestions,
      submittedAt: inserted.rows[0].created_at,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error && error.code === '23505') {
      throw new FeedbackError('DUPLICATE_FEEDBACK', 'You have already submitted feedback for this event.');
    }
    throw error;
  } finally {
    client.release();
  }
}

async function listForStudent(studentId) {
  const result = await db.query(
    `SELECT
      er.id AS registration_id,
      er.event_id,
      er.registration_status,
      vb.event_name,
      vb.date,
      vb.time_slots,
      vb.attendance_end_time,
      vb.feedback_deadline_hours,
      v.name AS venue_name,
      s.name AS society_name,
      attendance.attendance_status,
      attendance.attendance_marked_at,
      feedback.id AS feedback_id,
      feedback.overall_rating,
      feedback.organisation_rating,
      feedback.content_rating,
      feedback.written_feedback,
      feedback.suggestions,
      feedback.created_at AS feedback_created_at
    FROM event_registrations er
    JOIN venue_bookings vb ON vb.id = er.event_id
    LEFT JOIN venues v ON v.id = vb.venue_id
    LEFT JOIN societies s ON s.id = vb.host_club
    LEFT JOIN event_attendance attendance ON attendance.registration_id = er.id
    LEFT JOIN event_feedbacks feedback ON feedback.event_id = vb.id AND feedback.student_id = $1
    WHERE er.student_id = $1
    ORDER BY vb.date DESC, er.registered_at DESC`,
    [studentId],
  );

  return result.rows.map((row) => {
    const payload = toStatusPayload(row, row);
    return {
      id: row.registration_id,
      eventId: row.event_id,
      title: row.event_name,
      date: row.date,
      time: Array.isArray(row.time_slots) && row.time_slots.length ? `${row.time_slots[0].startTime} - ${row.time_slots[row.time_slots.length - 1].endTime}` : 'Time not specified',
      venue: row.venue_name || 'Venue to be announced',
      societyName: row.society_name || 'Society event',
      registrationStatus: row.registration_status,
      attendanceStatus: row.attendance_status === true ? 'PRESENT' : 'NOT_MARKED',
      feedbackStatus: payload.status,
      feedbackDeadline: payload.feedbackDeadline,
      canSubmitFeedback: payload.canSubmitFeedback,
      submittedAt: payload.submittedAt,
      feedback: payload.feedback,
    };
  });
}

async function getSummaryForUser(user) {
  const roles = ['faculty_coordinator', 'hod', 'admin'];
  if (!roles.includes(user.role)) throw new FeedbackError('FORBIDDEN', 'Only faculty or administrators can view feedback summaries.');

  let whereClause = 'WHERE 1 = 1';
  let params = [];

  if (user.role !== 'admin') {
    const predicate = facultyEventPredicate('vb', 1);
    whereClause = `WHERE ${predicate}`;
    params = [user.id, user.email || '', user.name || ''];
  }

  const result = await db.query(
    `SELECT
      vb.id,
      vb.event_name,
      vb.date,
      vb.status,
      vb.attendance_end_time,
      vb.feedback_deadline_hours,
      COUNT(DISTINCT CASE WHEN reg.registration_status = 'REGISTERED' AND attendance.attendance_status = true THEN reg.id END)::int AS eligible_attendees,
      COUNT(DISTINCT feedback.id)::int AS submission_count,
      ROUND(AVG(feedback.overall_rating), 2) AS average_overall,
      ROUND(AVG(feedback.organisation_rating), 2) AS average_organisation,
      ROUND(AVG(feedback.content_rating), 2) AS average_content
    FROM venue_bookings vb
    LEFT JOIN event_registrations reg ON reg.event_id = vb.id
    LEFT JOIN event_attendance attendance ON attendance.registration_id = reg.id
    LEFT JOIN event_feedbacks feedback ON feedback.event_id = vb.id
    ${whereClause}
    GROUP BY vb.id, vb.event_name, vb.date, vb.status, vb.attendance_end_time, vb.feedback_deadline_hours
    ORDER BY vb.date DESC`,
    params,
  );

  return result.rows.map((row) => {
    const eligible = Number(row.eligible_attendees || 0);
    const submitted = Number(row.submission_count || 0);
    const rate = eligible ? (submitted / eligible) * 100 : 0;

    return {
      eventId: row.id,
      eventName: row.event_name,
      eventDate: row.date,
      status: row.status,
      eligibleAttendees: eligible,
      submissionCount: submitted,
      responseRate: Number(rate.toFixed(2)),
      averageOverall: row.average_overall ? Number(row.average_overall) : null,
      averageOrganisation: row.average_organisation ? Number(row.average_organisation) : null,
      averageContent: row.average_content ? Number(row.average_content) : null,
      feedbackDeadlineHours: Number(row.feedback_deadline_hours ?? 48),
    };
  });
}

async function getEventSummary(eventId, user) {
  const client = await db.pool.connect();
  try {
    await ensureAuthorizedEventAccess(client, eventId, user);
    const result = await client.query(
      `SELECT
        vb.id,
        vb.event_name,
        vb.date,
        vb.status,
        vb.attendance_end_time,
        vb.feedback_deadline_hours,
        COUNT(DISTINCT CASE WHEN reg.registration_status = 'REGISTERED' AND attendance.attendance_status = true THEN reg.id END)::int AS eligible_attendees,
        COUNT(DISTINCT feedback.id)::int AS submission_count,
        ROUND(AVG(feedback.overall_rating), 2) AS average_overall,
        ROUND(AVG(feedback.organisation_rating), 2) AS average_organisation,
        ROUND(AVG(feedback.content_rating), 2) AS average_content
      FROM venue_bookings vb
      LEFT JOIN event_registrations reg ON reg.event_id = vb.id
      LEFT JOIN event_attendance attendance ON attendance.registration_id = reg.id
      LEFT JOIN event_feedbacks feedback ON feedback.event_id = vb.id
      WHERE vb.id = $1
      GROUP BY vb.id, vb.event_name, vb.date, vb.status, vb.attendance_end_time, vb.feedback_deadline_hours`,
      [eventId],
    );

    if (!result.rows[0]) throw new FeedbackError('EVENT_NOT_FOUND', 'Event not found.');
    const row = result.rows[0];
    const eligible = Number(row.eligible_attendees || 0);
    const submitted = Number(row.submission_count || 0);

    return {
      eventId: row.id,
      eventName: row.event_name,
      eventDate: row.date,
      status: row.status,
      eligibleAttendees: eligible,
      submissionCount: submitted,
      responseRate: eligible ? Number(((submitted / eligible) * 100).toFixed(2)) : 0,
      averageOverall: row.average_overall ? Number(row.average_overall) : null,
      averageOrganisation: row.average_organisation ? Number(row.average_organisation) : null,
      averageContent: row.average_content ? Number(row.average_content) : null,
      feedbackDeadlineHours: Number(row.feedback_deadline_hours ?? 48),
    };
  } finally {
    client.release();
  }
}

async function getEventResponses(eventId, user) {
  const client = await db.pool.connect();
  try {
    await ensureAuthorizedEventAccess(client, eventId, user);
    const result = await client.query(
      `SELECT
        feedback.id,
        feedback.event_id,
        feedback.student_id,
        feedback.overall_rating,
        feedback.organisation_rating,
        feedback.content_rating,
        feedback.written_feedback,
        feedback.suggestions,
        feedback.created_at,
        student.name AS student_name,
        student.college_email_id AS student_email,
        student.enrollment_id AS enrollment_id
      FROM event_feedbacks feedback
      JOIN students student ON student.enrollment_id = feedback.student_id
      WHERE feedback.event_id = $1
      ORDER BY feedback.created_at DESC`,
      [eventId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      eventId: row.event_id,
      studentId: row.student_id,
      studentName: row.student_name,
      studentEmail: row.student_email,
      enrollmentId: row.enrollment_id,
      overallRating: Number(row.overall_rating),
      organisationRating: Number(row.organisation_rating),
      contentRating: Number(row.content_rating),
      writtenFeedback: row.written_feedback || '',
      suggestions: row.suggestions || '',
      submittedAt: row.created_at,
    }));
  } finally {
    client.release();
  }
}

module.exports = {
  FeedbackError,
  getFeedbackStateForStudent,
  submitFeedback,
  listForStudent,
  getSummaryForUser,
  getEventSummary,
  getEventResponses,
};

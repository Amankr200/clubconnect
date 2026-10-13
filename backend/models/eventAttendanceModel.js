const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const db = require('../db');

class AttendanceError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

async function ensureForRegistration(client, registrationId) {
  const inserted = await client.query(
    `INSERT INTO event_attendance (registration_id)
     VALUES ($1)
     ON CONFLICT (registration_id) DO NOTHING
     RETURNING id`,
    [registrationId],
  );
  if (inserted.rows[0]) return inserted.rows[0].id;

  const result = await client.query(
    'SELECT id FROM event_attendance WHERE registration_id = $1',
    [registrationId],
  );
  if (!result.rows[0]) throw new Error('Unable to create or retrieve attendance record.');
  return result.rows[0].id;
}

function getSummary(rows) {
  const active = rows.filter((row) => row.registrationStatus === 'REGISTERED');
  const present = active.filter((row) => row.attendanceStatus).length;
  return {
    registeredCount: active.length,
    presentCount: present,
    absentCount: active.length - present,
    attendancePercentage: active.length ? Math.round((present / active.length) * 10000) / 100 : 0,
  };
}

function formatParticipant(row) {
  return {
    attendanceId: Number(row.attendance_id),
    registrationId: Number(row.registration_id),
    studentName: row.student_name,
    enrollmentNumber: String(row.enrollment_id),
    branch: row.branch || '',
    section: row.section || '',
    registrationStatus: row.registration_status,
    attendanceStatus: row.attendance_status === true,
    attendanceTime: row.attendance_marked_at,
  };
}

async function listEvents() {
  const result = await db.query(
    `SELECT
       booking.id,
       booking.event_name,
       booking.date AS event_date,
       venue.name AS venue_name,
       COUNT(registration.id) FILTER (WHERE registration.registration_status = 'REGISTERED')::int AS registered_count,
       COUNT(attendance.id) FILTER (
         WHERE registration.registration_status = 'REGISTERED' AND attendance.attendance_status = TRUE
       )::int AS present_count
     FROM venue_bookings AS booking
     LEFT JOIN venues AS venue ON venue.id = booking.venue_id
     LEFT JOIN event_registrations AS registration ON registration.event_id = booking.id
     LEFT JOIN event_attendance AS attendance ON attendance.registration_id = registration.id
     WHERE booking.status = 'approved'
     GROUP BY booking.id, venue.name
     ORDER BY booking.date DESC, booking.event_name ASC`,
  );

  return result.rows.map((row) => {
    const registeredCount = Number(row.registered_count);
    const presentCount = Number(row.present_count);
    return {
      id: row.id,
      eventName: row.event_name,
      eventDate: row.event_date,
      venue: row.venue_name || 'Venue to be announced',
      registeredCount,
      presentCount,
      absentCount: registeredCount - presentCount,
      attendancePercentage: registeredCount ? Math.round((presentCount / registeredCount) * 10000) / 100 : 0,
    };
  });
}

async function getEventAttendance(eventId) {
  const eventResult = await db.query(
    `SELECT booking.id, booking.event_name, booking.date AS event_date,
            venue.name AS venue_name, booking.status
     FROM venue_bookings AS booking
     LEFT JOIN venues AS venue ON venue.id = booking.venue_id
     WHERE booking.id = $1`,
    [eventId],
  );
  const eventRow = eventResult.rows[0];
  if (!eventRow) throw new AttendanceError('EVENT_NOT_FOUND', 'Event not found.');

  const participantResult = await db.query(
    `SELECT
       attendance.id AS attendance_id,
       registration.id AS registration_id,
       registration.registration_status,
       attendance.attendance_status,
       attendance.attendance_marked_at,
       student.name AS student_name,
       student.enrollment_id,
       student.branch,
       student.section
     FROM event_registrations AS registration
     JOIN event_attendance AS attendance ON attendance.registration_id = registration.id
     JOIN students AS student ON student.enrollment_id = registration.student_id
     WHERE registration.event_id = $1
     ORDER BY student.name ASC, student.enrollment_id ASC`,
    [eventId],
  );
  const participants = participantResult.rows.map(formatParticipant);

  return {
    event: {
      id: eventRow.id,
      eventName: eventRow.event_name,
      eventDate: eventRow.event_date,
      venue: eventRow.venue_name || 'Venue to be announced',
      status: eventRow.status,
    },
    ...getSummary(participants),
    participants,
  };
}

async function recordScan(passToken, coordinatorId) {
  if (typeof passToken !== 'string' || !/^[a-f0-9]{64}$/i.test(passToken)) {
    throw new AttendanceError('INVALID_TOKEN', 'The scanned pass token is invalid.');
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT
         pass.registration_id,
         registration.registration_status,
         booking.id AS event_id,
         booking.event_name,
         booking.status AS event_status,
         booking.attendance_start_time,
         booking.attendance_end_time,
         venue.name AS venue_name,
         student.name AS student_name
       FROM event_passes AS pass
       JOIN event_registrations AS registration ON registration.id = pass.registration_id
       JOIN venue_bookings AS booking ON booking.id = registration.event_id
       JOIN students AS student ON student.enrollment_id = registration.student_id
       LEFT JOIN venues AS venue ON venue.id = booking.venue_id
       WHERE pass.pass_token = $1
       FOR UPDATE OF pass, registration, booking`,
      [passToken],
    );

    const row = result.rows[0];
    if (!row) throw new AttendanceError('INVALID_TOKEN', 'No event pass matches this QR code.');
    if (row.registration_status !== 'REGISTERED') {
      throw new AttendanceError('REGISTRATION_CANCELLED', 'The RSVP for this pass is cancelled.');
    }
    if (row.event_status !== 'approved') {
      throw new AttendanceError('EVENT_NOT_APPROVED', 'Attendance is only available for approved events.');
    }

    const start = row.attendance_start_time ? new Date(row.attendance_start_time).getTime() : NaN;
    const end = row.attendance_end_time ? new Date(row.attendance_end_time).getTime() : NaN;
    const now = Date.now();
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      throw new AttendanceError('ATTENDANCE_WINDOW_NOT_CONFIGURED', 'This event has no valid attendance window.');
    }
    if (now < start) throw new AttendanceError('ATTENDANCE_WINDOW_NOT_OPEN', 'The attendance window has not opened yet.');
    if (now > end) throw new AttendanceError('ATTENDANCE_WINDOW_CLOSED', 'The attendance window has closed.');

    const attendanceId = await ensureForRegistration(client, row.registration_id);
    const attendanceResult = await client.query(
      'SELECT id, attendance_status FROM event_attendance WHERE id = $1 FOR UPDATE',
      [attendanceId],
    );
    const attendance = attendanceResult.rows[0];
    if (!attendance) throw new AttendanceError('ATTENDANCE_NOT_FOUND', 'Attendance record not found.');
    if (attendance.attendance_status) {
      throw new AttendanceError('ALREADY_MARKED', 'Attendance Already Recorded.');
    }

    const updated = await client.query(
      `UPDATE event_attendance
       SET attendance_status = TRUE, attendance_marked_at = NOW(), marked_by = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id, attendance_marked_at`,
      [attendance.id, coordinatorId],
    );
    await client.query(
      `INSERT INTO attendance_logs (attendance_id, action, performed_by)
       VALUES ($1, 'QR_SCAN', $2)`,
      [attendance.id, coordinatorId],
    );
    await client.query('COMMIT');

    return {
      attendanceId: Number(updated.rows[0].id),
      studentName: row.student_name,
      eventName: row.event_name,
      venue: row.venue_name || 'Venue to be announced',
      attendanceStatus: true,
      attendanceTime: updated.rows[0].attendance_marked_at,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function manuallySetAttendance(attendanceId, attendanceStatus, coordinatorId) {
  if (!Number.isSafeInteger(attendanceId) || attendanceId <= 0) {
    throw new AttendanceError('ATTENDANCE_NOT_FOUND', 'Attendance record not found.');
  }
  if (typeof attendanceStatus !== 'boolean') {
    throw new AttendanceError('INVALID_ATTENDANCE_STATUS', 'attendanceStatus must be a boolean.');
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT attendance.id, registration.registration_status
       FROM event_attendance AS attendance
       JOIN event_registrations AS registration ON registration.id = attendance.registration_id
       WHERE attendance.id = $1
       FOR UPDATE OF attendance, registration`,
      [attendanceId],
    );
    const row = result.rows[0];
    if (!row) throw new AttendanceError('ATTENDANCE_NOT_FOUND', 'Attendance record not found.');
    if (row.registration_status !== 'REGISTERED') {
      throw new AttendanceError('REGISTRATION_CANCELLED', 'Cannot change attendance for a cancelled RSVP.');
    }

    const action = attendanceStatus ? 'MANUAL_PRESENT' : 'MANUAL_ABSENT';
    const updated = await client.query(
      `UPDATE event_attendance
       SET attendance_status = $2,
           attendance_marked_at = CASE WHEN $2 THEN NOW() ELSE NULL END,
           marked_by = $3,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, attendance_status, attendance_marked_at`,
      [attendanceId, attendanceStatus, coordinatorId],
    );
    await client.query(
      `INSERT INTO attendance_logs (attendance_id, action, performed_by)
       VALUES ($1, $2, $3)`,
      [attendanceId, action, coordinatorId],
    );
    await client.query('COMMIT');
    return {
      attendanceId: Number(updated.rows[0].id),
      attendanceStatus: updated.rows[0].attendance_status,
      attendanceTime: updated.rows[0].attendance_marked_at,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function getExportRows(participants) {
  const headers = ['Student Name', 'Enrollment Number', 'Branch', 'Section', 'Registration Status', 'Attendance Status', 'Attendance Time'];
  const rows = participants.map((participant) => [
    participant.studentName,
    participant.enrollmentNumber,
    participant.branch,
    participant.section,
    participant.registrationStatus,
    participant.registrationStatus !== 'REGISTERED'
      ? 'Not Applicable'
      : participant.attendanceStatus ? 'Present' : 'Absent',
    participant.attendanceTime ? new Date(participant.attendanceTime).toISOString() : '',
  ]);
  return { headers, rows };
}

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

async function exportAttendance(eventId, format) {
  const data = await getEventAttendance(eventId);
  const { headers, rows } = getExportRows(data.participants);
  const stem = data.event.eventName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'event-attendance';

  if (format === 'csv') {
    const body = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    return { filename: `${stem}-attendance.csv`, contentType: 'text/csv; charset=utf-8', body: Buffer.from(`\uFEFF${body}`) };
  }

  if (format === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Attendance');
    sheet.addRow(headers);
    rows.forEach((row) => sheet.addRow(row));
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: 'A1', to: 'G1' };
    sheet.columns.forEach((column) => { column.width = 22; });
    return {
      filename: `${stem}-attendance.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: Buffer.from(await workbook.xlsx.writeBuffer()),
    };
  }

  if (format === 'pdf') {
    const body = await new Promise((resolve, reject) => {
      const document = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 28 });
      const chunks = [];
      document.on('data', (chunk) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);
      const widths = [132, 98, 55, 52, 94, 92, 126];
      const drawHeader = () => {
        document.font('Helvetica-Bold').fontSize(7);
        let x = document.page.margins.left;
        headers.forEach((header, index) => {
          document.text(header, x, document.y, { width: widths[index], lineBreak: false });
          x += widths[index];
        });
        document.moveDown(1.5).font('Helvetica').fontSize(7);
      };
      document.font('Helvetica-Bold').fontSize(16).text(`${data.event.eventName} Attendance`);
      document.font('Helvetica').fontSize(9).text(`${data.event.eventDate} · ${data.event.venue}`);
      document.moveDown();
      drawHeader();
      for (const row of rows) {
        if (document.y > document.page.height - document.page.margins.bottom - 18) {
          document.addPage();
          drawHeader();
        }
        let x = document.page.margins.left;
        const y = document.y;
        row.forEach((value, index) => {
          document.text(String(value ?? '').slice(0, 36), x, y, { width: widths[index], lineBreak: false });
          x += widths[index];
        });
        document.y = y + 14;
      }
      document.end();
    });
    return { filename: `${stem}-attendance.pdf`, contentType: 'application/pdf', body };
  }

  throw new AttendanceError('INVALID_EXPORT_FORMAT', 'format must be csv, xlsx, or pdf.');
}

module.exports = {
  AttendanceError,
  ensureForRegistration,
  listEvents,
  getEventAttendance,
  recordScan,
  manuallySetAttendance,
  exportAttendance,
};

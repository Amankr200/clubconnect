const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const db = require('../db');

class AttendanceError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
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

async function assertFacultyManagesEvent(client, eventId, faculty, approvedOnly = true) {
  const predicate = facultyEventPredicate('booking', 2);
  const result = await client.query(
    `SELECT booking.id, booking.status,
            ${predicate} AS can_manage
     FROM venue_bookings AS booking
     WHERE booking.id = $1
     FOR SHARE OF booking`,
    [eventId, faculty.id, faculty.email || '', faculty.name || ''],
  );
  const event = result.rows[0];
  if (!event) throw new AttendanceError('EVENT_NOT_FOUND', 'Event not found.');
  if (!event.can_manage) throw new AttendanceError('FORBIDDEN', 'You are not assigned to manage this event.');
  if (approvedOnly && event.status !== 'approved') {
    throw new AttendanceError('EVENT_NOT_APPROVED', 'Attendance is only available for approved events.');
  }
  return event;
}

async function assertCanViewEvent(eventId, user) {
  if (user.role === 'admin') {
    const result = await db.query('SELECT id FROM venue_bookings WHERE id = $1', [eventId]);
    if (!result.rows[0]) throw new AttendanceError('EVENT_NOT_FOUND', 'Event not found.');
    return;
  }
  if (user.role !== 'faculty_coordinator') {
    throw new AttendanceError('FORBIDDEN', 'You cannot view this attendance report.');
  }
  await assertFacultyManagesEvent(db, eventId, user, false);
}

async function writeAuditLog(client, {
  attendanceId = null,
  eventId,
  registrationId = null,
  actorId,
  action,
  previousStatus = null,
  newStatus = null,
  reason = null,
}) {
  await client.query(
    `INSERT INTO attendance_logs
       (attendance_id, event_id, registration_id, action, performed_by, previous_status, new_status, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [attendanceId, eventId, registrationId, action, actorId, previousStatus, newStatus, reason],
  );
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
    markedBy: row.marked_by_name || '',
  };
}

async function listEvents(user) {
  let scope = '';
  let params = [];
  if (user?.role === 'faculty_coordinator') {
    scope = `AND ${facultyEventPredicate('booking', 1)}`;
    params = [user.id, user.email || '', user.name || ''];
  } else if (user?.role !== 'admin') {
    throw new AttendanceError('FORBIDDEN', 'You cannot view attendance dashboards.');
  }

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
       ${scope}
     GROUP BY booking.id, venue.name
     ORDER BY booking.date DESC, booking.event_name ASC`,
     params,
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

async function getEventAttendance(eventId, user) {
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
  await assertCanViewEvent(eventId, user);

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
      student.section,
      marker.name AS marked_by_name
     FROM event_registrations AS registration
     JOIN event_attendance AS attendance ON attendance.registration_id = registration.id
     JOIN students AS student ON student.enrollment_id = registration.student_id
    LEFT JOIN users AS marker ON marker.id = attendance.marked_by
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

async function listAttendanceTeam(eventId, faculty) {
  await assertFacultyManagesEvent(db, eventId, faculty, true);
  const result = await db.query(
    `SELECT
       permission.id,
       permission.user_id,
       scanner.name AS scanner_name,
       scanner.email AS scanner_email,
       permission.granted_at,
       permission.granted_by,
       grantor.name AS granted_by_name,
       permission.revoked_at,
       permission.revoked_by,
       revoker.name AS revoked_by_name
     FROM event_attendance_permissions AS permission
     JOIN users AS scanner ON scanner.id = permission.user_id
     LEFT JOIN users AS grantor ON grantor.id = permission.granted_by
     LEFT JOIN users AS revoker ON revoker.id = permission.revoked_by
     WHERE permission.event_id = $1
     ORDER BY permission.granted_at DESC, permission.id DESC`,
    [eventId],
  );
  return result.rows.map((row) => ({
    permissionId: Number(row.id),
    userId: row.user_id,
    name: row.scanner_name,
    email: row.scanner_email,
    grantedAt: row.granted_at,
    grantedBy: row.granted_by,
    grantedByName: row.granted_by_name,
    revokedAt: row.revoked_at,
    revokedBy: row.revoked_by,
    revokedByName: row.revoked_by_name,
    active: !row.revoked_at,
  }));
}

async function listAvailableScanners(eventId, faculty) {
  await assertFacultyManagesEvent(db, eventId, faculty, true);
  const result = await db.query(
    `SELECT candidate.id, candidate.name, candidate.email
     FROM users AS candidate
     WHERE candidate.role = 'student_coordinator'
       AND NOT EXISTS (
         SELECT 1 FROM event_attendance_permissions AS permission
         WHERE permission.event_id = $1
           AND permission.user_id = candidate.id
           AND permission.revoked_at IS NULL
       )
     ORDER BY candidate.name ASC`,
    [eventId],
  );
  return result.rows;
}

async function grantScanner(eventId, scannerId, faculty) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await assertFacultyManagesEvent(client, eventId, faculty, true);
    const scannerResult = await client.query(
      `SELECT id, name, email FROM users
       WHERE id = $1 AND role = 'student_coordinator'`,
      [scannerId],
    );
    const scanner = scannerResult.rows[0];
    if (!scanner) throw new AttendanceError('SCANNER_NOT_ELIGIBLE', 'Only student coordinators can be assigned as event scanners.');

    const permissionResult = await client.query(
      `INSERT INTO event_attendance_permissions (event_id, user_id, granted_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (event_id, user_id) WHERE revoked_at IS NULL DO NOTHING
       RETURNING id, granted_at`,
      [eventId, scannerId, faculty.id],
    );
    if (!permissionResult.rows[0]) {
      throw new AttendanceError('SCANNER_ALREADY_AUTHORIZED', 'This coordinator already has active scanner access for the event.');
    }

    await writeAuditLog(client, {
      eventId,
      actorId: faculty.id,
      action: 'SCANNER_PERMISSION_GRANTED',
      reason: `Granted scanner access to ${scanner.id}`,
    });
    await client.query('COMMIT');
    return {
      permissionId: Number(permissionResult.rows[0].id),
      userId: scanner.id,
      name: scanner.name,
      email: scanner.email,
      grantedAt: permissionResult.rows[0].granted_at,
      grantedBy: faculty.id,
      grantedByName: faculty.name,
      revokedAt: null,
      active: true,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function revokeScanner(eventId, permissionId, faculty) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await assertFacultyManagesEvent(client, eventId, faculty, false);
    const updated = await client.query(
      `UPDATE event_attendance_permissions
       SET revoked_at = NOW(), revoked_by = $3
       WHERE id = $1 AND event_id = $2 AND revoked_at IS NULL
       RETURNING id, user_id`,
      [permissionId, eventId, faculty.id],
    );
    if (!updated.rows[0]) throw new AttendanceError('SCANNER_PERMISSION_NOT_FOUND', 'Active scanner permission not found.');

    await writeAuditLog(client, {
      eventId,
      actorId: faculty.id,
      action: 'SCANNER_PERMISSION_REVOKED',
      reason: `Revoked scanner access from ${updated.rows[0].user_id}`,
    });
    await client.query('COMMIT');
    return { permissionId: Number(updated.rows[0].id), userId: updated.rows[0].user_id, revokedAt: new Date() };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function recordScan(passToken, scanner) {
  if (typeof passToken !== 'string' || !/^[a-f0-9]{64}$/i.test(passToken)) {
    throw new AttendanceError('INVALID_TOKEN', 'The scanned pass token is invalid.');
  }

  const client = await db.pool.connect();
  let transactionOpen = true;
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT
         pass.registration_id,
         registration.registration_status,
         booking.id AS event_id,
         booking.event_name,
         booking.status AS event_status,
         booking.host_club,
         booking.requested_by,
         booking.assigned_faculty_coordinator,
         booking.attendance_start_time,
         booking.attendance_end_time,
         venue.name AS venue_name,
           student.name AS student_name,
           student.enrollment_id
       FROM event_passes AS pass
       JOIN event_registrations AS registration ON registration.id = pass.registration_id
       JOIN venue_bookings AS booking ON booking.id = registration.event_id
       JOIN students AS student ON student.enrollment_id = registration.student_id
       LEFT JOIN venues AS venue ON venue.id = booking.venue_id
       WHERE pass.pass_token = $1
      FOR UPDATE OF pass, registration
      FOR SHARE OF booking`,
      [passToken],
    );

    const row = result.rows[0];
    if (!row) throw new AttendanceError('INVALID_TOKEN', 'No event pass matches this QR code.');
    if (scanner.role === 'faculty_coordinator') {
      await assertFacultyManagesEvent(client, row.event_id, scanner, true);
    } else if (scanner.role === 'student_coordinator') {
      const permission = await client.query(
        `SELECT id
         FROM event_attendance_permissions
         WHERE event_id = $1 AND user_id = $2 AND revoked_at IS NULL
         FOR SHARE`,
        [row.event_id, scanner.id],
      );
      if (!permission.rows[0]) {
        throw new AttendanceError('SCANNER_NOT_AUTHORIZED', 'You are not authorized to scan for this event.');
      }
    } else {
      throw new AttendanceError('FORBIDDEN', 'You cannot scan attendance.');
    }
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
      await writeAuditLog(client, {
        attendanceId: attendance.id,
        eventId: row.event_id,
        registrationId: row.registration_id,
        actorId: scanner.id,
        action: 'QR_SCAN_DUPLICATE',
        previousStatus: true,
        newStatus: true,
      });
      await client.query('COMMIT');
      transactionOpen = false;
      throw new AttendanceError('ALREADY_MARKED', 'Attendance Already Recorded.');
    }

    const updated = await client.query(
      `UPDATE event_attendance
       SET attendance_status = TRUE, attendance_marked_at = NOW(), marked_by = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id, attendance_marked_at`,
      [attendance.id, scanner.id],
    );
    await writeAuditLog(client, {
      attendanceId: attendance.id,
      eventId: row.event_id,
      registrationId: row.registration_id,
      actorId: scanner.id,
      action: 'QR_SCAN_SUCCESS',
      previousStatus: false,
      newStatus: true,
    });
    await client.query('COMMIT');
    transactionOpen = false;

    return {
      attendanceId: Number(updated.rows[0].id),
      eventId: row.event_id,
      studentName: row.student_name,
      enrollmentNumber: String(row.enrollment_id),
      eventName: row.event_name,
      venue: row.venue_name || 'Venue to be announced',
      attendanceStatus: true,
      attendanceTime: updated.rows[0].attendance_marked_at,
    };
  } catch (error) {
    if (transactionOpen) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function manuallySetAttendance(attendanceId, attendanceStatus, faculty, reason) {
  if (!Number.isSafeInteger(attendanceId) || attendanceId <= 0) {
    throw new AttendanceError('ATTENDANCE_NOT_FOUND', 'Attendance record not found.');
  }
  if (typeof attendanceStatus !== 'boolean') {
    throw new AttendanceError('INVALID_ATTENDANCE_STATUS', 'attendanceStatus must be a boolean.');
  }
  if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 500) {
    throw new AttendanceError('INVALID_ATTENDANCE_REASON', 'A correction reason of up to 500 characters is required.');
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT attendance.id, attendance.attendance_status,
          registration.id AS registration_id, registration.registration_status,
          booking.id AS event_id
       FROM event_attendance AS attendance
       JOIN event_registrations AS registration ON registration.id = attendance.registration_id
       JOIN venue_bookings AS booking ON booking.id = registration.event_id
       WHERE attendance.id = $1
       FOR UPDATE OF attendance, registration
       FOR SHARE OF booking`,
      [attendanceId],
    );
    const row = result.rows[0];
    if (!row) throw new AttendanceError('ATTENDANCE_NOT_FOUND', 'Attendance record not found.');
    await assertFacultyManagesEvent(client, row.event_id, faculty, false);
    if (row.registration_status !== 'REGISTERED') {
      throw new AttendanceError('REGISTRATION_CANCELLED', 'Cannot change attendance for a cancelled RSVP.');
    }
    if (row.attendance_status === attendanceStatus) {
      throw new AttendanceError('ATTENDANCE_STATUS_UNCHANGED', 'Attendance already has this status.');
    }

    const action = attendanceStatus ? 'MANUAL_MARK_PRESENT' : 'MANUAL_MARK_ABSENT';
    const updated = await client.query(
      `UPDATE event_attendance
       SET attendance_status = $2,
           attendance_marked_at = CASE WHEN $2 THEN NOW() ELSE NULL END,
           marked_by = $3,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, attendance_status, attendance_marked_at`,
      [attendanceId, attendanceStatus, faculty.id],
    );
    await writeAuditLog(client, {
      attendanceId,
      eventId: row.event_id,
      registrationId: row.registration_id,
      actorId: faculty.id,
      action,
      previousStatus: row.attendance_status,
      newStatus: attendanceStatus,
      reason: reason.trim(),
    });
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
  const headers = ['Student Name', 'Enrollment Number', 'Branch', 'Section', 'Registration Status', 'Attendance Status', 'Attendance Time', 'Marked By'];
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
    participant.markedBy,
  ]);
  return { headers, rows };
}

function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

async function exportAttendance(eventId, format, user) {
  const data = await getEventAttendance(eventId, user);
  const { headers, rows } = getExportRows(data.participants);
  const eventStem = data.event.eventName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'event';
  const eventDate = String(data.event.eventDate || '').replace(/[^0-9-]/g, '') || new Date().toISOString().slice(0, 10);
  const stem = `${eventStem}-${eventDate}`;

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
    sheet.autoFilter = { from: 'A1', to: 'H1' };
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
      const widths = [118, 92, 48, 45, 82, 80, 115, 100];
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
  listAttendanceTeam,
  listAvailableScanners,
  grantScanner,
  revokeScanner,
  recordScan,
  manuallySetAttendance,
  exportAttendance,
};

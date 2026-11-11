const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const attendanceModel = require('../models/eventAttendanceModel');

const router = express.Router();
const EVENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireStaff(req, res, next) {
  if (!['faculty_coordinator', 'admin'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Staff access is required.' });
  }
  return next();
}

function requireEventScanner(req, res, next) {
  if (!['faculty_coordinator', 'student_coordinator'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Only event coordinators can scan attendance.' });
  }
  return next();
}

function requireFacultyCoordinator(req, res, next) {
  if (req.user?.role !== 'faculty_coordinator') {
    return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Only faculty coordinators can manage attendance.' });
  }
  return next();
}

function sendAttendanceError(res, error) {
  const statuses = {
    INVALID_TOKEN: 400,
    EVENT_NOT_FOUND: 404,
    ATTENDANCE_NOT_FOUND: 404,
    REGISTRATION_CANCELLED: 409,
    ALREADY_MARKED: 409,
    SCANNER_NOT_AUTHORIZED: 403,
    SCANNER_NOT_ELIGIBLE: 400,
    SCANNER_ALREADY_AUTHORIZED: 409,
    SCANNER_PERMISSION_NOT_FOUND: 404,
    EVENT_NOT_APPROVED: 409,
    ATTENDANCE_WINDOW_NOT_CONFIGURED: 409,
    ATTENDANCE_WINDOW_NOT_OPEN: 409,
    ATTENDANCE_WINDOW_CLOSED: 409,
    INVALID_ATTENDANCE_STATUS: 400,
    ATTENDANCE_STATUS_UNCHANGED: 409,
    INVALID_ATTENDANCE_REASON: 400,
    INVALID_USER_ID: 400,
    INVALID_EXPORT_FORMAT: 400,
    FORBIDDEN: 403,
  };
  const status = statuses[error?.code] || 500;
  if (status === 500) console.error('[attendance]', error);
  return res.status(status).json({
    success: false,
    code: error?.code || 'INTERNAL_SERVER_ERROR',
    message: status === 500 ? 'Unable to process attendance request.' : error?.message || 'Request failed.',
  });
}

router.use('/attendance', requireAuth);

router.get('/attendance/events', requireStaff, async (req, res) => {
  try {
    return res.json(await attendanceModel.listEvents(req.user));
  } catch (error) {
    return sendAttendanceError(res, error);
  }
});

router.get('/attendance/event/:eventId/export', requireStaff, async (req, res) => {
  if (!EVENT_ID_PATTERN.test(req.params.eventId)) {
    return res.status(404).json({ success: false, code: 'EVENT_NOT_FOUND', message: 'Event not found.' });
  }
  try {
    const format = String(req.query.format || 'csv').toLowerCase();
    const file = await attendanceModel.exportAttendance(req.params.eventId, format, req.user);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    return res.send(file.body);
  } catch (error) {
    return sendAttendanceError(res, error);
  }
});

router.get('/attendance/event/:eventId', requireStaff, async (req, res) => {
  if (!EVENT_ID_PATTERN.test(req.params.eventId)) {
    return res.status(404).json({ success: false, code: 'EVENT_NOT_FOUND', message: 'Event not found.' });
  }
  try {
    return res.json(await attendanceModel.getEventAttendance(req.params.eventId, req.user));
  } catch (error) {
    return sendAttendanceError(res, error);
  }
});

router.post('/attendance/scan', requireEventScanner, async (req, res) => {
  try {
    const result = await attendanceModel.recordScan(req.body?.passToken, req.user);
    return res.json({ success: true, message: 'Attendance marked successfully.', attendance: result });
  } catch (error) {
    return sendAttendanceError(res, error);
  }
});

router.patch('/attendance/:attendanceId', requireFacultyCoordinator, async (req, res) => {
  const attendanceId = Number(req.params.attendanceId);
  try {
    const result = await attendanceModel.manuallySetAttendance(
      attendanceId,
      req.body?.attendanceStatus,
      req.user,
      req.body?.reason,
    );
    return res.json({ success: true, attendance: result });
  } catch (error) {
    return sendAttendanceError(res, error);
  }
});

router.get('/attendance/event/:eventId/scanners/eligible', requireFacultyCoordinator, async (req, res) => {
  if (!EVENT_ID_PATTERN.test(req.params.eventId)) {
    return res.status(404).json({ success: false, code: 'EVENT_NOT_FOUND', message: 'Event not found.' });
  }
  try {
    return res.json(await attendanceModel.listAvailableScanners(req.params.eventId, req.user));
  } catch (error) {
    return sendAttendanceError(res, error);
  }
});

router.get('/attendance/event/:eventId/scanners', requireFacultyCoordinator, async (req, res) => {
  if (!EVENT_ID_PATTERN.test(req.params.eventId)) {
    return res.status(404).json({ success: false, code: 'EVENT_NOT_FOUND', message: 'Event not found.' });
  }
  try {
    return res.json(await attendanceModel.listAttendanceTeam(req.params.eventId, req.user));
  } catch (error) {
    return sendAttendanceError(res, error);
  }
});

router.post('/attendance/event/:eventId/scanners', requireFacultyCoordinator, async (req, res) => {
  if (!EVENT_ID_PATTERN.test(req.params.eventId)) {
    return res.status(404).json({ success: false, code: 'EVENT_NOT_FOUND', message: 'Event not found.' });
  }
  if (typeof req.body?.userId !== 'string' || !USER_ID_PATTERN.test(req.body.userId)) {
    return res.status(400).json({ success: false, code: 'INVALID_USER_ID', message: 'Scanner user ID must be a valid UUID.' });
  }
  try {
    const permission = await attendanceModel.grantScanner(req.params.eventId, req.body?.userId, req.user);
    return res.status(201).json({ success: true, permission });
  } catch (error) {
    return sendAttendanceError(res, error);
  }
});

router.delete('/attendance/event/:eventId/scanners/:permissionId', requireFacultyCoordinator, async (req, res) => {
  if (!EVENT_ID_PATTERN.test(req.params.eventId)) {
    return res.status(404).json({ success: false, code: 'EVENT_NOT_FOUND', message: 'Event not found.' });
  }
  const permissionId = Number(req.params.permissionId);
  if (!Number.isSafeInteger(permissionId) || permissionId <= 0) {
    return res.status(400).json({ success: false, code: 'INVALID_PERMISSION_ID', message: 'Permission ID must be a positive integer.' });
  }
  try {
    const permission = await attendanceModel.revokeScanner(req.params.eventId, permissionId, req.user);
    return res.json({ success: true, permission });
  } catch (error) {
    return sendAttendanceError(res, error);
  }
});

module.exports = router;

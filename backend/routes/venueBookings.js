const express = require('express');
const venueBookingModel = require('../models/venueBookingModel');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

const ACTIVE_STATUSES = ['pending_faculty', 'pending_principal', 'approved'];

function normalizeSlots(slots) {
  if (!Array.isArray(slots) || slots.length === 0) {
    return [];
  }

  return slots
    .map((slot) => ({
      startTime: String(slot.startTime || '').trim(),
      endTime: String(slot.endTime || '').trim(),
    }))
    .filter((slot) => slot.startTime && slot.endTime);
}

function slotOverlaps(a, b) {
  return a.startTime < b.endTime && a.endTime > b.startTime;
}

function bookingOverlaps(existingBooking, venueId, date, slots, excludeId = null) {
  if (String(existingBooking.id || existingBooking._id) === String(excludeId)) {
    return false;
  }

  if (existingBooking.venueId !== venueId || existingBooking.date !== date) {
    return false;
  }

  if (!ACTIVE_STATUSES.includes(existingBooking.status)) {
    return false;
  }

  return existingBooking.timeSlots.some((existingSlot) => slots.some((slot) => slotOverlaps(slot, existingSlot)));
}

async function getAssignedFacultyCoordinator(hostClub) {
  try {
    const { clubs } = await import('../../src/data/clubs.js');
    const target = String(hostClub || '').trim().toLowerCase();
    const matchedClub = clubs.find((club) => club.name.toLowerCase() === target || club.fullName.toLowerCase() === target);
    return matchedClub?.coordinator || '';
  } catch {
    return '';
  }
}

function toBookingResponse(booking) {
  return {
    id: booking.id,
    venueId: booking.venueId,
    date: booking.date,
    timeSlots: booking.timeSlots,
    eventName: booking.eventName,
    hostClub: booking.hostClub,
    photo: booking.photo,
    photoFileName: booking.photoFileName,
    description: booking.description,
    eligibility: booking.eligibility,
    attendance: booking.attendance,
    feedback: booking.feedback,
    studentCoordinators: booking.studentCoordinators,
    requestedBy: booking.requestedBy,
    assignedFacultyCoordinator: booking.assignedFacultyCoordinator,
    status: booking.status,
    currentReviewerRole: booking.currentReviewerRole,
    changeRequest: booking.changeRequest,
    reviewTrail: booking.reviewTrail,
    approvedAt: booking.approvedAt,
    requestedAt: booking.requestedAt,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

async function findBookingOr404(req, res) {
  const booking = await venueBookingModel.findById(req.params.bookingId);
  if (!booking) {
    res.status(404).json({ message: 'Venue booking request not found.' });
    return null;
  }

  return booking;
}

router.get('/public', async (req, res) => {
  const status = String(req.query.status || 'approved');
  const bookings = await venueBookingModel.findPublicBookings(status);
  res.json({ bookings: bookings.map(toBookingResponse) });
});

router.get('/availability', async (req, res) => {
  const venueId = Number(req.query.venueId);
  const date = String(req.query.date || '').trim();

  if (!venueId || !date) {
    return res.status(400).json({ message: 'venueId and date are required.' });
  }

  const activeBookings = await venueBookingModel.findAllActiveBookings();
  const filtered = activeBookings.filter((b) => b.venueId === venueId && b.date === date);
  return res.json({ bookings: filtered.map(toBookingResponse) });
});

router.use(requireAuth);

router.get('/mine', async (req, res) => {
  const allBookings = await venueBookingModel.findAllBookings();
  const bookings = allBookings.filter((b) => b.requestedBy?.id === req.user.id);
  res.json({ bookings: bookings.map(toBookingResponse) });
});

router.get('/inbox', async (req, res) => {
  const allBookings = await venueBookingModel.findAllBookings();
  let filtered = [];

  if (['faculty_coordinator', 'hod'].includes(req.user.role)) {
    filtered = allBookings.filter((b) => b.currentReviewerRole === 'faculty_coordinator');
  } else if (['principal', 'principal_dean'].includes(req.user.role)) {
    filtered = allBookings.filter((b) => b.currentReviewerRole === 'principal');
  } else {
    filtered = allBookings.filter((b) => b.requestedBy?.id === req.user.id);
  }

  res.json({ bookings: filtered.map(toBookingResponse) });
});

router.post('/', async (req, res) => {
  const allowedBookingRoles = ['student_coordinator', 'faculty_coordinator', 'hod', 'admin'];
  if (!allowedBookingRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Not authorized to request venue bookings.' });
  }

  const venueId = Number(req.body?.venueId);
  const date = String(req.body?.date || '').trim();
  const eventName = String(req.body?.eventName || '').trim();
  const hostClub = String(req.body?.hostClub || '').trim();
  const photo = String(req.body?.photo || '').trim();
  const photoFileName = String(req.body?.photoFileName || '').trim();
  const description = String(req.body?.description || '').trim();
  const eligibility = String(req.body?.eligibility || '').trim();
  const attendance = String(req.body?.attendance || '').trim();
  const feedback = String(req.body?.feedback || '').trim();
  const studentCoordinators = String(req.body?.studentCoordinators || '').trim();
  const slots = normalizeSlots(req.body?.timeSlots);

  if (!venueId || !date || !eventName || !hostClub || !photo || !photoFileName || !description || !eligibility || !attendance || !feedback || !studentCoordinators || slots.length === 0) {
    return res.status(400).json({ message: 'venueId, date, eventName, hostClub, photo, photoFileName, description, eligibility, attendance, feedback, studentCoordinators, and timeSlots are required.' });
  }

  const activeBookings = await venueBookingModel.findAllActiveBookings();
  const hasConflict = activeBookings.some((booking) => bookingOverlaps(booking, venueId, date, slots));
  if (hasConflict) {
    return res.status(409).json({ message: 'Selected time slots overlap with an existing booking.' });
  }

  const assignedFacultyCoordinator = await getAssignedFacultyCoordinator(hostClub);

  // Approval Routing:
  // Student -> Faculty -> Principal
  // HOD / Faculty Dept -> Principal directly
  const isDeptOrHod = ['hod', 'faculty_coordinator'].includes(req.user.role);
  const initialStatus = isDeptOrHod ? 'pending_principal' : 'pending_faculty';
  const initialReviewerRole = isDeptOrHod ? 'principal' : 'faculty_coordinator';

  const booking = await venueBookingModel.createBooking({
    venueId,
    date,
    timeSlots: slots,
    eventName,
    hostClub,
    photo,
    photoFileName,
    description,
    eligibility,
    attendance,
    feedback,
    studentCoordinators,
    requestedBy: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
    assignedFacultyCoordinator: {
      name: assignedFacultyCoordinator,
      email: '',
    },
    status: initialStatus,
    currentReviewerRole: initialReviewerRole,
    reviewTrail: [],
    changeRequest: {
      fromRole: '',
      notes: '',
      updatedAt: null,
    },
  });

  return res.status(201).json({
    booking: toBookingResponse(booking),
    notification: {
      role: initialReviewerRole,
      message: `A new venue booking request is waiting for ${initialReviewerRole === 'principal' ? 'Principal/Dean' : 'Faculty'} approval.`,
    },
  });
});

router.patch('/:bookingId/decision', async (req, res) => {
  if (!['faculty_coordinator', 'hod', 'principal', 'principal_dean'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Only faculty coordinators, HODs, and principals can review booking requests.' });
  }

  const decision = String(req.body?.decision || '').trim().toLowerCase();
  const notes = String(req.body?.notes || '').trim();
  if (!['allow', 'disallow'].includes(decision)) {
    return res.status(400).json({ message: 'decision must be allow or disallow.' });
  }

  const booking = await findBookingOr404(req, res);
  if (!booking) {
    return;
  }

  const isPrincipalRole = ['principal', 'principal_dean'].includes(req.user.role);
  const isFacultyOrHodRole = ['faculty_coordinator', 'hod'].includes(req.user.role);

  const reviewTrail = [...booking.reviewTrail, {
    role: req.user.role,
    decision,
    notes,
    reviewedBy: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
    },
    reviewedAt: new Date(),
  }];

  let status = booking.status;
  let currentReviewerRole = booking.currentReviewerRole;
  let changeRequest = booking.changeRequest;
  let approvedAt = booking.approvedAt;

  if (decision === 'allow') {
    if (booking.currentReviewerRole === 'faculty_coordinator' && isFacultyOrHodRole) {
      // Student request approved by Faculty -> moves to Principal approval
      status = 'pending_principal';
      currentReviewerRole = 'principal';
    } else {
      // Principal approval (or override approval) -> Final Approval!
      status = 'approved';
      currentReviewerRole = null;
      approvedAt = new Date();
    }
    changeRequest = {
      fromRole: '',
      notes: '',
      updatedAt: null,
    };
  } else {
    status = 'revision_requested';
    currentReviewerRole = isFacultyOrHodRole ? 'student_coordinator' : 'faculty_coordinator';
    changeRequest = {
      fromRole: req.user.role,
      notes,
      updatedAt: new Date(),
    };
  }

  const updatedBooking = await venueBookingModel.updateBooking(booking.id, {
    status,
    currentReviewerRole,
    changeRequest,
    reviewTrail,
    approvedAt,
  });

  return res.json({
    booking: toBookingResponse(updatedBooking),
    notification: {
      role: updatedBooking.currentReviewerRole || 'student_coordinator',
      message: decision === 'allow'
        ? (status === 'approved' ? 'Venue booking request has received FINAL APPROVAL and is live!' : 'Venue booking request moved to Principal approval.')
        : 'Venue booking request was returned with requested changes.',
    },
  });
});

router.patch('/:bookingId/resubmit', async (req, res) => {
  const booking = await findBookingOr404(req, res);
  if (!booking) {
    return;
  }

  const canResubmitAsStudent = req.user.role === 'student_coordinator';
  const canResubmitAsFaculty = ['faculty_coordinator', 'hod'].includes(req.user.role);

  if (!canResubmitAsStudent && !canResubmitAsFaculty) {
    return res.status(403).json({ message: 'You cannot resubmit this request in its current state.' });
  }

  const venueId = Number(req.body?.venueId || booking.venueId);
  const date = String(req.body?.date || booking.date).trim();
  const eventName = String(req.body?.eventName || booking.eventName).trim();
  const hostClub = String(req.body?.hostClub || booking.hostClub).trim();
  const photo = String(req.body?.photo || booking.photo || '').trim();
  const photoFileName = String(req.body?.photoFileName || booking.photoFileName || '').trim();
  const description = String(req.body?.description || booking.description || '').trim();
  const eligibility = String(req.body?.eligibility || booking.eligibility || '').trim();
  const attendance = String(req.body?.attendance || booking.attendance || '').trim();
  const feedback = String(req.body?.feedback || booking.feedback || '').trim();
  const studentCoordinators = String(req.body?.studentCoordinators || booking.studentCoordinators || '').trim();
  const slots = normalizeSlots(req.body?.timeSlots || booking.timeSlots);

  if (!venueId || !date || !eventName || !hostClub || !photo || !photoFileName || !description || !eligibility || !attendance || !feedback || !studentCoordinators || slots.length === 0) {
    return res.status(400).json({ message: 'venueId, date, eventName, hostClub, photo, photoFileName, description, eligibility, attendance, feedback, studentCoordinators, and timeSlots are required.' });
  }

  const activeBookings = await venueBookingModel.findAllActiveBookings();
  const hasConflict = activeBookings.some((existingBooking) => bookingOverlaps(existingBooking, venueId, date, slots, booking.id));

  if (hasConflict) {
    return res.status(409).json({ message: 'Updated time slots overlap with an existing booking.' });
  }

  const status = req.user.role === 'student_coordinator' ? 'pending_faculty' : 'pending_principal';
  const currentReviewerRole = req.user.role === 'student_coordinator' ? 'faculty_coordinator' : 'principal';
  const changeRequest = {
    fromRole: '',
    notes: '',
    updatedAt: null,
  };
  const reviewTrail = [...booking.reviewTrail, {
    role: req.user.role,
    decision: 'resubmitted',
    notes: String(req.body?.notes || '').trim(),
    reviewedBy: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
    },
    reviewedAt: new Date(),
  }];

  const updatedBooking = await venueBookingModel.updateBooking(booking.id, {
    venueId,
    date,
    timeSlots: slots,
    eventName,
    hostClub,
    photo,
    photoFileName,
    description,
    eligibility,
    attendance,
    feedback,
    studentCoordinators,
    status,
    currentReviewerRole,
    changeRequest,
    reviewTrail,
  });

  return res.json({
    booking: toBookingResponse(updatedBooking),
    notification: {
      role: updatedBooking.currentReviewerRole,
      message: 'Venue booking request was resubmitted after changes.',
    },
  });
});

module.exports = router;
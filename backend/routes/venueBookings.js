const express = require('express');
const VenueBooking = require('../models/VenueBooking');
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
  if (String(existingBooking._id) === String(excludeId)) {
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
    id: booking._id.toString(),
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
  const booking = await VenueBooking.findById(req.params.bookingId);
  if (!booking) {
    res.status(404).json({ message: 'Venue booking request not found.' });
    return null;
  }

  return booking;
}

router.get('/public', async (req, res) => {
  const status = String(req.query.status || 'approved');
  const bookings = await VenueBooking.find({ status }).sort({ date: 1, createdAt: -1 });
  res.json({ bookings: bookings.map(toBookingResponse) });
});

router.get('/availability', async (req, res) => {
  const venueId = Number(req.query.venueId);
  const date = String(req.query.date || '').trim();

  if (!venueId || !date) {
    return res.status(400).json({ message: 'venueId and date are required.' });
  }

  const bookings = await VenueBooking.find({ venueId, date, status: { $in: ACTIVE_STATUSES } }).sort({ createdAt: 1 });
  return res.json({ bookings: bookings.map(toBookingResponse) });
});

router.use(requireAuth);

router.get('/mine', async (req, res) => {
  const bookings = await VenueBooking.find({ 'requestedBy.id': req.user.id }).sort({ createdAt: -1 });
  res.json({ bookings: bookings.map(toBookingResponse) });
});

router.get('/inbox', async (req, res) => {
  let query = { 'requestedBy.id': req.user.id };

  if (req.user.role === 'faculty_coordinator') {
    query = { currentReviewerRole: 'faculty_coordinator' };
  } else if (req.user.role === 'principal') {
    query = { currentReviewerRole: 'principal' };
  }

  const bookings = await VenueBooking.find(query).sort({ updatedAt: -1, createdAt: -1 });
  res.json({ bookings: bookings.map(toBookingResponse) });
});

router.post('/', async (req, res) => {
  if (req.user.role !== 'student_coordinator') {
    return res.status(403).json({ message: 'Only student coordinators can request venue bookings.' });
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

  const activeBookings = await VenueBooking.find({ venueId, date, status: { $in: ACTIVE_STATUSES } });
  const hasConflict = activeBookings.some((booking) => bookingOverlaps(booking, venueId, date, slots));
  if (hasConflict) {
    return res.status(409).json({ message: 'Selected time slots overlap with an existing booking.' });
  }

  const assignedFacultyCoordinator = await getAssignedFacultyCoordinator(hostClub);

  const booking = await VenueBooking.create({
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
    status: 'pending_faculty',
    currentReviewerRole: 'faculty_coordinator',
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
      role: 'faculty_coordinator',
      message: 'A new venue booking request is waiting for faculty approval.',
    },
  });
});

router.patch('/:bookingId/decision', async (req, res) => {
  if (!['faculty_coordinator', 'principal'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Only faculty coordinators and principals can review booking requests.' });
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

  if (booking.currentReviewerRole !== req.user.role) {
    return res.status(409).json({ message: 'This request is not pending with your role.' });
  }

  booking.reviewTrail.push({
    role: req.user.role,
    decision,
    notes,
    reviewedBy: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
    },
    reviewedAt: new Date(),
  });

  if (decision === 'allow') {
    booking.status = req.user.role === 'faculty_coordinator' ? 'pending_principal' : 'approved';
    booking.currentReviewerRole = req.user.role === 'faculty_coordinator' ? 'principal' : null;
    booking.changeRequest = {
      fromRole: '',
      notes: '',
      updatedAt: null,
    };

    if (req.user.role === 'principal') {
      booking.approvedAt = new Date();
    }
  } else {
    booking.status = 'revision_requested';
    booking.currentReviewerRole = req.user.role === 'faculty_coordinator' ? 'student_coordinator' : 'faculty_coordinator';
    booking.changeRequest = {
      fromRole: req.user.role,
      notes,
      updatedAt: new Date(),
    };
  }

  await booking.save();

  return res.json({
    booking: toBookingResponse(booking),
    notification: {
      role: booking.currentReviewerRole || 'student_coordinator',
      message: decision === 'allow'
        ? 'Venue booking request moved to the next approval stage.'
        : 'Venue booking request was returned with requested changes.',
    },
  });
});

router.patch('/:bookingId/resubmit', async (req, res) => {
  const booking = await findBookingOr404(req, res);
  if (!booking) {
    return;
  }

  const canResubmitAsStudent = req.user.role === 'student_coordinator' && booking.currentReviewerRole === 'student_coordinator';
  const canResubmitAsFaculty = req.user.role === 'faculty_coordinator' && booking.currentReviewerRole === 'faculty_coordinator';

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

  const activeBookings = await VenueBooking.find({
    venueId,
    date,
    status: { $in: ACTIVE_STATUSES },
    _id: { $ne: booking._id },
  });

  const hasConflict = activeBookings.some((existingBooking) => bookingOverlaps(existingBooking, venueId, date, slots));
  if (hasConflict) {
    return res.status(409).json({ message: 'Updated time slots overlap with an existing booking.' });
  }

  booking.venueId = venueId;
  booking.date = date;
  booking.timeSlots = slots;
  booking.eventName = eventName;
  booking.hostClub = hostClub;
  booking.photo = photo;
  booking.photoFileName = photoFileName;
  booking.description = description;
  booking.eligibility = eligibility;
  booking.attendance = attendance;
  booking.feedback = feedback;
  booking.studentCoordinators = studentCoordinators;
  booking.status = req.user.role === 'student_coordinator' ? 'pending_faculty' : 'pending_principal';
  booking.currentReviewerRole = req.user.role === 'student_coordinator' ? 'faculty_coordinator' : 'principal';
  booking.changeRequest = {
    fromRole: '',
    notes: '',
    updatedAt: null,
  };
  booking.reviewTrail.push({
    role: req.user.role,
    decision: 'resubmitted',
    notes: String(req.body?.notes || '').trim(),
    reviewedBy: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
    },
    reviewedAt: new Date(),
  });

  await booking.save();

  return res.json({
    booking: toBookingResponse(booking),
    notification: {
      role: booking.currentReviewerRole,
      message: 'Venue booking request was resubmitted after changes.',
    },
  });
});

module.exports = router;
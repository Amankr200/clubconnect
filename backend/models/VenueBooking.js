const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema(
  {
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    role: { type: String, required: true },
    decision: { type: String, required: true },
    notes: { type: String, default: '' },
    reviewedBy: {
      id: { type: String, default: '' },
      name: { type: String, default: '' },
      email: { type: String, default: '' },
    },
    reviewedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const venueBookingSchema = new mongoose.Schema(
  {
    venueId: { type: Number, required: true },
    date: { type: String, required: true },
    timeSlots: { type: [timeSlotSchema], required: true },
    eventName: { type: String, required: true, trim: true },
    hostClub: { type: String, required: true, trim: true },
    photo: { type: String, required: true },
    photoFileName: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    eligibility: { type: String, required: true, trim: true },
    attendance: { type: String, required: true, trim: true },
    feedback: { type: String, required: true, trim: true },
    studentCoordinators: { type: String, required: true, trim: true },
    requestedBy: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      email: { type: String, required: true },
      role: { type: String, required: true },
    },
    assignedFacultyCoordinator: {
      name: { type: String, default: '' },
      email: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['pending_faculty', 'pending_principal', 'revision_requested', 'approved', 'rejected'],
      default: 'pending_faculty',
      index: true,
    },
    currentReviewerRole: {
      type: String,
      enum: ['student_coordinator', 'faculty_coordinator', 'principal', null],
      default: 'faculty_coordinator',
    },
    changeRequest: {
      fromRole: { type: String, default: '' },
      notes: { type: String, default: '' },
      updatedAt: { type: Date, default: null },
    },
    reviewTrail: { type: [reviewSchema], default: [] },
    approvedAt: { type: Date, default: null },
    requestedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VenueBooking', venueBookingSchema);
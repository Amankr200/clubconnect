const express = require('express');
const adminModel = require('../models/adminModel');
const societyModel = require('../models/societyModel');
const venueBookingModel = require('../models/venueBookingModel');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// POST /api/admin/society-registrations - Public or logged in user submit new society application
router.post('/society-registrations', async (req, res) => {
  try {
    const { societyName, category, description, requestedByEmail, requestedByName } = req.body;
    if (!societyName || !category || !description || !requestedByEmail || !requestedByName) {
      return res.status(400).json({ message: 'All fields are required for society registration.' });
    }

    const reg = await adminModel.createSocietyRegistration({
      societyName: societyName.trim(),
      category: category.trim(),
      description: description.trim(),
      requestedByEmail: requestedByEmail.trim(),
      requestedByName: requestedByName.trim(),
    });

    res.status(201).json({ registration: reg, message: 'Society registration application submitted!' });
  } catch (err) {
    console.error('[/api/admin/society-registrations POST]', err);
    res.status(500).json({ message: 'Failed to submit society registration.' });
  }
});

// Admin-only endpoints below
router.use(requireAuth);

router.use((req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access restricted to administrators.' });
  }
  next();
});

// GET /api/admin/society-registrations - List pending/approved registrations
router.get('/society-registrations', async (_req, res) => {
  try {
    const registrations = await adminModel.findAllSocietyRegistrations();
    res.json({ registrations });
  } catch (err) {
    console.error('[/api/admin/society-registrations GET]', err);
    res.status(500).json({ message: 'Failed to fetch society registrations.' });
  }
});

// PATCH /api/admin/society-registrations/:id/approve - Approve new society
router.patch('/society-registrations/:id/approve', async (req, res) => {
  try {
    const reg = await adminModel.updateSocietyRegistrationStatus(req.params.id, 'approved');
    if (reg) {
      // Auto-create society in societies table
      await societyModel.createSociety({
        name: reg.societyName,
        fullName: reg.societyName + ' Society',
        category: reg.category,
        description: reg.description,
        logo: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=150',
        banner: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800',
        rating: 4.5,
        facultyCoordinator: { name: 'Assigned Faculty', email: 'faculty@bpit.ac.in' },
        studentCoordinators: [{ name: reg.requestedByName, email: reg.requestedByEmail }],
      });
    }

    res.json({ registration: reg, message: 'Society approved and added to active societies!' });
  } catch (err) {
    console.error('[/api/admin/society-registrations/:id/approve]', err);
    res.status(500).json({ message: 'Failed to approve society.' });
  }
});

// GET /api/admin/venues - Get all venue availability & details
router.get('/venues', async (_req, res) => {
  try {
    const venues = await adminModel.findAllVenues();
    res.json({ venues });
  } catch (err) {
    console.error('[/api/admin/venues GET]', err);
    res.status(500).json({ message: 'Failed to fetch venues.' });
  }
});

// PATCH /api/admin/venues/:id/toggle - Toggle venue availability
router.patch('/venues/:id/toggle', async (req, res) => {
  try {
    const { isActive } = req.body;
    const venue = await adminModel.updateVenueStatus(Number(req.params.id), Boolean(isActive));
    res.json({ venue, message: `Venue status updated to ${isActive ? 'Available' : 'Unavailable'}.` });
  } catch (err) {
    console.error('[/api/admin/venues/:id/toggle]', err);
    res.status(500).json({ message: 'Failed to toggle venue status.' });
  }
});

// GET /api/admin/weekly-events - Tabular view of upcoming events for the week
router.get('/weekly-events', async (_req, res) => {
  try {
    const allBookings = await venueBookingModel.findAllBookings();

    // Filter upcoming approved or pending events in next 7 days
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const weeklyEvents = allBookings.filter((b) => {
      const bDate = new Date(b.date);
      return bDate >= new Date(today.setHours(0,0,0,0)) && bDate <= nextWeek;
    });

    res.json({ weeklyEvents });
  } catch (err) {
    console.error('[/api/admin/weekly-events]', err);
    res.status(500).json({ message: 'Failed to fetch weekly events.' });
  }
});

module.exports = router;

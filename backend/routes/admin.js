const express = require('express');
const bcrypt = require('bcryptjs');
const adminModel = require('../models/adminModel');
const userModel = require('../models/userModel');
const societyModel = require('../models/societyModel');
const venueBookingModel = require('../models/venueBookingModel');
const venueModel = require('../models/venue');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
const USER_ROLES = new Set([
  'admin',
  'student_coordinator',
  'faculty_coordinator',
  'hod',
  'principal',
  'dean',
]);

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

function getUserPayload(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    societyId: user.societyId,
  };
}

// GET /api/admin/users - List existing non-student accounts for user management
router.get('/users', async (_req, res) => {
  try {
    const users = await userModel.findAllUsers();
    res.json({ users: users.map(getUserPayload) });
  } catch (err) {
    console.error('[/api/admin/users GET]', err);
    res.status(500).json({ message: 'Failed to fetch users.' });
  }
});

// PATCH /api/admin/users/:id - Update an existing user account
router.patch('/users/:id', async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const role = typeof req.body.role === 'string' ? req.body.role : '';
    const department = typeof req.body.department === 'string' ? req.body.department.trim() : '';
    const societyId = req.body.societyId ? Number(req.body.societyId) : null;

    if (name.length < 2 || name.length > 255) {
      return res.status(400).json({ message: 'Name must be between 2 and 255 characters.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (!USER_ROLES.has(role)) {
      return res.status(400).json({ message: 'Select a valid role.' });
    }
    if (password && password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }
    if (societyId !== null && (!Number.isInteger(societyId) || societyId <= 0)) {
      return res.status(400).json({ message: 'Select a valid society.' });
    }
    if (societyId !== null && !(await societyModel.findSocietyById(societyId))) {
      return res.status(400).json({ message: 'Selected society was not found.' });
    }

    const passwordHash = password ? await bcrypt.hash(password, 12) : null;
    const updatedUser = await userModel.updateUser(req.params.id, {
      name,
      email,
      passwordHash,
      role,
      department,
      societyId,
    });
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({ user: getUserPayload(updatedUser), message: 'User updated successfully.' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    console.error('[/api/admin/users/:id PATCH]', err);
    return res.status(500).json({ message: 'Failed to update user.' });
  }
});

// DELETE /api/admin/users/:id - Delete an existing user account
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own admin account.' });
    }
    const deletedUser = await userModel.deleteUser(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }
    return res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    console.error('[/api/admin/users/:id DELETE]', err);
    res.status(500).json({ message: 'Failed to delete user.' });
  }
});


// POST /api/admin/users - Create a new user account
router.post('/users', async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const role = typeof req.body.role === 'string' ? req.body.role : '';
    const department = typeof req.body.department === 'string' ? req.body.department.trim() : '';
    const societyId = req.body.societyId ? Number(req.body.societyId) : null;

    if (name.length < 2 || name.length > 255) {
      return res.status(400).json({ message: 'Name must be between 2 and 255 characters.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }
    if (!USER_ROLES.has(role)) {
      return res.status(400).json({ message: 'Select a valid role.' });
    }
    if (department.length > 100) {
      return res.status(400).json({ message: 'Department must be 100 characters or fewer.' });
    }
    if (societyId !== null && (!Number.isInteger(societyId) || societyId <= 0)) {
      return res.status(400).json({ message: 'Select a valid society.' });
    }

    const society = societyId === null ? null : await societyModel.findSocietyById(societyId);
    if (societyId !== null && !society) {
      return res.status(400).json({ message: 'Selected society was not found.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const coordinator = await userModel.createUser({
      name,
      email,
      passwordHash,
      role,
      department,
      societyId,
    });

    return res.status(201).json({
      user: {
        id: coordinator.id,
        name: coordinator.name,
        email: coordinator.email,
        role: coordinator.role,
        department: coordinator.department,
        societyId: coordinator.societyId,
        societyName: society?.name || '',
      },
      message: 'Faculty coordinator account created successfully.',
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    console.error('[/api/admin/users POST]', err);
    return res.status(500).json({ message: 'Failed to create faculty coordinator account.' });
  }
});

// POST /api/admin/societies - Direct creation of a new society by Admin
router.post('/societies', async (req, res) => {
  try {
    const {
      name,
      fullName,
      category,
      description,
      vision,
      mission,
      logo,
      banner,
      facultyCoordinatorName,
      facultyCoordinatorEmail,
      studentCoordinatorName,
      studentCoordinatorEmail,
    } = req.body;

    if (!name || !category || !description) {
      return res.status(400).json({ message: 'Society Name, Category, and Description are required.' });
    }

    const facultyCoordObj = {
      name: (facultyCoordinatorName || 'Assigned Faculty').trim(),
      email: (facultyCoordinatorEmail || '').trim(),
    };

    const studentCoordObj = [{
      name: (studentCoordinatorName || 'Student Lead').trim(),
      email: (studentCoordinatorEmail || '').trim(),
    }];

    const newSociety = await societyModel.createSociety({
      name: name.trim(),
      fullName: (fullName || `${name} Society`).trim(),
      category: category.trim(),
      description: description.trim(),
      vision: vision?.trim() || '',
      mission: mission?.trim() || '',
      logo: String(logo || '').trim() || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=150',
      banner: String(banner || '').trim() || 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800',
      rating: 4.5,
      facultyCoordinator: facultyCoordObj,
      studentCoordinators: studentCoordObj,
    });

    // Create and auto-approve a registration record for tracking
    try {
      const reg = await adminModel.createSocietyRegistration({
        societyName: name.trim(),
        category: category.trim(),
        description: description.trim(),
        requestedByEmail: req.user.email || 'admin@bpit.ac.in',
        requestedByName: req.user.name || 'Platform Admin',
      });
      if (reg?.id) {
        await adminModel.updateSocietyRegistrationStatus(reg.id, 'approved');
      }
    } catch {}

    res.status(201).json({
      society: newSociety,
      message: `Society "${name}" created and published successfully!`,
    });
  } catch (err) {
    console.error('[/api/admin/societies POST]', err);
    res.status(500).json({ message: err.message || 'Failed to create society.' });
  }
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
    const venues = await venueModel.findAll();
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
    const venue = await venueModel.updateStatus(Number(req.params.id), Boolean(isActive));
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

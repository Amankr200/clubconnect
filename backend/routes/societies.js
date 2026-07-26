const express = require('express');
const societyModel = require('../models/societyModel');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// GET /api/societies - Public list of all societies
router.get('/', async (_req, res) => {
  try {
    const societies = await societyModel.findAllSocieties();
    res.json({ societies });
  } catch (err) {
    console.error('[/api/societies]', err);
    res.status(500).json({ message: 'Failed to fetch societies.' });
  }
});

// POST /api/societies - Create a new society (Admin / Coordinator)
router.post('/', requireAuth, async (req, res) => {
  try {
    if (!['admin', 'faculty_coordinator', 'hod', 'principal_dean'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only administrators and coordinators can create societies.' });
    }

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

    const society = await societyModel.createSociety({
      name: name.trim(),
      fullName: (fullName || `${name} Society`).trim(),
      category: category.trim(),
      description: description.trim(),
      vision: vision?.trim() || '',
      mission: mission?.trim() || '',
      logo: logo?.trim() || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=150',
      banner: banner?.trim() || 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800',
      rating: 4.5,
      facultyCoordinator: facultyCoordObj,
      studentCoordinators: studentCoordObj,
    });

    res.status(201).json({ society, message: `Society "${name}" created and published successfully!` });
  } catch (err) {
    console.error('[/api/societies POST]', err);
    res.status(500).json({ message: err.message || 'Failed to create society.' });
  }
});

// GET /api/societies/:name - Get single society details
router.get('/:name', async (req, res) => {
  try {
    const society = await societyModel.findSocietyByName(req.params.name);
    if (!society) {
      return res.status(404).json({ message: 'Society not found.' });
    }
    res.json({ society });
  } catch (err) {
    console.error('[/api/societies/:name]', err);
    res.status(500).json({ message: 'Failed to fetch society.' });
  }
});

// PATCH /api/societies/:name - Update society info (Faculty Coordinator / Admin only)
router.patch('/:name', requireAuth, async (req, res) => {
  try {
    if (!['faculty_coordinator', 'admin', 'hod', 'principal_dean'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to edit society details.' });
    }

    const { description, banner, logo, rating, facultyCoordinator, studentCoordinators } = req.body;
    const updated = await societyModel.updateSociety(req.params.name, {
      description,
      banner,
      logo,
      rating,
      facultyCoordinator,
      studentCoordinators,
    });

    if (!updated) {
      return res.status(404).json({ message: 'Society not found.' });
    }

    res.json({ society: updated, message: 'Society updated successfully.' });
  } catch (err) {
    console.error('[/api/societies/:name PATCH]', err);
    res.status(500).json({ message: 'Failed to update society.' });
  }
});

module.exports = router;

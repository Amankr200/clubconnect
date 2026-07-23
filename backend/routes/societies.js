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

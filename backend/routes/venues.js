const express = require('express');
const venueModel = require('../models/venue');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const venues = await venueModel.findAll({ includeInactive: false });
    res.json({ venues });
  } catch (error) {
    console.error('[/api/venues GET]', error);
    res.status(500).json({ message: 'Failed to fetch venues.' });
  }
});

module.exports = router;

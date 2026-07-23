const express = require('express');
const bugReportModel = require('../models/bugReportModel');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// POST /api/bugs - Submit a bug report from landing page
router.post('/', async (req, res) => {
  try {
    const { title, description, userEmail, pageUrl } = req.body;
    if (!title || !description || !userEmail) {
      return res.status(400).json({ message: 'title, description, and userEmail are required.' });
    }

    const bug = await bugReportModel.createBugReport({
      title: title.trim(),
      description: description.trim(),
      userEmail: userEmail.trim(),
      pageUrl: (pageUrl || '').trim(),
    });

    res.status(201).json({ bug, message: 'Bug report submitted successfully! Admin will review it.' });
  } catch (err) {
    console.error('[/api/bugs POST]', err);
    res.status(500).json({ message: 'Failed to submit bug report.' });
  }
});

// GET /api/bugs - Admin view all reported bugs
router.get('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can view bug reports.' });
    }

    const bugs = await bugReportModel.findAllBugReports();
    res.json({ bugs });
  } catch (err) {
    console.error('[/api/bugs GET]', err);
    res.status(500).json({ message: 'Failed to fetch bug reports.' });
  }
});

// PATCH /api/bugs/:id/status - Update bug report status (open/resolved)
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update bug report status.' });
    }

    const { status } = req.body;
    const updated = await bugReportModel.updateBugStatus(req.params.id, status || 'resolved');
    res.json({ bug: updated, message: 'Bug report status updated.' });
  } catch (err) {
    console.error('[/api/bugs/:id/status PATCH]', err);
    res.status(500).json({ message: 'Failed to update bug status.' });
  }
});

module.exports = router;

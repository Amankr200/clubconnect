const express = require('express');
const storyModel = require('../models/storyModel');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// GET /api/stories - Fetch all active (unexpired < 24h) stories
router.get('/', async (_req, res) => {
  try {
    const stories = await storyModel.findActiveStories();
    res.json({ stories });
  } catch (err) {
    console.error('[/api/stories GET]', err);
    res.status(500).json({ message: 'Failed to fetch active stories.' });
  }
});

// POST /api/stories - Add a new story (Student / Faculty Coordinator / HOD / Admin)
router.post('/', requireAuth, async (req, res) => {
  try {
    const allowedRoles = ['student_coordinator', 'faculty_coordinator', 'hod', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Only coordinators and heads can publish stories.' });
    }

    const { title, mediaUrl, mediaType } = req.body;
    if (!title || !mediaUrl) {
      return res.status(400).json({ message: 'title and mediaUrl are required.' });
    }

    const story = await storyModel.createStory({
      title: title.trim(),
      mediaUrl: mediaUrl.trim(),
      mediaType: mediaType || 'image',
      authorName: req.user.name,
      authorRole: req.user.role,
    });

    res.status(201).json({ story, message: 'Story published for 24 hours!' });
  } catch (err) {
    console.error('[/api/stories POST]', err);
    res.status(500).json({ message: 'Failed to publish story.' });
  }
});

// POST /api/stories/:id/view - Increment view counter
router.post('/:id/view', async (req, res) => {
  try {
    const story = await storyModel.incrementView(req.params.id);
    if (!story) {
      return res.status(404).json({ message: 'Story not found or expired.' });
    }
    res.json({ viewsCount: story.viewsCount });
  } catch (err) {
    console.error('[/api/stories/:id/view]', err);
    res.status(500).json({ message: 'Failed to increment view.' });
  }
});

// POST /api/stories/:id/click - Increment click counter
router.post('/:id/click', async (req, res) => {
  try {
    const story = await storyModel.incrementClick(req.params.id);
    if (!story) {
      return res.status(404).json({ message: 'Story not found or expired.' });
    }
    res.json({ clicksCount: story.clicksCount });
  } catch (err) {
    console.error('[/api/stories/:id/click]', err);
    res.status(500).json({ message: 'Failed to increment click.' });
  }
});

module.exports = router;

const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const eventFeedbackModel = require('../models/eventFeedbackModel');

const router = express.Router();
const EVENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isStudent(req) {
  return req.user?.role === 'student';
}

function isFacultyOrAdmin(req) {
  return ['faculty_coordinator', 'hod', 'admin'].includes(req.user?.role);
}

function sendFeedbackError(res, error) {
  const statuses = {
    EVENT_NOT_FOUND: 404,
    EVENT_NOT_APPROVED: 409,
    NOT_ELIGIBLE: 403,
    FEEDBACK_NOT_AVAILABLE: 403,
    FEEDBACK_EXPIRED: 410,
    DUPLICATE_FEEDBACK: 409,
    INVALID_RATING: 400,
    INVALID_FEEDBACK: 400,
    FORBIDDEN: 403,
    INVALID_EVENT_ID: 400,
  };

  const status = statuses[error?.code] || 500;
  if (status === 500) console.error('[event-feedback]', error);

  return res.status(status).json({
    success: false,
    code: error?.code || 'INTERNAL_SERVER_ERROR',
    message: error?.message || 'Unable to process event feedback request.',
  });
}

router.use(requireAuth);

router.get('/events/:eventId/feedback/status', async (req, res) => {
  if (!EVENT_ID_PATTERN.test(req.params.eventId)) {
    return res.status(404).json({ success: false, code: 'EVENT_NOT_FOUND', message: 'Event not found.' });
  }
  if (!isStudent(req)) {
    return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Only students can check feedback eligibility.' });
  }

  try {
    const result = await eventFeedbackModel.getFeedbackStateForStudent(req.params.eventId, req.user.id);
    return res.json({ success: true, feedback: result });
  } catch (error) {
    return sendFeedbackError(res, error);
  }
});

router.get('/event-feedbacks/me', async (req, res) => {
  if (!isStudent(req)) {
    return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Only students can view their feedback status.' });
  }

  try {
    const feedback = await eventFeedbackModel.listForStudent(req.user.id);
    return res.json({ success: true, feedback });
  } catch (error) {
    return sendFeedbackError(res, error);
  }
});

router.post('/events/:eventId/feedback', async (req, res) => {
  if (!EVENT_ID_PATTERN.test(req.params.eventId)) {
    return res.status(404).json({ success: false, code: 'EVENT_NOT_FOUND', message: 'Event not found.' });
  }
  if (!isStudent(req)) {
    return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Only students can submit feedback.' });
  }

  try {
    const feedback = await eventFeedbackModel.submitFeedback(req.params.eventId, req.user.id, req.body || {});
    return res.status(201).json({ success: true, feedback });
  } catch (error) {
    return sendFeedbackError(res, error);
  }
});

router.get('/events/:eventId/feedback/summary', async (req, res) => {
  if (!EVENT_ID_PATTERN.test(req.params.eventId)) {
    return res.status(404).json({ success: false, code: 'EVENT_NOT_FOUND', message: 'Event not found.' });
  }
  if (!isFacultyOrAdmin(req)) {
    return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Only faculty or administrators can view event feedback summaries.' });
  }

  try {
    const summary = await eventFeedbackModel.getEventSummary(req.params.eventId, req.user);
    return res.json({ success: true, summary });
  } catch (error) {
    return sendFeedbackError(res, error);
  }
});

router.get('/events/:eventId/feedback/responses', async (req, res) => {
  if (!EVENT_ID_PATTERN.test(req.params.eventId)) {
    return res.status(404).json({ success: false, code: 'EVENT_NOT_FOUND', message: 'Event not found.' });
  }
  if (!isFacultyOrAdmin(req)) {
    return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Only faculty or administrators can view individual responses.' });
  }

  try {
    const responses = await eventFeedbackModel.getEventResponses(req.params.eventId, req.user);
    return res.json({ success: true, responses });
  } catch (error) {
    return sendFeedbackError(res, error);
  }
});

router.get('/feedback/summary', async (req, res) => {
  if (!isFacultyOrAdmin(req)) {
    return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Only faculty or administrators can view feedback summaries.' });
  }

  try {
    const summary = await eventFeedbackModel.getSummaryForUser(req.user);
    return res.json({ success: true, summary });
  } catch (error) {
    return sendFeedbackError(res, error);
  }
});

module.exports = router;

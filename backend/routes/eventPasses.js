const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const eventPassModel = require('../models/eventPassModel');

const router = express.Router();

function requireStudent(req, res, next) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN',
      message: 'Only students can access event passes.',
    });
  }
  return next();
}

function sendPassError(res, error) {
  const statusMap = {
    REGISTRATION_NOT_FOUND: 404,
    EVENT_NOT_FOUND: 404,
    REGISTRATION_INACTIVE: 409,
    FORBIDDEN: 403,
  };
  const status = statusMap[error?.code] || 500;
  if (status === 500) console.error('[event-passes]', error);

  return res.status(status).json({
    success: false,
    code: error?.code || 'INTERNAL_SERVER_ERROR',
    message: status === 500 ? 'Unable to load event pass.' : error?.message || 'Request failed.',
  });
}

router.use('/event-passes', requireAuth, requireStudent);

router.get('/event-passes/my', async (req, res) => {
  try {
    return res.json(await eventPassModel.findAllForStudent(req.user.id));
  } catch (error) {
    return sendPassError(res, error);
  }
});

router.get('/event-passes/:registrationId', async (req, res) => {
  const registrationId = Number(req.params.registrationId);
  if (!Number.isSafeInteger(registrationId) || registrationId <= 0) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_REGISTRATION_ID',
      message: 'Registration ID must be a positive integer.',
    });
  }

  try {
    return res.json(await eventPassModel.getForStudent(registrationId, req.user.id));
  } catch (error) {
    return sendPassError(res, error);
  }
});

module.exports = router;

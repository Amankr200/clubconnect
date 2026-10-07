const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const registrationModel = require('../models/eventRegistrationModel');
const sendEmail = require('../notifications/mailer');

const router = express.Router();
const PORTAL_URL = process.env.PORTAL_URL || 'https://clubconnect-self.vercel.app/';

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function requireStudent(req, res, next) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN',
      message: 'Only students can manage event registrations.',
    });
  }
  return next();
}

function sendRegistrationError(res, error) {
  const statusMap = {
    EVENT_NOT_FOUND: 404,
    REGISTRATION_NOT_FOUND: 404,
    EVENT_NOT_APPROVED: 409,
    REGISTRATION_CLOSED: 409,
    CAPACITY_REACHED: 409,
    ALREADY_REGISTERED: 409,
    ALREADY_CANCELLED: 409,
    FORBIDDEN: 403,
  };

  const status = statusMap[error?.code] || 500;
  if (status === 500) {
    console.error('[event-registrations]', error);
  }

  return res.status(status).json({
    success: false,
    code: error?.code || 'INTERNAL_SERVER_ERROR',
    message: status === 500 ? 'Unable to process event registration.' : error?.message || 'Request failed.',
  });
}

router.post('/events/:eventId/register', requireAuth, requireStudent, async (req, res) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.eventId)) {
    return res.status(404).json({ success: false, code: 'EVENT_NOT_FOUND', message: 'Event not found.' });
  }

  try {
    const { event, student } = await registrationModel.register(req.params.eventId, req.user.id);

    const firstSlot = Array.isArray(event.time_slots) ? event.time_slots[0] : null;
    const lastSlot = Array.isArray(event.time_slots) ? event.time_slots[event.time_slots.length - 1] : null;
    const eventTime = firstSlot && lastSlot ? `${firstSlot.startTime} - ${lastSlot.endTime}` : 'Time not specified';
    const eventUrl = `${PORTAL_URL.replace(/\/$/, '')}/#events`;

    const subject = 'Event Registration Confirmed';
    const text = [
      `Hi ${student.name},`,
      '',
      `Your registration for ${event.event_name} is confirmed.`,
      `Date: ${event.event_date}`,
      `Time: ${eventTime}`,
      `Venue: ${event.venue_name || 'To be announced'}`,
      `Society: ${event.society_name || 'ClubConnect'}`,
      '',
      `View event details: ${eventUrl}`,
    ].join('\n');

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2>Event Registration Confirmed</h2>
        <p>Hi ${escapeHtml(student.name)},</p>
        <p>Your registration for <strong>${escapeHtml(event.event_name)}</strong> is confirmed.</p>
        <p>
          <strong>Date:</strong> ${escapeHtml(event.event_date)}<br>
          <strong>Time:</strong> ${escapeHtml(eventTime)}<br>
          <strong>Venue:</strong> ${escapeHtml(event.venue_name || 'To be announced')}<br>
          <strong>Society:</strong> ${escapeHtml(event.society_name || 'ClubConnect')}
        </p>
        <p><a href="${escapeHtml(eventUrl)}" style="display:inline-block;padding:10px 16px;background:#1A6B1A;color:#fff;text-decoration:none;border-radius:4px">View Event Details</a></p>
      </div>
    `;

    await sendEmail({
      to: student.email,
      subject,
      text,
      html,
    });

    return res.status(201).json({ success: true, message: 'Successfully registered.' });
  } catch (error) {
    return sendRegistrationError(res, error);
  }
});

router.get('/event-registrations/me', requireAuth, requireStudent, async (req, res) => {
  try {
    const rows = await registrationModel.findForStudent(req.user.id);
    return res.json(rows);
  } catch (error) {
    return sendRegistrationError(res, error);
  }
});

router.delete('/event-registrations/:id', requireAuth, requireStudent, async (req, res) => {
  const registrationId = Number(req.params.id);
  if (!Number.isInteger(registrationId) || registrationId <= 0) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_REGISTRATION_ID',
      message: 'Registration ID must be a positive integer.',
    });
  }

  try {
    await registrationModel.cancel(registrationId, req.user.id);
    return res.json({ success: true, message: 'Registration cancelled.' });
  } catch (error) {
    return sendRegistrationError(res, error);
  }
});

module.exports = router;

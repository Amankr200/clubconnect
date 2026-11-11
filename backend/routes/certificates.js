const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const certificateModel = require('../models/certificateModel');

const router = express.Router();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isStudent(req) {
  return req.user?.role === 'student';
}

function sendCertificateError(res, error) {
  const statuses = {
    FORBIDDEN: 403,
    SOCIETY_NOT_ASSIGNED: 403,
    SOCIETY_AMBIGUOUS: 409,
    TEMPLATE_NOT_FOUND: 404,
    EVENT_NOT_FOUND: 404,
    CERTIFICATE_NOT_FOUND: 404,
    CERTIFICATE_NOT_READY: 409,
    CERTIFICATE_NOT_FAILED: 409,
    INVALID_TEMPLATE: 400,
    INVALID_BACKGROUND: 400,
    INVALID_EVENT_ID: 400,
    INVALID_REASON: 400,
  };
  const status = statuses[error?.code] || 500;
  if (status === 500) console.error('[certificates]', error);
  return res.status(status).json({
    success: false,
    code: error?.code || 'INTERNAL_SERVER_ERROR',
    message: status === 500 ? 'Unable to process certificate request.' : error?.message || 'Request failed.',
  });
}

router.get('/verify/:token', async (req, res) => {
  try {
    const verification = await certificateModel.verifyPublic(req.params.token);
    return res.json({
      success: true,
      verification: verification || { valid: false },
    });
  } catch (error) {
    return sendCertificateError(res, error);
  }
});

router.use(requireAuth);

router.get('/templates', async (req, res) => {
  try {
    const result = await certificateModel.listTemplates(req.user);
    return res.json({ success: true, ...result });
  } catch (error) {
    return sendCertificateError(res, error);
  }
});

router.get('/templates/:templateGroupId', async (req, res) => {
  try {
    const template = await certificateModel.getTemplate(req.user, req.params.templateGroupId);
    return res.json({ success: true, template });
  } catch (error) {
    return sendCertificateError(res, error);
  }
});

router.post('/templates', async (req, res) => {
  try {
    const template = await certificateModel.createTemplate(req.user, req.body || {});
    return res.status(201).json({ success: true, template });
  } catch (error) {
    return sendCertificateError(res, error);
  }
});

router.put('/templates/:templateGroupId', async (req, res) => {
  try {
    const template = await certificateModel.updateTemplate(req.user, req.params.templateGroupId, req.body || {});
    return res.json({ success: true, template });
  } catch (error) {
    return sendCertificateError(res, error);
  }
});

router.patch('/templates/:templateGroupId/active', async (req, res) => {
  if (typeof req.body?.isActive !== 'boolean') {
    return res.status(400).json({ success: false, code: 'INVALID_STATUS', message: 'isActive must be a boolean.' });
  }
  try {
    const result = await certificateModel.setTemplateActive(
      req.user,
      req.params.templateGroupId,
      req.body.isActive,
    );
    if (req.body.isActive) {
      certificateModel.runCertificateWorker().catch((error) => console.error('[certificates] Worker trigger failed:', error));
    }
    return res.json({ success: true, ...result });
  } catch (error) {
    return sendCertificateError(res, error);
  }
});

router.get('/mine', async (req, res) => {
  if (!isStudent(req)) {
    return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Only students can view their certificates.' });
  }
  try {
    const certificates = await certificateModel.listForStudent(req.user.id);
    return res.json({ success: true, certificates });
  } catch (error) {
    return sendCertificateError(res, error);
  }
});

router.get('/mine/:certificateId/pdf', async (req, res) => {
  if (!isStudent(req)) {
    return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Only students can download their certificates.' });
  }
  if (!UUID_PATTERN.test(req.params.certificateId)) {
    return res.status(404).json({ success: false, code: 'CERTIFICATE_NOT_FOUND', message: 'Certificate not found.' });
  }
  try {
    const certificate = await certificateModel.getStudentPdf(req.user.id, req.params.certificateId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${certificate.certificate_id}.pdf"`);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.send(certificate.pdf_data);
  } catch (error) {
    return sendCertificateError(res, error);
  }
});

router.post('/:certificateId/reissue', async (req, res) => {
  try {
    const certificate = await certificateModel.reissue(req.user, req.params.certificateId, req.body?.reason);
    certificateModel.runCertificateWorker().catch((error) => console.error('[certificates] Worker trigger failed:', error));
    return res.status(201).json({ success: true, certificate });
  } catch (error) {
    return sendCertificateError(res, error);
  }
});

router.post('/:certificateId/retry', async (req, res) => {
  try {
    const result = await certificateModel.retryFailed(req.user, req.params.certificateId);
    certificateModel.runCertificateWorker().catch((error) => console.error('[certificates] Worker trigger failed:', error));
    return res.json({ success: true, ...result });
  } catch (error) {
    return sendCertificateError(res, error);
  }
});

module.exports = router;

const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const db = require('../db');

const FIELD_TYPES = new Set([
  'student_name',
  'enrollment_number',
  'event_name',
  'society_name',
  'event_date',
  'issue_date',
  'certificate_id',
  'signatory_name',
  'signatory_designation',
  'verification_qr',
]);
const FONT_FAMILIES = new Set(['Helvetica', 'Times-Roman', 'Courier']);
const ALIGNMENTS = new Set(['left', 'center', 'right']);

class CertificateError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function isUuid(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function validateTemplateConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new CertificateError('INVALID_TEMPLATE', 'Template configuration must be an object.');
  }

  const { width, height, orientation, fields } = config;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 100 || height < 100 || width > 1000 || height > 1000) {
    throw new CertificateError('INVALID_TEMPLATE', 'Page width and height must be between 100 and 1000 millimetres.');
  }
  if (!['landscape', 'portrait'].includes(orientation)
    || (orientation === 'landscape' && width <= height)
    || (orientation === 'portrait' && height <= width)) {
    throw new CertificateError('INVALID_TEMPLATE', 'Page dimensions must match the selected orientation.');
  }
  if (!Array.isArray(fields) || fields.length > 30) {
    throw new CertificateError('INVALID_TEMPLATE', 'A template must contain at most 30 fields.');
  }

  const fieldIds = new Set();
  const validatedFields = fields.map((field) => {
    if (!field || typeof field !== 'object' || Array.isArray(field)
      || typeof field.id !== 'string' || !/^[a-zA-Z0-9_-]{1,60}$/.test(field.id)
      || fieldIds.has(field.id) || !FIELD_TYPES.has(field.type)) {
      throw new CertificateError('INVALID_TEMPLATE', 'Template fields must have unique IDs and supported types.');
    }
    fieldIds.add(field.id);
    for (const key of ['x', 'y', 'width', 'height']) {
      if (!Number.isFinite(field[key]) || field[key] < 0 || field[key] > 1) {
        throw new CertificateError('INVALID_TEMPLATE', 'Field coordinates must be normalized between 0 and 1.');
      }
    }
    if (field.width <= 0 || field.height <= 0 || field.x + field.width > 1.001 || field.y + field.height > 1.001) {
      throw new CertificateError('INVALID_TEMPLATE', 'Field boundaries must fit within the certificate page.');
    }
    if (field.type === 'verification_qr') {
      return {
        id: field.id,
        type: field.type,
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
      };
    }
    if (!FONT_FAMILIES.has(field.fontFamily)
      || !Number.isFinite(field.fontSize) || field.fontSize < 6 || field.fontSize > 96
      || typeof field.bold !== 'boolean' || typeof field.italic !== 'boolean'
      || !/^#[0-9a-f]{6}$/i.test(field.color)
      || !ALIGNMENTS.has(field.align)
      || typeof field.wrap !== 'boolean'
      || !['clip', 'shrink'].includes(field.overflow)) {
      throw new CertificateError('INVALID_TEMPLATE', `Field "${field.id}" has unsupported text formatting.`);
    }
    return {
      id: field.id,
      type: field.type,
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height,
      fontFamily: field.fontFamily,
      fontSize: field.fontSize,
      bold: field.bold,
      italic: field.italic,
      color: field.color,
      align: field.align,
      wrap: field.wrap,
      overflow: field.overflow,
    };
  });
  return { width, height, orientation, fields: validatedFields };
}

function validateIssuableConfig(config) {
  const fieldTypes = new Set(config.fields.map((field) => field.type));
  if (!fieldTypes.has('certificate_id') || !fieldTypes.has('verification_qr')) {
    throw new CertificateError(
      'INVALID_TEMPLATE',
      'An active template must display a certificate ID and include a verification QR code.',
    );
  }
}

function decodeBackground(dataUrl) {
  if (typeof dataUrl !== 'string') {
    throw new CertificateError('INVALID_BACKGROUND', 'A PNG or JPEG background is required.');
  }
  const match = dataUrl.match(/^data:(image\/png|image\/jpeg);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) {
    throw new CertificateError('INVALID_BACKGROUND', 'Background must be a PNG or JPEG image.');
  }
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > 5 * 1024 * 1024) {
    throw new CertificateError('INVALID_BACKGROUND', 'Background images must be smaller than 5 MB.');
  }
  const isPng = match[1] === 'image/png' && buffer.length >= 24
    && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    && buffer.toString('ascii', 12, 16) === 'IHDR';
  const isJpeg = match[1] === 'image/jpeg' && buffer[0] === 0xff && buffer[1] === 0xd8
    && buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9;
  if (!isPng && !isJpeg) {
    throw new CertificateError('INVALID_BACKGROUND', 'Image content does not match the declared PNG or JPEG type.');
  }
  const dimensions = isPng ? { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) } : getJpegDimensions(buffer);
  if (!dimensions || dimensions.width < 1 || dimensions.height < 1
    || dimensions.width > 10_000 || dimensions.height > 10_000
    || dimensions.width * dimensions.height > 40_000_000) {
    throw new CertificateError('INVALID_BACKGROUND', 'Background image dimensions are invalid or too large.');
  }
  return { data: buffer, mime: match[1] };
}

function getJpegDimensions(buffer) {
  let offset = 2;
  while (offset + 4 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    offset += 2;
    if ([0xd8, 0xd9].includes(marker) || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) return null;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      if (segmentLength < 8) return null;
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += segmentLength;
  }
  return null;
}

function getFontName(field) {
  if (field.fontFamily === 'Times-Roman') {
    if (field.bold && field.italic) return 'Times-BoldItalic';
    if (field.bold) return 'Times-Bold';
    if (field.italic) return 'Times-Italic';
    return 'Times-Roman';
  }
  if (field.fontFamily === 'Courier') {
    if (field.bold && field.italic) return 'Courier-BoldOblique';
    if (field.bold) return 'Courier-Bold';
    if (field.italic) return 'Courier-Oblique';
    return 'Courier';
  }
  if (field.bold && field.italic) return 'Helvetica-BoldOblique';
  if (field.bold) return 'Helvetica-Bold';
  if (field.italic) return 'Helvetica-Oblique';
  return 'Helvetica';
}

async function createPdf({ config, backgroundData, fieldValues, verificationUrl }) {
  const qrImages = new Map(await Promise.all(
    config.fields
      .filter((field) => field.type === 'verification_qr')
      .map(async (field) => [field.id, await QRCode.toBuffer(verificationUrl, {
        type: 'png',
        errorCorrectionLevel: 'M',
        margin: 0,
        width: Math.max(128, Math.round(Math.max(field.width, field.height) * Math.max(config.width, config.height) * 2.8346)),
      })]),
  ));
  return new Promise((resolve, reject) => {
    const width = config.width * 72 / 25.4;
    const height = config.height * 72 / 25.4;
    const document = new PDFDocument({ size: [width, height], margin: 0, compress: true });
    const chunks = [];
    document.on('data', (chunk) => chunks.push(chunk));
    document.on('error', reject);
    document.on('end', () => resolve(Buffer.concat(chunks)));

    try {
      document.image(backgroundData, 0, 0, { width, height });
      for (const field of config.fields) {
        const x = field.x * width;
        const y = field.y * height;
        const boxWidth = field.width * width;
        const boxHeight = field.height * height;
        if (field.type === 'verification_qr') {
          const qrSize = Math.min(boxWidth, boxHeight);
          document.image(qrImages.get(field.id), x + (boxWidth - qrSize) / 2, y + (boxHeight - qrSize) / 2, {
            width: qrSize,
            height: qrSize,
          });
          continue;
        }

        const value = String(fieldValues[field.type] ?? '');
        let fontSize = field.fontSize;
        document.font(getFontName(field)).fontSize(fontSize);
        if (field.overflow === 'shrink') {
          const widthRatio = document.widthOfString(value) / Math.max(boxWidth, 1);
          const heightRatio = fontSize * (field.wrap ? Math.max(1, Math.ceil(widthRatio)) : 1) * 1.2 / Math.max(boxHeight, 1);
          const scale = Math.min(1, 1 / widthRatio, 1 / heightRatio);
          fontSize = Math.max(6, fontSize * scale);
        }
        document.save();
        document.rect(x, y, boxWidth, boxHeight).clip();
        document.font(getFontName(field))
          .fontSize(fontSize)
          .fillColor(field.color)
          .text(value, x, y, {
            width: boxWidth,
            height: boxHeight,
            align: field.align,
            lineBreak: field.wrap,
            ellipsis: field.overflow === 'clip',
          });
        document.restore();
      }
      document.end();
    } catch (error) {
      reject(error);
    }
  });
}

async function findSocietyForFaculty(client, user, societyId = null) {
  if (user?.role !== 'faculty_coordinator') {
    throw new CertificateError('FORBIDDEN', 'Only faculty coordinators can manage certificate templates.');
  }
  const result = await client.query(
    `WITH account AS (
       SELECT id, role, email, society_id
       FROM users
       WHERE id::text = $2
     ),
     candidate_societies AS (
       SELECT society.id, society.name, society.faculty_coordinator,
         CASE WHEN society.id = account.society_id THEN 0 ELSE 1 END AS match_priority
       FROM societies AS society
       JOIN account ON account.role = 'faculty_coordinator'
       WHERE (
         (account.society_id IS NOT NULL AND society.id = account.society_id)
         OR (
           account.society_id IS NULL
           AND (
             ($1 <> '' AND lower(COALESCE(society.faculty_coordinator->>'email', '')) = lower($1))
             OR lower(COALESCE(society.faculty_coordinator->>'id', '')) = lower($2)
           )
         )
       )
         AND ($3::integer IS NULL OR society.id = $3)
     )
     SELECT id, name, faculty_coordinator
     FROM candidate_societies
     WHERE match_priority = (SELECT MIN(match_priority) FROM candidate_societies)
     LIMIT 2`,
    [user.email || '', String(user.id), societyId],
  );
  if (!result.rows.length) {
    throw new CertificateError(
      societyId ? 'FORBIDDEN' : 'SOCIETY_NOT_ASSIGNED',
      societyId
        ? 'The requested society is not assigned to your faculty account.'
        : 'No society is linked to your faculty account. Ask an administrator to assign your faculty profile to the correct society.',
    );
  }
  if (result.rows.length > 1) {
    throw new CertificateError('SOCIETY_AMBIGUOUS', 'Your account is assigned to more than one society. Contact an administrator.');
  }
  return result.rows[0];
}

async function validateEventContext(client, societyId, eventId) {
  if (eventId === null || eventId === undefined || eventId === '') return null;
  if (!isUuid(eventId)) throw new CertificateError('INVALID_EVENT_ID', 'Event ID is invalid.');
  const event = await client.query(
    'SELECT id FROM venue_bookings WHERE id = $1 AND host_club = $2',
    [eventId, societyId],
  );
  if (!event.rows[0]) throw new CertificateError('EVENT_NOT_FOUND', 'Event was not found in your society.');
  return eventId;
}

function formatTemplate(row, includeBackground = false) {
  return {
    id: row.id,
    templateGroupId: row.template_group_id,
    societyId: row.society_id,
    eventId: row.event_id,
    eventName: row.event_name || null,
    name: row.name,
    version: row.version,
    config: row.config,
    backgroundMime: row.background_mime,
    backgroundData: includeBackground
      ? `data:${row.background_mime};base64,${row.background_data.toString('base64')}`
      : undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

async function listTemplates(user) {
  const client = await db.pool.connect();
  try {
    const society = await findSocietyForFaculty(client, user);
    const result = await client.query(
      `SELECT DISTINCT ON (template.template_group_id)
         template.*, event.event_name
       FROM certificate_templates AS template
       LEFT JOIN venue_bookings AS event ON event.id = template.event_id
       WHERE template.society_id = $1
       ORDER BY template.template_group_id, template.version DESC`,
      [society.id],
    );
    const events = await client.query(
      `SELECT id, event_name, date
       FROM venue_bookings
       WHERE host_club = $1
       ORDER BY date DESC, event_name ASC`,
      [society.id],
    );
    return {
      society: { id: society.id, name: society.name },
      templates: result.rows.map((row) => formatTemplate(row)),
      events: events.rows.map((row) => ({ id: row.id, eventName: row.event_name, date: row.date })),
    };
  } finally {
    client.release();
  }
}

async function getTemplate(user, templateGroupId) {
  if (!isUuid(templateGroupId)) throw new CertificateError('TEMPLATE_NOT_FOUND', 'Template not found.');
  const client = await db.pool.connect();
  try {
    const society = await findSocietyForFaculty(client, user);
    const result = await client.query(
      `SELECT template.*, event.event_name
       FROM certificate_templates AS template
       LEFT JOIN venue_bookings AS event ON event.id = template.event_id
       WHERE template.template_group_id = $1 AND template.society_id = $2
       ORDER BY template.version DESC LIMIT 1`,
      [templateGroupId, society.id],
    );
    if (!result.rows[0]) throw new CertificateError('TEMPLATE_NOT_FOUND', 'Template not found.');
    return formatTemplate(result.rows[0], true);
  } finally {
    client.release();
  }
}

async function createTemplate(user, payload) {
  const config = validateTemplateConfig(payload?.config);
  const { data: backgroundData, mime: backgroundMime } = decodeBackground(payload?.backgroundData);
  const name = typeof payload?.name === 'string' ? payload.name.trim() : '';
  if (!name || name.length > 120) throw new CertificateError('INVALID_TEMPLATE', 'Template name is required and must be 120 characters or fewer.');
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const society = await findSocietyForFaculty(client, user);
    const eventId = await validateEventContext(client, society.id, payload.eventId);
    const templateGroupId = crypto.randomUUID();
    const isActive = payload.isActive === true;
    if (isActive) {
      validateIssuableConfig(config);
      await client.query(
        `UPDATE certificate_templates SET is_active = FALSE
         WHERE society_id = $1
           AND (
             event_id IS NOT DISTINCT FROM $2::uuid
             OR event_id IS NOT DISTINCT FROM $3::uuid
           )
           AND is_active = TRUE`,
        [society.id, current.event_id, eventId],
      );
    }
    const result = await client.query(
      `INSERT INTO certificate_templates (
         template_group_id, society_id, event_id, name, version, config,
         background_data, background_mime, is_active, created_by
       )
       VALUES ($1, $2, $3, $4, 1, $5::jsonb, $6, $7, $8, $9)
       RETURNING *`,
      [templateGroupId, society.id, eventId, name, JSON.stringify(config), backgroundData, backgroundMime, isActive, user.id],
    );
    await client.query('COMMIT');
    return formatTemplate(result.rows[0], true);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateTemplate(user, templateGroupId, payload) {
  if (!isUuid(templateGroupId)) throw new CertificateError('TEMPLATE_NOT_FOUND', 'Template not found.');
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const society = await findSocietyForFaculty(client, user);
    const currentResult = await client.query(
      `SELECT * FROM certificate_templates
       WHERE template_group_id = $1 AND society_id = $2
       ORDER BY version DESC LIMIT 1 FOR UPDATE`,
      [templateGroupId, society.id],
    );
    const current = currentResult.rows[0];
    if (!current) throw new CertificateError('TEMPLATE_NOT_FOUND', 'Template not found.');
    const config = validateTemplateConfig(payload?.config ?? current.config);
    const name = payload?.name === undefined ? current.name : String(payload.name).trim();
    if (!name || name.length > 120) throw new CertificateError('INVALID_TEMPLATE', 'Template name is required and must be 120 characters or fewer.');
    const eventId = payload?.eventId === undefined
      ? current.event_id
      : await validateEventContext(client, society.id, payload.eventId);
    const background = payload?.backgroundData === undefined
      ? { data: current.background_data, mime: current.background_mime }
      : decodeBackground(payload.backgroundData);
    const isActive = current.is_active;
    if (isActive) {
      validateIssuableConfig(config);
      await client.query(
        `UPDATE certificate_templates SET is_active = FALSE
         WHERE society_id = $1 AND event_id IS NOT DISTINCT FROM $2::uuid AND is_active = TRUE`,
        [society.id, eventId],
      );
    }
    const result = await client.query(
      `INSERT INTO certificate_templates (
         template_group_id, society_id, event_id, name, version, config,
         background_data, background_mime, is_active, created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)
       RETURNING *`,
      [
        templateGroupId, society.id, eventId, name, current.version + 1,
        JSON.stringify(config), background.data, background.mime, isActive, user.id,
      ],
    );
    await client.query('COMMIT');
    return formatTemplate(result.rows[0], true);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function setTemplateActive(user, templateGroupId, active) {
  if (!isUuid(templateGroupId)) throw new CertificateError('TEMPLATE_NOT_FOUND', 'Template not found.');
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const society = await findSocietyForFaculty(client, user);
    const result = await client.query(
      `SELECT * FROM certificate_templates
       WHERE template_group_id = $1 AND society_id = $2
       ORDER BY version DESC LIMIT 1 FOR UPDATE`,
      [templateGroupId, society.id],
    );
    const template = result.rows[0];
    if (!template) throw new CertificateError('TEMPLATE_NOT_FOUND', 'Template not found.');
    if (active) {
      validateIssuableConfig(template.config);
      await client.query(
        `UPDATE certificate_templates SET is_active = FALSE
         WHERE society_id = $1 AND event_id IS NOT DISTINCT FROM $2::uuid AND is_active = TRUE`,
        [society.id, template.event_id],
      );
      await client.query('UPDATE certificate_templates SET is_active = TRUE WHERE id = $1', [template.id]);
    } else {
      await client.query('UPDATE certificate_templates SET is_active = FALSE WHERE id = $1', [template.id]);
    }
    await client.query('COMMIT');
    return { templateGroupId, isActive: active };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function formatIssueDate(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function makeCertificateValues(row, certificateId, issuedAt = new Date()) {
  const signatory = row.faculty_coordinator || {};
  return {
    student_name: row.student_name,
    enrollment_number: String(row.student_id),
    event_name: row.event_name,
    society_name: row.society_name,
    event_date: row.event_date,
    issue_date: formatIssueDate(issuedAt),
    certificate_id: certificateId,
    signatory_name: signatory.name || '',
    signatory_designation: signatory.designation || 'Faculty Coordinator',
  };
}

function getVerificationUrl(token) {
  const baseUrl = (process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  return `${baseUrl}/verify/${encodeURIComponent(token)}`;
}

async function enqueueEligibleCertificates() {
  const eligible = await db.query(
    `SELECT
       event.id AS event_id,
       event.event_name,
       event.date AS event_date,
       event.host_club AS society_id,
       society.name AS society_name,
       society.faculty_coordinator,
       student.enrollment_id AS student_id,
       student.name AS student_name,
       template.id AS template_id,
       template.name AS template_name,
       template.version AS template_version,
       template.config AS template_config,
       template.background_mime
     FROM event_registrations AS registration
     JOIN venue_bookings AS event ON event.id = registration.event_id
     JOIN event_attendance AS attendance
       ON attendance.registration_id = registration.id AND attendance.attendance_status = TRUE
     JOIN event_feedbacks AS feedback
       ON feedback.event_id = event.id AND feedback.student_id = registration.student_id
     JOIN students AS student ON student.enrollment_id = registration.student_id
     JOIN societies AS society ON society.id = event.host_club
     JOIN LATERAL (
       SELECT candidate.*
       FROM certificate_templates AS candidate
       WHERE candidate.society_id = society.id
         AND candidate.is_active = TRUE
         AND (candidate.event_id = event.id OR candidate.event_id IS NULL)
       ORDER BY (candidate.event_id IS NOT NULL) DESC
       LIMIT 1
     ) AS template ON TRUE
     WHERE NOT EXISTS (
         SELECT 1 FROM certificates AS existing
         WHERE existing.event_id = event.id AND existing.student_id = student.enrollment_id
           AND existing.status <> 'REVOKED'
       )
     ORDER BY event.id, student.enrollment_id`,
  );

  for (const row of eligible.rows) {
    const issuedAt = new Date();
    const token = crypto.randomBytes(32).toString('hex');
    const certificateId = `CC-${token}`;
    const fieldValues = makeCertificateValues(row, certificateId, issuedAt);
    const templateSnapshot = {
      name: row.template_name,
      version: row.template_version,
      config: row.template_config,
      backgroundMime: row.background_mime,
    };
    await db.query(
      `INSERT INTO certificates (
         certificate_id, verification_token, event_id, student_id, society_id,
         template_version_id, template_snapshot, field_values, issued_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9)
       ON CONFLICT (event_id, student_id) WHERE status <> 'REVOKED' DO NOTHING`,
      [
        certificateId, token, row.event_id, row.student_id, row.society_id,
        row.template_id, JSON.stringify(templateSnapshot), JSON.stringify(fieldValues), issuedAt,
      ],
    );
  }
}

async function claimPendingCertificates(limit = 8) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT id, certificate_id, verification_token, template_version_id, template_snapshot, field_values
       FROM certificates
       WHERE (
         status IN ('PENDING', 'FAILED') AND next_attempt_at <= NOW()
       ) OR (
         status = 'GENERATING' AND generation_started_at < NOW() - INTERVAL '10 minutes'
       )
       ORDER BY created_at
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [limit],
    );
    for (const certificate of result.rows) {
      await client.query(
        `UPDATE certificates
         SET status = 'GENERATING', attempt_count = attempt_count + 1,
             generation_started_at = NOW(), last_error = NULL
         WHERE id = $1`,
        [certificate.id],
      );
    }
    await client.query('COMMIT');
    return result.rows;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function generateCertificatePdf(certificate) {
  const templateResult = await db.query(
    'SELECT config, background_data FROM certificate_templates WHERE id = $1',
    [certificate.template_version_id],
  );
  if (!templateResult.rows[0]) throw new Error('Certificate template snapshot is unavailable.');
  const pdf = await createPdf({
    config: certificate.template_snapshot.config,
    backgroundData: templateResult.rows[0].background_data,
    fieldValues: certificate.field_values,
    verificationUrl: getVerificationUrl(certificate.verification_token),
  });
  await db.query(
    `UPDATE certificates
     SET status = 'GENERATED', pdf_data = $2, generation_started_at = NULL,
         last_error = NULL
     WHERE id = $1 AND status = 'GENERATING'`,
    [certificate.id, pdf],
  );
}

async function markGenerationFailed(certificate, error) {
  const message = String(error?.message || 'PDF generation failed.').slice(0, 1000);
  await db.query(
    `UPDATE certificates
     SET status = 'FAILED',
         next_attempt_at = NOW() + LEAST(INTERVAL '1 hour', INTERVAL '1 minute' * power(2, LEAST(attempt_count, 6))),
         generation_started_at = NULL, last_error = $2
     WHERE id = $1 AND status = 'GENERATING'`,
    [certificate.id, message],
  );
  console.error(`[certificates] PDF generation failed for ${certificate.certificate_id}: ${message}`);
}

let workerRunning = false;

async function runCertificateWorker() {
  if (workerRunning) return;
  workerRunning = true;
  try {
    await enqueueEligibleCertificates();
    const pending = await claimPendingCertificates();
    for (const certificate of pending) {
      try {
        await generateCertificatePdf(certificate);
      } catch (error) {
        await markGenerationFailed(certificate, error);
      }
    }
  } finally {
    workerRunning = false;
  }
}

function startCertificateWorker() {
  const timer = setInterval(() => {
    runCertificateWorker().catch((error) => console.error('[certificates] Worker cycle failed:', error));
  }, 30_000);
  timer.unref();
  runCertificateWorker().catch((error) => console.error('[certificates] Initial worker cycle failed:', error));
  return timer;
}

async function listForStudent(studentId) {
  const result = await db.query(
    `SELECT certificate.id, certificate.certificate_id, certificate.verification_token,
       certificate.status, certificate.issued_at, event.event_name, event.date AS event_date,
       society.name AS society_name
     FROM certificates AS certificate
     JOIN venue_bookings AS event ON event.id = certificate.event_id
     JOIN societies AS society ON society.id = certificate.society_id
     WHERE certificate.student_id = $1 AND certificate.status <> 'REVOKED'
     ORDER BY certificate.issued_at DESC`,
    [studentId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    certificateId: row.certificate_id,
    status: row.status,
    issuedAt: row.issued_at,
    eventName: row.event_name,
    eventDate: row.event_date,
    societyName: row.society_name,
    verificationUrl: `/verify/${encodeURIComponent(row.verification_token)}`,
  }));
}

async function getStudentPdf(studentId, certificateId) {
  if (!isUuid(certificateId)) throw new CertificateError('CERTIFICATE_NOT_FOUND', 'Certificate not found.');
  const result = await db.query(
    `SELECT certificate_id, pdf_data
     FROM certificates
     WHERE id = $1 AND student_id = $2 AND status = 'GENERATED'`,
    [certificateId, studentId],
  );
  if (!result.rows[0]) throw new CertificateError('CERTIFICATE_NOT_FOUND', 'Certificate not found.');
  return result.rows[0];
}

async function verifyPublic(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
  const result = await db.query(
    `SELECT certificate.certificate_id, event.event_name, society.name AS society_name,
       certificate.issued_at
     FROM certificates AS certificate
     JOIN venue_bookings AS event ON event.id = certificate.event_id
     JOIN societies AS society ON society.id = certificate.society_id
     WHERE certificate.verification_token = $1 AND certificate.status = 'GENERATED'`,
    [token],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    valid: true,
    certificateId: row.certificate_id,
    eventName: row.event_name,
    societyName: row.society_name,
    issuedAt: row.issued_at,
  };
}

async function reissue(user, certificateId, reason) {
  if (!isUuid(certificateId)) throw new CertificateError('CERTIFICATE_NOT_FOUND', 'Certificate not found.');
  const cleanedReason = typeof reason === 'string' ? reason.trim() : '';
  if (cleanedReason.length < 10 || cleanedReason.length > 500) {
    throw new CertificateError('INVALID_REASON', 'A reissue reason between 10 and 500 characters is required.');
  }
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const previousResult =     await client.query(
      `SELECT certificate.*
       FROM certificates AS certificate
       WHERE certificate.id = $1
       FOR UPDATE OF certificate`,
      [certificateId],
    );
    const previous = previousResult.rows[0];
    if (!previous) throw new CertificateError('CERTIFICATE_NOT_FOUND', 'Certificate not found.');
    await findSocietyForFaculty(client, user, previous.society_id);
    if (previous.status !== 'GENERATED') {
      throw new CertificateError('CERTIFICATE_NOT_READY', 'Only an issued certificate can be reissued.');
    }
    const activeTemplate = await client.query(
      `SELECT * FROM certificate_templates
       WHERE society_id = $1 AND is_active = TRUE
         AND (event_id = $2 OR event_id IS NULL)
       ORDER BY (event_id IS NOT NULL) DESC LIMIT 1`,
      [previous.society_id, previous.event_id],
    );
    const template = activeTemplate.rows[0] || await client.query(
      'SELECT * FROM certificate_templates WHERE id = $1',
      [previous.template_version_id],
    ).then((result) => result.rows[0]);
    const token = crypto.randomBytes(32).toString('hex');
    const newCertificateId = `CC-${token}`;
    const issuedAt = new Date();
    const fieldValues = {
      ...previous.field_values,
      issue_date: formatIssueDate(issuedAt),
      certificate_id: newCertificateId,
    };
    const snapshot = {
      name: template.name,
      version: template.version,
      config: template.config,
      backgroundMime: template.background_mime,
    };
    await client.query(
      `UPDATE certificates SET status = 'REVOKED' WHERE id = $1`,
      [previous.id],
    );
    const nextResult = await client.query(
      `INSERT INTO certificates (
         certificate_id, verification_token, event_id, student_id, society_id,
         template_version_id, template_snapshot, field_values, issued_at, reissued_from
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10)
       RETURNING id`,
      [
        newCertificateId, token, previous.event_id, previous.student_id, previous.society_id,
        template.id, JSON.stringify(snapshot), JSON.stringify(fieldValues), issuedAt, previous.id,
      ],
    );
    await client.query(
      `INSERT INTO certificate_audit (action, previous_certificate_id, new_certificate_id, actor_id, reason)
       VALUES ('REISSUE', $1, $2, $3, $4)`,
      [previous.id, nextResult.rows[0].id, user.id, cleanedReason],
    );
    await client.query('COMMIT');
    return { id: nextResult.rows[0].id, certificateId: newCertificateId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function retryFailed(user, certificateId) {
  if (!isUuid(certificateId)) throw new CertificateError('CERTIFICATE_NOT_FOUND', 'Certificate not found.');
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'SELECT id, society_id, status FROM certificates WHERE id = $1 FOR UPDATE',
      [certificateId],
    );
    const certificate = result.rows[0];
    if (!certificate) throw new CertificateError('CERTIFICATE_NOT_FOUND', 'Certificate not found.');
    await findSocietyForFaculty(client, user, certificate.society_id);
    if (certificate.status !== 'FAILED') {
      throw new CertificateError('CERTIFICATE_NOT_FAILED', 'Only failed certificate generation can be retried.');
    }
    await client.query(
      `UPDATE certificates SET status = 'PENDING', next_attempt_at = NOW(), last_error = NULL
       WHERE id = $1`,
      [certificateId],
    );
    await client.query('COMMIT');
    return { queued: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  CertificateError,
  validateTemplateConfig,
  decodeBackground,
  createPdf,
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  setTemplateActive,
  listForStudent,
  getStudentPdf,
  verifyPublic,
  reissue,
  retryFailed,
  runCertificateWorker,
  startCertificateWorker,
};

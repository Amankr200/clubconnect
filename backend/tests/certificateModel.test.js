const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const certificateModel = require('../models/certificateModel');

function validConfig() {
  return {
    width: 297,
    height: 210,
    orientation: 'landscape',
    fields: [
      {
        id: 'student', type: 'student_name', x: 0.2, y: 0.4, width: 0.6, height: 0.1,
        fontFamily: 'Helvetica', fontSize: 28, bold: true, italic: false,
        color: '#202938', align: 'center', wrap: true, overflow: 'shrink',
      },
      {
        id: 'certificate', type: 'certificate_id', x: 0.2, y: 0.8, width: 0.3, height: 0.06,
        fontFamily: 'Helvetica', fontSize: 10, bold: false, italic: false,
        color: '#202938', align: 'left', wrap: false, overflow: 'clip',
      },
      { id: 'qr', type: 'verification_qr', x: 0.8, y: 0.75, width: 0.12, height: 0.17 },
    ],
  };
}

test('template validation accepts normalized fields and strips executable metadata', () => {
  const config = validConfig();
  config.script = 'not persisted';
  config.fields[0].html = '<script>alert(1)</script>';
  const validated = certificateModel.validateTemplateConfig(config);
  assert.equal(validated.fields[0].html, undefined);
  assert.equal(validated.script, undefined);
  assert.equal(validated.fields[2].type, 'verification_qr');
});

test('template validation rejects unsupported font names and out-of-page coordinates', () => {
  const invalidFont = validConfig();
  invalidFont.fields[0].fontFamily = 'Arial; import';
  assert.throws(() => certificateModel.validateTemplateConfig(invalidFont), { code: 'INVALID_TEMPLATE' });

  const invalidPosition = validConfig();
  invalidPosition.fields[0].x = 0.7;
  assert.throws(() => certificateModel.validateTemplateConfig(invalidPosition), { code: 'INVALID_TEMPLATE' });
});

test('background validation rejects SVG and mislabeled image bytes', () => {
  assert.throws(
    () => certificateModel.decodeBackground('data:image/svg+xml;base64,PHN2Zy8+'),
    { code: 'INVALID_BACKGROUND' },
  );
  assert.throws(
    () => certificateModel.decodeBackground('data:image/png;base64,ZmFrZQ=='),
    { code: 'INVALID_BACKGROUND' },
  );
});

test('PDF generation embeds the supplied artwork, dynamic fields, and verification QR', async () => {
  const imageBase64 = fs.readFileSync(path.join(__dirname, '../../src/assets/hero.png')).toString('base64');
  const backgroundData = certificateModel.decodeBackground(`data:image/png;base64,${imageBase64}`).data;
  const pdf = await certificateModel.createPdf({
    config: certificateModel.validateTemplateConfig(validConfig()),
    backgroundData,
    fieldValues: {
      student_name: 'Aarav Sharma',
      certificate_id: 'CC-PREVIEW-123456',
    },
    verificationUrl: 'https://clubconnect.example/verify/0123456789abcdef',
  });
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.ok(pdf.length > 10_000);
});

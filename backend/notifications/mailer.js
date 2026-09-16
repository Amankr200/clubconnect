const nodemailer = require('nodemailer');

function getTransportConfig() {
  return {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  };
}

function hasCompleteTransportConfig() {
  const config = getTransportConfig();
  return Boolean(config.host && config.auth.user && config.auth.pass);
}

async function sendEmail({ to, subject, text, html }) {
  if (!to) {
    console.warn('[mailer] Skipping email: missing recipient');
    return { sent: false, skipped: true, reason: 'missing-recipient' };
  }

  if (!hasCompleteTransportConfig()) {
    const config = getTransportConfig();
    console.warn('[mailer] Skipping email: SMTP not fully configured. host=%s user=%s pass=%s',
      config.host ? 'SET' : 'MISSING',
      config.auth.user ? 'SET' : 'MISSING',
      config.auth.pass ? 'SET' : 'MISSING'
    );
    return { sent: false, skipped: true, reason: 'smtp-not-configured' };
  }

  const transporter = nodemailer.createTransport(getTransportConfig());
  const fromAddress = process.env.SMTP_USER || '';

  if (!fromAddress) {
    console.warn('[mailer] Skipping email: missing from address');
    return { sent: false, skipped: true, reason: 'missing-from-address' };
  }

  try {
    await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    });
    console.log('[mailer] Email sent successfully to:', to);
    return { sent: true, skipped: false };
  } catch (err) {
    console.error('[mailer] Failed to send email to %s: %s', to, err.message);
    return { sent: false, skipped: false, error: err.message };
  }
}

module.exports = sendEmail;
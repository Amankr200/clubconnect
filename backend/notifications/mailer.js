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
    return { sent: false, skipped: true, reason: 'missing-recipient' };
  }

  if (!hasCompleteTransportConfig()) {
    return { sent: false, skipped: true, reason: 'smtp-not-configured' };
  }

  const transporter = nodemailer.createTransport(getTransportConfig());
  const fromAddress = process.env.SMTP_USER || '';

  if (!fromAddress) {
    return { sent: false, skipped: true, reason: 'missing-from-address' };
  }

  await transporter.sendMail({
    from: fromAddress,
    to,
    subject,
    text,
    html,
  });

  return { sent: true, skipped: false };
}

module.exports = sendEmail;
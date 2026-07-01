import nodemailer from 'nodemailer';

function getTransportConfig() {
  return {
    host: process.env.SMTP_HOST || '', // TODO: add the SMTP host here.
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: {
      user: process.env.SMTP_USER || '', // TODO: add the SMTP username here.
      pass: process.env.SMTP_PASS || '', // TODO: add the SMTP password or app password here.
    },
  };
}

function hasCompleteTransportConfig() {
  const config = getTransportConfig();
  return Boolean(config.host && config.auth.user && config.auth.pass);
}

export async function sendEmail({ to, subject, text, html }) {
  if (!to) {
    return { sent: false, skipped: true, reason: 'missing-recipient' };
  }

  if (!hasCompleteTransportConfig()) {
    return { sent: false, skipped: true, reason: 'smtp-not-configured' };
  }

  const transporter = nodemailer.createTransport(getTransportConfig());
  const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER || ''; // TODO: add the approved from-address here.

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
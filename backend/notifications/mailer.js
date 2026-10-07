// const { Resend } = require('resend');
const nodemailer = require('nodemailer');

/*
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY || '';
  if (!apiKey) return null;
  return new Resend(apiKey);
}
*/

function getSmtpTransporter() {
  const host = process.env.SMTP_HOST || '';
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('SMTP_PORT must be a positive integer');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

async function sendEmail({ to, subject, text, html }) {
  if (!to) {
    console.warn('[mailer] Skipping email: missing recipient');
    return { sent: false, skipped: true, reason: 'missing-recipient' };
  }

  try {
    const smtp = getSmtpTransporter();
    if (smtp) {
      const result = await smtp.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        text,
        html,
      });

      console.log('[mailer] Email sent successfully to:', to, '| id:', result.messageId);
      return { sent: true, skipped: false };
    }

    /*
    const resend = getResendClient();
    if (resend) {
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM || 'ClubConnect <onboarding@resend.dev>',
        to,
        subject,
        text,
        html,
      });

      if (result.error) {
        console.error('[mailer] Resend API error for %s: %o', to, result.error);
        return { sent: false, skipped: false, error: result.error.message };
      }

      console.log('[mailer] Email sent successfully to:', to, '| id:', result.data?.id);
      return { sent: true, skipped: false };
    }

    console.warn('[mailer] Skipping email: configure SMTP_* or RESEND_API_KEY');
    return { sent: false, skipped: true, reason: 'mailer-not-configured' };
    */
  } catch (err) {
    console.error('[mailer] Failed to send email to %s: %s', to, err.message);
    return { sent: false, skipped: false, error: err.message };
  }
}

module.exports = sendEmail;
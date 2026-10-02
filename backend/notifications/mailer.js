const { Resend } = require('resend');

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY || '';
  if (!apiKey) return null;
  return new Resend(apiKey);
}

async function sendEmail({ to, subject, text, html }) {
  if (!to) {
    console.warn('[mailer] Skipping email: missing recipient');
    return { sent: false, skipped: true, reason: 'missing-recipient' };
  }

  const resend = getResendClient();
  if (!resend) {
    console.warn('[mailer] Skipping email: RESEND_API_KEY is not set');
    return { sent: false, skipped: true, reason: 'resend-not-configured' };
  }

  const fromAddress = process.env.RESEND_FROM || 'ClubConnect <onboarding@resend.dev>';

  try {
    const result = await resend.emails.send({
      from: fromAddress,
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
  } catch (err) {
    console.error('[mailer] Failed to send email to %s: %s', to, err.message);
    return { sent: false, skipped: false, error: err.message };
  }
}

module.exports = sendEmail;
/*
const { societies, defaultSocietyIds, resolveSocietyIds } = require('../../server/data/societies.js').default;
const { readState, updateState } = require('../../server/data/store.js');
*/
const sendEmail = require("./mailer.js");
const db = require("../db.js");
const venueModel = require("../models/venue.js");
const PORTAL_URL = process.env.PORTAL_URL || "https://clubconnect-self.vercel.app/";
// if doesn't work, try with import
/*
const DAY_MS = 24 * 60 * 60 * 1000;

const REMINDER_RULES = [
  { key: "sent2Days", label: "2 days", offsetMs: 2 * DAY_MS },
  { key: "sent1Day", label: "1 day", offsetMs: 1 * DAY_MS },
  { key: "sent1Hour", label: "1 hour", offsetMs: 60 * 60 * 1000 },
  { key: "sentAtTime", label: "now", offsetMs: 0 },
];

function normalizeEmail(value) {
  return String(value || "").trim();
}
*/
/*
function getUserSelectedSocietyIds(user) {
  if (!Array.isArray(user.selectedSocietyIds)) {
    return defaultSocietyIds;
  }

  return resolveSocietyIds(user.selectedSocietyIds);
}

function getEventSocietyIds(event) {
  const source = event.societyIds?.length ? event.societyIds : event.societyId ? [event.societyId] : [];
  const resolved = resolveSocietyIds(source);
  return resolved.length > 0 ? resolved : [];
}
  */

/*
function getSocietyName(event) {
  return event.host_club || "your selected club";
}
*/

async function getRecipients(clubId) {
  const result = await db.query(
    `
    SELECT
      s.name AS student_name,
      s.college_email_id,
      society.name AS society_name,
      society.category AS society_category
    FROM stud_club sc
    JOIN students s
      ON sc.stud_id = s.enrollment_id
    JOIN societies society
      ON sc.club_id = society.id
    WHERE sc.club_id = $1
    ORDER BY s.enrollment_id
    `,
    [clubId],
  );

  return result.rows;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function buildNotificationContent(event, recipient, venueName) {
  const clubName = recipient.society_name || 'your selected club';
  const societyDetails = recipient.society_category
    ? `Category: ${recipient.society_category}`
    : 'Not provided';
  const eventDate = new Date(event.date);
  const formattedDate = Number.isNaN(eventDate.getTime())
    ? event.date
    : eventDate.toLocaleString("en-IN", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });


  const subject = `New event from ${clubName}: ${event.eventName}`;
  const greeting = `Hi ${recipient.student_name || 'there'},`;
  const text = `${greeting}\n\n${event.eventName} has been approved and published by ${clubName}.\n\nWhen: ${formattedDate}\nWhere: ${venueName || 'TBD'}\n\nEvent details:\n${event.description || 'Not provided'}\n\nVisit the ClubConnect portal: ${PORTAL_URL}`;
  // const text = `${greeting}\n\n${event.eventName} has been approved and published by ${clubName}.\n\nWhen: ${formattedDate}\nWhere: ${event.venueName || 'TBD'}\n\nEvent details:\n${event.description || 'Not provided'}\n\nAbout ${clubName}:\n${societyDetails || 'Not provided'}\n\nVisit the ClubConnect portal: ${PORTAL_URL}`;

  /*
  ${
                  reminderLabel
                    ? `Reminder: ${event.event_name} from ${clubName}
                           is scheduled ${
                             reminderLabel === "now"
                               ? "right now"
                               : `in <strong>${reminderLabel}</strong>`
                           }.`
                    : `A new event from ${clubName} has been published.`
                }
  */
  const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
            <h2 style="margin:0 0 12px">${escapeHtml(subject)}</h2>

            <p>
                ${escapeHtml(greeting)}<br>
                <strong>${escapeHtml(event.eventName)}</strong> has been approved and published by ${escapeHtml(clubName)}.
            </p>

            <p><strong>When:</strong> ${escapeHtml(formattedDate)}</p>
            <p><strong>Where:</strong> ${escapeHtml(venueName || 'TBD')}</p>
            <p><strong>Event details:</strong><br>${escapeHtml(event.description || 'Not provided')}</p>
            <p><strong>About ${escapeHtml(clubName)}:</strong><br>${escapeHtml(societyDetails || 'Not provided').replace(/\n/g, '<br>')}</p>
            <p><a href="${PORTAL_URL}">Visit the ClubConnect portal</a></p>
        </div>
    `;

  return { subject, text, html };
}

async function sendEventCreatedNotifications(event) {
  // const recipients = await getRecipients(event.clubId);
  const recipients = await getRecipients(event.hostClub);

  if (recipients.length === 0) {
    return { sent: 0, skipped: true, reason: "no-recipients" };
  }

  const venue = await venueModel.findById(event.venueId);
  const venueName = venue?.name;

  // const content = buildNotificationContent(event, null);
  let sentCount = 0;

  for (const recipient of recipients) {
    const content = buildNotificationContent(event, recipient, venueName);
    const result = await sendEmail({
      to: recipient.college_email_id,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });

    if (result.sent) {
      sentCount += 1;
    }

    console.log(`Sent Count: ${sentCount}`);
  }

  return { sent: sentCount, skipped: false };
}

module.exports = {
  sendEventCreatedNotifications,
};

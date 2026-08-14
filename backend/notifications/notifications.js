/*
const { societies, defaultSocietyIds, resolveSocietyIds } = require('../../server/data/societies.js').default;
const { readState, updateState } = require('../../server/data/store.js');
*/
const { sendEmail } = require("./mailer.js");
const db = require("../db.js");
// if doesn't work, try with import

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

function getSocietyName(event) {
  return event.host_club || "your selected club";
}

async function getRecipients(clubId) {
  const result = await db.query(
    `
    SELECT
        sc.club_id,
        s.enrollment_id,
        s.name,
        s.college_email_id
    FROM stud_club sc
    JOIN students s
        ON sc.stud_id = s.enrollment_id
    WHERE club_id = $1
    `,
    [clubId],
  );

  return result.rows;
}

function buildNotificationContent(event, reminderLabel) {
  const clubName = getSocietyName(event);
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

  const subject = reminderLabel
    ? `${event.event_name} starts in ${reminderLabel}`
    : `New event published: ${event.event_name}`;

  const text = reminderLabel
    ? `Reminder: ${event.event_name} from ${clubName} starts ${reminderLabel === "now" ? "now" : `in ${reminderLabel}`}.\n\nWhen: ${formattedDate}\nWhere: ${event.venue_id || "TBD"}\n\n${event.description || ""}`
    : `A new event from ${clubName} has been published.\n\nTitle: ${event.event_name}\nWhen: ${formattedDate}\nWhere: ${event.location || "TBD"}\n\n${event.description || ""}`;

  const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
            <h2 style="margin:0 0 12px">${subject}</h2>

            <p>
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
            </p>

            <p><strong>When:</strong> ${formattedDate}</p>
            <p><strong>Where:</strong> ${event.venue_id || "TBD"}</p>

            <p>${event.description || ""}</p>
        </div>
    `;

  return { subject, text, html };
}

async function sendEventCreatedNotifications(event) {
  const recipients = await getRecipients(event.clubId);

  if (recipients.length === 0) {
    return { sent: 0, skipped: true, reason: "no-recipients" };
  }

  const content = buildNotificationContent(event, null);
  let sentCount = 0;

  for (const recipient of recipients) {
    const result = await sendEmail({
      to: recipient.college_email_id,
      subject: content.subject,
      text: `${recipient.name ? `Hi ${recipient.name},\n\n` : ""}${content.text}`,
      html: content.html,
    });

    if (result.sent) {
      sentCount += 1;
    }
  }

  return { sent: sentCount, skipped: false };
}

async function markEventCreationNotificationSent(eventId) {
  return updateState((state) => {
    const event = state.events.find((item) => item.id === eventId);
    if (!event) {
      return null;
    }

    event.notificationState = event.notificationState || {};
    event.notificationState.sentOnCreate = true;
    event.updatedAt = new Date().toISOString();
    return event;
  });
}

async function runReminderSweep(now = new Date()) {
  return updateState(async (state) => {
    const result = await db.query(`
        SELECT *
        FROM events
        WHERE status = 'published'
          AND date IS NOT NULL
    `);

    for (const event of result.rows) {
      if (event.status !== "approved" || !event.date) {
        continue;
      }

      const startAt = new Date(event.date);
      if (Number.isNaN(startAt.getTime())) {
        continue;
      }

      const eventState = event.notificationState || {};
      event.notificationState = eventState;

      const recipients = getRecipients(state, event);
      if (recipients.length === 0) {
        continue;
      }

      for (const reminder of REMINDER_RULES) {
        const targetTime = startAt.getTime() - reminder.offsetMs;
        if (now.getTime() < targetTime || eventState[reminder.key]) {
          continue;
        }

        const content = buildNotificationContent(event, reminder.label);

        for (const recipient of recipients) {
          const result = await sendEmail({
            to: recipient.college_email_id,
            subject: content.subject,
            text: `${recipient.name ? `Hi ${recipient.name},\n\n` : ""}${content.text}`,
            html: content.html,
          });

          if (result.sent) {
            results.push({
              eventId: event.id,
              reminder: reminder.key,
              recipient: recipient.college_email_id,
            });
          }
        }

        eventState[reminder.key] = true;
      }
    }

    return results;
  });
}

// try with export
module.exports = {
  sendEventCreatedNotifications,
  markEventCreationNotificationSent,
  runReminderSweep,
};

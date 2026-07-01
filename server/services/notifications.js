import { societies, defaultSocietyIds, resolveSocietyIds } from '../data/societies.js';
import { readState, updateState } from '../data/store.js';
import { sendEmail } from './mailer.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const REMINDER_RULES = [
  { key: 'sent2Days', label: '2 days', offsetMs: 2 * DAY_MS },
  { key: 'sent1Day', label: '1 day', offsetMs: 1 * DAY_MS },
  { key: 'sent1Hour', label: '1 hour', offsetMs: 60 * 60 * 1000 },
  { key: 'sentAtTime', label: 'now', offsetMs: 0 },
];

function normalizeEmail(value) {
  return String(value || '').trim();
}

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

function getRecipients(state, event) {
  const eventSocietyIds = getEventSocietyIds(event);
  if (eventSocietyIds.length === 0) {
    return [];
  }

  return state.users.filter((user) => {
    const email = normalizeEmail(user.email);
    if (!email) {
      return false;
    }

    const selectedSocietyIds = getUserSelectedSocietyIds(user);
    return eventSocietyIds.some((societyId) => selectedSocietyIds.includes(societyId));
  });
}

function getSocietyNames(event) {
  const eventSocietyIds = getEventSocietyIds(event);
  const names = eventSocietyIds
    .map((societyId) => societies.find((society) => society.id === societyId)?.name)
    .filter(Boolean);

  return names.length > 0 ? names.join(', ') : 'your selected societies';
}

function buildNotificationContent(event, reminderLabel) {
  const societyNames = getSocietyNames(event);
  const eventDate = new Date(event.startAt);
  const formattedDate = Number.isNaN(eventDate.getTime())
    ? event.startAt
    : eventDate.toLocaleString('en-IN', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  const subject = reminderLabel
    ? `${event.title} starts in ${reminderLabel}`
    : `New event published: ${event.title}`;

  const text = reminderLabel
    ? `Reminder: ${event.title} from ${societyNames} starts ${reminderLabel === 'now' ? 'now' : `in ${reminderLabel}`}.\n\nWhen: ${formattedDate}\nWhere: ${event.location || 'TBD'}\n\n${event.description || ''}`
    : `A new event from ${societyNames} has been published.\n\nTitle: ${event.title}\nWhen: ${formattedDate}\nWhere: ${event.location || 'TBD'}\n\n${event.description || ''}`;

  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
    <h2 style="margin:0 0 12px">${subject}</h2>
    <p>${reminderLabel
      ? `Reminder: <strong>${event.title}</strong> from <strong>${societyNames}</strong> is scheduled ${reminderLabel === 'now' ? 'right now' : `in <strong>${reminderLabel}</strong>`}.`
      : `A new event from <strong>${societyNames}</strong> has been published.`}</p>
    <ul>
      <li><strong>When:</strong> ${formattedDate}</li>
      <li><strong>Where:</strong> ${event.location || 'TBD'}</li>
    </ul>
    <p>${event.description || ''}</p>
  </div>`;

  return { subject, text, html };
}

export async function sendEventCreatedNotifications(event) {
  const state = await readState();
  const recipients = getRecipients(state, event);

  if (recipients.length === 0) {
    return { sent: 0, skipped: true, reason: 'no-recipients' };
  }

  const content = buildNotificationContent(event, null);
  let sentCount = 0;

  for (const recipient of recipients) {
    const result = await sendEmail({
      to: recipient.email,
      subject: content.subject,
      text: `${recipient.name ? `Hi ${recipient.name},\n\n` : ''}${content.text}`,
      html: content.html,
    });

    if (result.sent) {
      sentCount += 1;
    }
  }

  return { sent: sentCount, skipped: false };
}

export async function markEventCreationNotificationSent(eventId) {
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

export async function runReminderSweep(now = new Date()) {
  return updateState(async (state) => {
    const results = [];

    for (const event of state.events) {
      if (event.status !== 'published' || !event.startAt) {
        continue;
      }

      const startAt = new Date(event.startAt);
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
            to: recipient.email,
            subject: content.subject,
            text: `${recipient.name ? `Hi ${recipient.name},\n\n` : ''}${content.text}`,
            html: content.html,
          });

          if (result.sent) {
            results.push({ eventId: event.id, reminder: reminder.key, recipient: recipient.email });
          }
        }

        eventState[reminder.key] = true;
      }
    }

    return results;
  });
}
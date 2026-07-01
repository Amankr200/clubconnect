import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { defaultSocietyIds, resolveSocietyIds, societies } from './data/societies.js';
import { readState, updateState } from './data/store.js';
import { markEventCreationNotificationSent, runReminderSweep, sendEventCreatedNotifications } from './services/notifications.js';

const app = express();
const PORT = Number(process.env.PORT || 3001);
const REMINDER_INTERVAL_MS = Number(process.env.REMINDER_INTERVAL_MS || 60_000);

app.use(cors());
app.use(express.json());

function buildUserPayload(user) {
  const selectedSocietyIds = Array.isArray(user.selectedSocietyIds)
    ? user.selectedSocietyIds
    : defaultSocietyIds;

  return {
    id: user.id,
    name: user.name || '',
    email: user.email || '',
    selectedSocietyIds,
  };
}

function toEventResponse(event) {
  return {
    ...event,
    societyIds: resolveSocietyIds(event.societyIds || event.societyId || []),
  };
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'clubconnect-notifications' });
});

app.get('/api/societies', (_req, res) => {
  res.json({ societies });
});

app.get('/api/users/:userId/preferences', async (req, res) => {
  const state = await readState();
  const user = state.users.find((item) => item.id === req.params.userId);

  if (!user) {
    return res.json({
      id: req.params.userId,
      name: '',
      email: '',
      selectedSocietyIds: defaultSocietyIds,
      isDefault: true,
    });
  }

  return res.json(buildUserPayload(user));
});

app.put('/api/users/:userId/preferences', async (req, res) => {
  const { name = '', email = '', selectedSocietyIds } = req.body || {};
  const normalizedSelectedSocietyIds = selectedSocietyIds === undefined
    ? defaultSocietyIds
    : resolveSocietyIds(selectedSocietyIds);

  const user = await updateState((state) => {
    const existing = state.users.find((item) => item.id === req.params.userId);
    const payload = {
      id: req.params.userId,
      name,
      email,
      selectedSocietyIds: normalizedSelectedSocietyIds,
      updatedAt: new Date().toISOString(),
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    if (existing) {
      Object.assign(existing, payload);
    } else {
      state.users.push(payload);
    }

    return payload;
  });

  res.json(buildUserPayload(user));
});

app.post('/api/users/:userId/subscribe-all', async (req, res) => {
  const user = await updateState((state) => {
    const existing = state.users.find((item) => item.id === req.params.userId);
    const payload = {
      id: req.params.userId,
      name: existing?.name || '',
      email: existing?.email || '',
      selectedSocietyIds: defaultSocietyIds,
      updatedAt: new Date().toISOString(),
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    if (existing) {
      Object.assign(existing, payload);
    } else {
      state.users.push(payload);
    }

    return payload;
  });

  res.json(buildUserPayload(user));
});

app.get('/api/events', async (_req, res) => {
  const state = await readState();
  res.json({ events: state.events.map(toEventResponse) });
});

app.post('/api/events', async (req, res) => {
  const {
    title = '',
    description = '',
    location = '',
    startAt = '',
    societyIds,
    societyId,
    status = 'published',
    notifyOnCreate = true,
  } = req.body || {};

  const resolvedSocietyIds = resolveSocietyIds(societyIds?.length ? societyIds : societyId ? [societyId] : []);

  const parsedStartAt = new Date(startAt);
  if (!title.trim() || !startAt.trim() || Number.isNaN(parsedStartAt.getTime()) || resolvedSocietyIds.length === 0) {
    return res.status(400).json({
      error: 'title, startAt, and at least one societyId are required',
    });
  }

  const createdEvent = {
    id: crypto.randomUUID(),
    title: title.trim(),
    description: description.trim(),
    location: location.trim(),
    startAt: parsedStartAt.toISOString(),
    societyIds: resolvedSocietyIds,
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notificationState: {
      sentOnCreate: false,
      sent2Days: false,
      sent1Day: false,
      sent1Hour: false,
      sentAtTime: false,
    },
  };

  await updateState((state) => {
    state.events.push(createdEvent);
    return createdEvent;
  });

  let createdNotifications = { sent: 0, skipped: true };
  if (notifyOnCreate && status === 'published') {
    createdNotifications = await sendEventCreatedNotifications(createdEvent);
    await markEventCreationNotificationSent(createdEvent.id);
  }

  res.status(201).json({
    event: createdEvent,
    notifications: createdNotifications,
  });
});

app.patch('/api/events/:eventId/publish', async (req, res) => {
  const result = await updateState((state) => {
    const event = state.events.find((item) => item.id === req.params.eventId);
    if (!event) {
      return null;
    }

    event.status = 'published';
    event.updatedAt = new Date().toISOString();
    event.notificationState = event.notificationState || {
      sentOnCreate: false,
      sent2Days: false,
      sent1Day: false,
      sent1Hour: false,
      sentAtTime: false,
    };

    return event;
  });

  if (!result) {
    return res.status(404).json({ error: 'Event not found' });
  }

  const notifications = await sendEventCreatedNotifications(result);
  await markEventCreationNotificationSent(result.id);

  res.json({
    event: toEventResponse(result),
    notifications,
  });
});

app.patch('/api/events/:eventId', async (req, res) => {
  const { title, description, location, startAt, societyIds, societyId, status } = req.body || {};
  const resolvedSocietyIds = resolveSocietyIds(societyIds?.length ? societyIds : societyId ? [societyId] : []);

  const result = await updateState((state) => {
    const event = state.events.find((item) => item.id === req.params.eventId);
    if (!event) {
      return null;
    }

    if (typeof title === 'string') event.title = title.trim();
    if (typeof description === 'string') event.description = description.trim();
    if (typeof location === 'string') event.location = location.trim();
    if (typeof startAt === 'string' && startAt.trim()) {
      const parsedStartAt = new Date(startAt);
      if (!Number.isNaN(parsedStartAt.getTime())) {
        event.startAt = parsedStartAt.toISOString();
      }
    }
    if (resolvedSocietyIds.length > 0) event.societyIds = resolvedSocietyIds;
    if (typeof status === 'string') event.status = status;
    event.updatedAt = new Date().toISOString();

    return event;
  });

  if (!result) {
    return res.status(404).json({ error: 'Event not found' });
  }

  res.json({ event: toEventResponse(result) });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`ClubConnect notifications API running on http://localhost:${PORT}`);
});

runReminderSweep().catch((error) => {
  console.error('Initial reminder sweep failed:', error);
});

const reminderTimer = setInterval(() => {
  runReminderSweep().catch((error) => {
    console.error('Reminder sweep failed:', error);
  });
}, REMINDER_INTERVAL_MS);

if (typeof reminderTimer.unref === 'function') {
  reminderTimer.unref();
}
# Event Pass Testing Checklist

Use a configured development database and test accounts for a student, faculty coordinator, and non-faculty staff role. Do not use real attendee data in QR payload checks.

## Schema and migration

- [ ] Start the backend and confirm migration `002_event_passes.sql` completes.
- [ ] Confirm `venue_bookings.attendance_start_time` and `attendance_end_time` are `TIMESTAMPTZ`.
- [ ] Confirm `event_passes.registration_id` references `event_registrations.id` and is unique.
- [ ] Confirm existing active RSVP rows receive exactly one pass; cancelled rows do not receive a new pass.
- [ ] Confirm existing event schedules backfill start to the first slot and end to the last slot plus 10 minutes.

## Attendance-window configuration

- [ ] Create an event as a faculty coordinator without custom values; verify start defaults to event start and end defaults to event end plus 10 minutes.
- [ ] Create an event with a custom window; verify both timestamps persist and appear in booking responses.
- [ ] In the faculty “Attendance Windows” tab, edit a booking and verify the new times persist without changing the event approval status.
- [ ] Submit an end time equal to or earlier than the start; expect HTTP 400.
- [ ] Attempt the window update as a student, student coordinator, or other non-faculty role; expect HTTP 403.

## Registration and pass creation

- [ ] Register a student for an approved event; confirm the existing RSVP response and confirmation email behavior remain unchanged.
- [ ] Confirm exactly one `event_passes` row exists for the new `event_registrations.id`.
- [ ] Register the same student again while active; expect the existing `ALREADY_REGISTERED` behavior and no duplicate pass.
- [ ] Cancel the RSVP; confirm the existing registration and pass rows remain, with registration status `CANCELLED`.
- [ ] Re-register before the cutoff; confirm the same registration row and its one pass are reused.
- [ ] Confirm the student dashboard hides cancelled registrations and cancelled passes.

## Pass ownership and QR activation

- [ ] Call `GET /api/event-passes/my` as a student; confirm only that student's active RSVP passes are returned and `passToken` is absent from every list item.
- [ ] Call `GET /api/event-passes/:registrationId` as the owner before the window; expect `qrActive: false`, `qrStatus: "not_started"`, and no `passToken` property.
- [ ] Open another student's registration ID; expect 404 and no event/pass details.
- [ ] Request a cancelled registration; expect HTTP 409 `REGISTRATION_INACTIVE`.
- [ ] During the configured interval, request the owner's pass; expect `qrActive: true` and a server-generated `passToken`.
- [ ] Decode the displayed QR and confirm its JSON contains only `passToken`; no name, email, phone, or event details.
- [ ] After the end time, reload the pass; expect `qrStatus: "closed"`, no token, and the UI text “Attendance Window Closed”.
- [ ] Before start, confirm the UI says “QR Not Available Yet” and polls until activation.
- [ ] Confirm the pass module does not create or update attendance records and exposes no scanning endpoint.

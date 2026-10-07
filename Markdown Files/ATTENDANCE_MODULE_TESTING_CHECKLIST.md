# Module 3: QR Attendance Testing Checklist

Use development accounts for a student, faculty coordinator, and admin. Use an isolated approved event with a known active RSVP/pass and a controllable attendance window. Do not use or alter real attendance records during scan/override tests.

## Migration and RSVP integration

- [ ] Start the backend and confirm `004_event_attendance.sql` runs after the RSVP/pass migrations.
- [ ] Confirm each existing registration has exactly one `event_attendance` row, including registrations created before Module 3.
- [ ] Confirm a new RSVP creates its registration, event pass, and false/unmarked attendance row in the same transaction.
- [ ] Confirm `(registration_id)` is unique and references `event_registrations(id)`.
- [ ] Confirm `marked_by` and audit actor IDs match the existing UUID user IDs.
- [ ] Confirm student section is nullable and blank for students without section data.

## QR scanner authorization and validation

- [ ] Open the Attendance Management scanner as a faculty or student event coordinator and grant camera permission.
- [ ] Scan a valid QR during the event window; confirm success shows the student and event and creates one present mark.
- [ ] Decode the QR and verify the scanner reads the JSON `passToken` value; token validation happens on the backend.
- [ ] Scan a malformed/non-ClubConnect QR; expect `INVALID_TOKEN` and no attendance changes.
- [ ] Scan an unknown or altered token; expect `INVALID_TOKEN`.
- [ ] Scan a valid pass before its window; expect `ATTENDANCE_WINDOW_NOT_OPEN` and no attendance changes.
- [ ] Scan a valid pass after its window; expect `ATTENDANCE_WINDOW_CLOSED` and no attendance changes.
- [ ] Scan a pass after its RSVP is cancelled; expect `REGISTRATION_CANCELLED`.
- [ ] Scan again after successful marking; expect `ALREADY_MARKED` and exactly one attendance record.
- [ ] Attempt scanning as an ordinary student and admin; both must receive HTTP 403.
- [ ] Confirm a student coordinator can scan but cannot open the participant dashboard or perform manual overrides.
- [ ] Scan two copies of the same QR concurrently; verify one mark is committed and the other receives the duplicate response.

## Manual override and audit log

- [ ] Faculty marks an active RSVP Present; verify `attendance_status = TRUE`, marked time and faculty user ID are written, and a `MANUAL_PRESENT` log exists.
- [ ] Faculty changes that row to Absent; verify the status becomes false, marked time is cleared, actor is recorded, and a `MANUAL_ABSENT` log exists.
- [ ] Verify each successful override appends one audit row with attendance ID, action, actor, and timestamp.
- [ ] Attempt an override as admin and student; both must receive HTTP 403.
- [ ] Submit a non-boolean status or missing attendance ID; expect a 400/404 error and no audit entry.
- [ ] Attempt to override attendance for a cancelled RSVP; expect a conflict and no change.

## Dashboard and student status

- [ ] Faculty sees approved events, registered/present/absent counts, and attendance percentage.
- [ ] Participant rows include name, enrollment number, branch, section, RSVP status, attendance status, and marked time.
- [ ] Present, Absent, and All filters behave correctly; search matches student name and enrollment number.
- [ ] Admin can view the attendance dashboard and records but cannot scan or modify attendance.
- [ ] Student “My Registered Events” shows only `Present` or `Not Marked`; no student controls can modify attendance.
- [ ] Cancelled registrations are excluded from active-present/absent counts and cannot be scanned or manually modified.

## Exports

- [ ] Download CSV, XLSX, and PDF as faculty and admin; verify each file opens and contains the requested participant columns.
- [ ] Confirm attendance time is blank for absent/unmarked participants and present for marked participants.
- [ ] Confirm registration status and cancelled rows are represented correctly without affecting active attendance percentages.
- [ ] Attempt event export as a student; expect HTTP 403.

## Scope guard

- [ ] Confirm scanning/overrides only write attendance and audit data; no feedback, certificates, or participation records are created.

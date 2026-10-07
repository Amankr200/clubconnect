ALTER TABLE students
  ADD COLUMN IF NOT EXISTS section VARCHAR(32);

CREATE TABLE IF NOT EXISTS event_attendance (
  id SERIAL PRIMARY KEY,
  registration_id INTEGER NOT NULL UNIQUE,
  attendance_status BOOLEAN NOT NULL DEFAULT FALSE,
  attendance_marked_at TIMESTAMPTZ NULL,
  marked_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_event_attendance_registration
    FOREIGN KEY (registration_id) REFERENCES event_registrations(id) ON DELETE CASCADE,
  CONSTRAINT fk_event_attendance_marker
    FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS attendance_logs (
  id BIGSERIAL PRIMARY KEY,
  attendance_id INTEGER NOT NULL,
  action VARCHAR(32) NOT NULL CHECK (action IN ('QR_SCAN', 'MANUAL_PRESENT', 'MANUAL_ABSENT')),
  performed_by UUID NOT NULL,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_attendance_logs_attendance
    FOREIGN KEY (attendance_id) REFERENCES event_attendance(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_logs_actor
    FOREIGN KEY (performed_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS event_attendance_status_idx
  ON event_attendance (attendance_status, registration_id);
CREATE INDEX IF NOT EXISTS attendance_logs_attendance_idx
  ON attendance_logs (attendance_id, "timestamp" DESC);

INSERT INTO event_attendance (registration_id)
SELECT id FROM event_registrations
ON CONFLICT (registration_id) DO NOTHING;

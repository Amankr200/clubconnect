CREATE TABLE IF NOT EXISTS event_attendance_permissions (
  id BIGSERIAL PRIMARY KEY,
  event_id UUID NOT NULL,
  user_id UUID NOT NULL,
  granted_by UUID,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_by UUID,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_event_attendance_permissions_event
    FOREIGN KEY (event_id) REFERENCES venue_bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_event_attendance_permissions_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_event_attendance_permissions_grantor
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_event_attendance_permissions_revoker
    FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS event_attendance_permissions_active_idx
  ON event_attendance_permissions (event_id, user_id)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS event_attendance_permissions_user_idx
  ON event_attendance_permissions (user_id, event_id, revoked_at);

ALTER TABLE attendance_logs
  ALTER COLUMN attendance_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS event_id UUID,
  ADD COLUMN IF NOT EXISTS registration_id INTEGER,
  ADD COLUMN IF NOT EXISTS previous_status BOOLEAN,
  ADD COLUMN IF NOT EXISTS new_status BOOLEAN,
  ADD COLUMN IF NOT EXISTS reason TEXT;

ALTER TABLE attendance_logs
  DROP CONSTRAINT IF EXISTS fk_attendance_logs_attendance;
ALTER TABLE attendance_logs
  DROP CONSTRAINT IF EXISTS fk_attendance_logs_event;
ALTER TABLE attendance_logs
  DROP CONSTRAINT IF EXISTS fk_attendance_logs_registration;
ALTER TABLE attendance_logs
  ADD CONSTRAINT fk_attendance_logs_attendance
  FOREIGN KEY (attendance_id) REFERENCES event_attendance(id) ON DELETE SET NULL;

ALTER TABLE attendance_logs
  ADD CONSTRAINT fk_attendance_logs_event
  FOREIGN KEY (event_id) REFERENCES venue_bookings(id) ON DELETE SET NULL;
ALTER TABLE attendance_logs
  ADD CONSTRAINT fk_attendance_logs_registration
  FOREIGN KEY (registration_id) REFERENCES event_registrations(id) ON DELETE SET NULL;

UPDATE attendance_logs AS log
SET event_id = registration.event_id,
    registration_id = registration.id
FROM event_attendance AS attendance
JOIN event_registrations AS registration ON registration.id = attendance.registration_id
WHERE log.attendance_id = attendance.id
  AND (log.event_id IS NULL OR log.registration_id IS NULL);

ALTER TABLE attendance_logs
  DROP CONSTRAINT IF EXISTS attendance_logs_action_check;

UPDATE attendance_logs
SET action = CASE action
  WHEN 'QR_SCAN' THEN 'QR_SCAN_SUCCESS'
  WHEN 'MANUAL_PRESENT' THEN 'MANUAL_MARK_PRESENT'
  WHEN 'MANUAL_ABSENT' THEN 'MANUAL_MARK_ABSENT'
  ELSE action
END;

ALTER TABLE attendance_logs
  ADD CONSTRAINT attendance_logs_action_check CHECK (action IN (
    'QR_SCAN_SUCCESS',
    'QR_SCAN_DUPLICATE',
    'MANUAL_MARK_PRESENT',
    'MANUAL_MARK_ABSENT',
    'SCANNER_PERMISSION_GRANTED',
    'SCANNER_PERMISSION_REVOKED'
  ));

CREATE INDEX IF NOT EXISTS attendance_logs_event_timestamp_idx
  ON attendance_logs (event_id, "timestamp" DESC);

ALTER TABLE venue_bookings
  DROP COLUMN IF EXISTS attendance,
  DROP COLUMN IF EXISTS feedback;

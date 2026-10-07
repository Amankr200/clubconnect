ALTER TABLE venue_bookings
  ADD COLUMN IF NOT EXISTS capacity INTEGER,
  ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS event_registrations (
  id SERIAL PRIMARY KEY,
  event_id UUID NOT NULL,
  student_id BIGINT NOT NULL,
  registration_status VARCHAR(20) NOT NULL DEFAULT 'REGISTERED',
  registered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_at TIMESTAMPTZ NULL,
  UNIQUE (event_id, student_id),
  CONSTRAINT fk_event_registrations_event
    FOREIGN KEY (event_id) REFERENCES venue_bookings(id),
  CONSTRAINT fk_event_registrations_student
    FOREIGN KEY (student_id) REFERENCES students(enrollment_id)
);

DO $$
DECLARE
  student_id_type TEXT;
BEGIN
  SELECT data_type INTO student_id_type
  FROM information_schema.columns
  WHERE table_name = 'event_registrations' AND column_name = 'student_id';

  IF student_id_type = 'uuid' THEN
    ALTER TABLE event_registrations DROP CONSTRAINT IF EXISTS fk_event_registrations_student;
    ALTER TABLE event_registrations RENAME COLUMN student_id TO legacy_user_id;
    ALTER TABLE event_registrations ALTER COLUMN legacy_user_id DROP NOT NULL;
    ALTER TABLE event_registrations
      DROP CONSTRAINT IF EXISTS event_registrations_event_id_student_id_key;
    ALTER TABLE event_registrations ADD COLUMN student_id BIGINT;
    ALTER TABLE event_registrations
      ADD CONSTRAINT fk_event_registrations_student
      FOREIGN KEY (student_id) REFERENCES students(enrollment_id);
    ALTER TABLE event_registrations
      ADD CONSTRAINT event_registrations_event_id_student_id_key UNIQUE (event_id, student_id);
  END IF;
END $$;

DROP INDEX IF EXISTS event_registrations_student_idx;
CREATE INDEX IF NOT EXISTS event_registrations_student_idx
  ON event_registrations (student_id, registration_status);

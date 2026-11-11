ALTER TABLE venue_bookings
  ADD COLUMN IF NOT EXISTS feedback_deadline_hours INTEGER NOT NULL DEFAULT 48;

CREATE TABLE IF NOT EXISTS event_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES venue_bookings(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES students(enrollment_id) ON DELETE CASCADE,
  overall_rating SMALLINT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  organisation_rating SMALLINT NOT NULL CHECK (organisation_rating BETWEEN 1 AND 5),
  content_rating SMALLINT NOT NULL CHECK (content_rating BETWEEN 1 AND 5),
  written_feedback TEXT NOT NULL DEFAULT '',
  suggestions TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, student_id)
);

CREATE INDEX IF NOT EXISTS event_feedbacks_event_idx
  ON event_feedbacks (event_id, created_at DESC);

CREATE INDEX IF NOT EXISTS event_feedbacks_student_idx
  ON event_feedbacks (student_id, created_at DESC);

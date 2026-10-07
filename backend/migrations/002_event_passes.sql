ALTER TABLE venue_bookings
  ADD COLUMN IF NOT EXISTS attendance_start_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attendance_end_time TIMESTAMPTZ;

WITH event_schedule AS (
  SELECT
    id,
    date AS event_date,
    time_slots -> 0 ->> 'startTime' AS start_time,
    time_slots -> (jsonb_array_length(time_slots) - 1) ->> 'endTime' AS end_time
  FROM venue_bookings
  WHERE jsonb_typeof(time_slots) = 'array'
    AND jsonb_array_length(time_slots) > 0
)
UPDATE venue_bookings AS booking
SET attendance_start_time = COALESCE(
      booking.attendance_start_time,
      CASE
        WHEN schedule.event_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
         AND schedule.start_time ~ '^[0-9]{2}:[0-9]{2}(:[0-9]{2})?$'
        THEN (schedule.event_date || ' ' || schedule.start_time)::timestamp
             AT TIME ZONE 'Asia/Kolkata'
      END
    ),
    attendance_end_time = COALESCE(
      booking.attendance_end_time,
      CASE
        WHEN schedule.event_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
         AND schedule.end_time ~ '^[0-9]{2}:[0-9]{2}(:[0-9]{2})?$'
        THEN ((schedule.event_date || ' ' || schedule.end_time)::timestamp + INTERVAL '10 minutes')
             AT TIME ZONE 'Asia/Kolkata'
      END
    )
FROM event_schedule AS schedule
WHERE booking.id = schedule.id
  AND (booking.attendance_start_time IS NULL OR booking.attendance_end_time IS NULL);

CREATE TABLE IF NOT EXISTS event_passes (
  id BIGSERIAL PRIMARY KEY,
  registration_id INTEGER NOT NULL UNIQUE,
  pass_token VARCHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_event_passes_registration
    FOREIGN KEY (registration_id) REFERENCES event_registrations(id) ON DELETE CASCADE
);

INSERT INTO event_passes (registration_id, pass_token)
SELECT registration.id, encode(gen_random_bytes(32), 'hex')
FROM event_registrations AS registration
WHERE registration.registration_status = 'REGISTERED'
ON CONFLICT (registration_id) DO NOTHING;

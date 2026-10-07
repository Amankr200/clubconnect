WITH event_schedule AS (
  SELECT
    id,
    date AS event_date,
    time_slots -> 0 ->> 'startTime' AS start_time,
    time_slots -> (jsonb_array_length(time_slots) - 1) ->> 'endTime' AS end_time
  FROM venue_bookings
  WHERE jsonb_typeof(time_slots) = 'array'
    AND jsonb_array_length(time_slots) > 0
    AND date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
), expected_windows AS (
  SELECT
    id,
    (event_date || ' ' || start_time)::timestamp AT TIME ZONE 'GMT' AS legacy_start,
    (event_date || ' ' || end_time)::timestamp AT TIME ZONE 'GMT' + INTERVAL '10 minutes' AS legacy_end,
    (event_date || ' ' || start_time)::timestamp AT TIME ZONE 'Asia/Kolkata' AS local_start,
    (event_date || ' ' || end_time)::timestamp AT TIME ZONE 'Asia/Kolkata' + INTERVAL '10 minutes' AS local_end
  FROM event_schedule
  WHERE start_time ~ '^[0-9]{2}:[0-9]{2}(:[0-9]{2})?$'
    AND end_time ~ '^[0-9]{2}:[0-9]{2}(:[0-9]{2})?$'
)
UPDATE venue_bookings AS booking
SET attendance_start_time = CASE
      WHEN booking.attendance_start_time = expected.legacy_start THEN expected.local_start
      ELSE booking.attendance_start_time
    END,
    attendance_end_time = CASE
      WHEN booking.attendance_end_time = expected.legacy_end THEN expected.local_end
      ELSE booking.attendance_end_time
    END
FROM expected_windows AS expected
WHERE booking.id = expected.id
  AND (
    booking.attendance_start_time = expected.legacy_start
    OR booking.attendance_end_time = expected.legacy_end
  );

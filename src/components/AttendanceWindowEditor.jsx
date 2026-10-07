import React, { useEffect, useState } from 'react';
import { updateAttendanceWindow } from '../api/venueBookings.js';

function toDateTimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function defaultWindow(booking) {
  const date = booking.date;
  const slots = booking.timeSlots || [];
  const first = slots[0];
  const last = slots[slots.length - 1];
  const start = booking.attendanceStartTime || (first ? `${date}T${first.startTime}:00` : '');
  let end = booking.attendanceEndTime || (last ? `${date}T${last.endTime}:00` : '');
  if (!booking.attendanceEndTime && end) {
    const endDate = new Date(end);
    if (!Number.isNaN(endDate.getTime())) {
      endDate.setMinutes(endDate.getMinutes() + 10);
      end = endDate;
    }
  }
  return { start: toDateTimeInput(start), end: toDateTimeInput(end) };
}

export default function AttendanceWindowEditor({ booking, token, onUpdated }) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const defaults = defaultWindow(booking);
    setStart(defaults.start);
    setEnd(defaults.end);
    setMessage('');
    setError('');
  }, [booking]);

  const save = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (!start || !end || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
      setError('Choose a valid window with an end after its start.');
      return;
    }

    setSaving(true);
    try {
      const result = await updateAttendanceWindow(token, booking.id, {
        attendanceStartTime: startDate.toISOString(),
        attendanceEndTime: endDate.toISOString(),
      });
      onUpdated?.(result.booking);
      setMessage('Attendance window saved.');
    } catch (saveError) {
      setError(saveError.message || 'Unable to save attendance window.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
      <label className="dash-field-label">
        QR activation starts
        <input className="dash-input" type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} required />
      </label>
      <label className="dash-field-label">
        QR activation ends
        <input className="dash-input" type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} required />
      </label>
      <button className="btn-action-primary" type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save Window'}
      </button>
      {error && <p role="alert" className="form-error" style={{ gridColumn: '1 / -1' }}>{error}</p>}
      {message && <p role="status" style={{ gridColumn: '1 / -1' }}>{message}</p>}
    </form>
  );
}

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function parseJsonResponse(response) {
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error(`Server returned a non-JSON response (${response.status} ${response.statusText}).`);
  }
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || 'Attendance request failed.');
    error.code = data.code;
    throw error;
  }
  return data;
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getAttendanceEvents(token) {
  return parseJsonResponse(await fetch(`${API_BASE}/attendance/events`, {
    headers: authHeaders(token),
  }));
}

export async function getEventAttendance(token, eventId) {
  return parseJsonResponse(await fetch(`${API_BASE}/attendance/event/${encodeURIComponent(eventId)}`, {
    headers: authHeaders(token),
  }));
}

export async function scanAttendance(token, passToken) {
  return parseJsonResponse(await fetch(`${API_BASE}/attendance/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ passToken }),
  }));
}

export async function updateAttendance(token, attendanceId, attendanceStatus) {
  return parseJsonResponse(await fetch(`${API_BASE}/attendance/${encodeURIComponent(attendanceId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ attendanceStatus }),
  }));
}

export async function downloadAttendanceExport(token, eventId, format) {
  const response = await fetch(
    `${API_BASE}/attendance/event/${encodeURIComponent(eventId)}/export?format=${encodeURIComponent(format)}`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `Export failed (${response.status}).`);
  }
  return response.blob();
}

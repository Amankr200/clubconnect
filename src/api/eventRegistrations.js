const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function parseJsonResponse(res) {
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error(`Server returned a non-JSON response (${res.status} ${res.statusText}).`);
  }

  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.message || data.error || 'Request failed.');
    error.code = data.code;
    throw error;
  }

  return data;
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function registerForEvent(token, eventId) {
  const res = await fetch(`${API_BASE}/events/${encodeURIComponent(eventId)}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
  });

  return parseJsonResponse(res);
}

export async function getMyEventRegistrations(token) {
  const res = await fetch(`${API_BASE}/event-registrations/me`, {
    headers: {
      ...authHeaders(token),
    },
  });

  return parseJsonResponse(res);
}

export async function cancelEventRegistration(token, registrationId) {
  const res = await fetch(`${API_BASE}/event-registrations/${encodeURIComponent(registrationId)}`, {
    method: 'DELETE',
    headers: {
      ...authHeaders(token),
    },
  });

  return parseJsonResponse(res);
}

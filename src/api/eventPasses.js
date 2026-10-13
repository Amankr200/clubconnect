const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function parseJsonResponse(response) {
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error(`Server returned a non-JSON response (${response.status} ${response.statusText}).`);
  }

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || data.error || 'Request failed.');
    error.code = data.code;
    throw error;
  }
  return data;
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getMyEventPasses(token) {
  const response = await fetch(`${API_BASE}/event-passes/my`, {
    headers: authHeaders(token),
  });
  return parseJsonResponse(response);
}

export async function getEventPass(token, registrationId) {
  const response = await fetch(`${API_BASE}/event-passes/${encodeURIComponent(registrationId)}`, {
    headers: authHeaders(token),
  });
  return parseJsonResponse(response);
}

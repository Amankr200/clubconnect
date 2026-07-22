const API_BASE = '/api';

async function parseJsonResponse(res) {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Request failed.');
  }

  return data;
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getApprovedVenueBookings() {
  const res = await fetch(`${API_BASE}/venue-bookings/public?status=approved`);
  return parseJsonResponse(res);
}

export async function getVenueAvailability(venueId, date) {
  const res = await fetch(`${API_BASE}/venue-bookings/availability?venueId=${encodeURIComponent(venueId)}&date=${encodeURIComponent(date)}`);
  return parseJsonResponse(res);
}

export async function getVenueBookingInbox(token) {
  const res = await fetch(`${API_BASE}/venue-bookings/inbox`, {
    headers: {
      ...authHeaders(token),
    },
  });

  return parseJsonResponse(res);
}

export async function getMyVenueBookings(token) {
  const res = await fetch(`${API_BASE}/venue-bookings/mine`, {
    headers: {
      ...authHeaders(token),
    },
  });

  return parseJsonResponse(res);
}

export async function createVenueBooking(token, payload) {
  const res = await fetch(`${API_BASE}/venue-bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(payload),
  });

  return parseJsonResponse(res);
}

export async function decideVenueBooking(token, bookingId, decision, notes = '') {
  const res = await fetch(`${API_BASE}/venue-bookings/${bookingId}/decision`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify({ decision, notes }),
  });

  return parseJsonResponse(res);
}

export async function resubmitVenueBooking(token, bookingId, payload) {
  const res = await fetch(`${API_BASE}/venue-bookings/${bookingId}/resubmit`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(payload),
  });

  return parseJsonResponse(res);
}
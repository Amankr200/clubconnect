// Uses Vite dev proxy (/api → http://localhost:5000) during development
const API_BASE = '/api';

/**
 * Login with email + password.
 * Returns { token, user } on success.
 * Throws an Error with a user-friendly message on failure.
 */
export async function loginUser(email, password) {
  let res;
  try {
    res = await fetch(`${API_BASE}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
  } catch (err) {
    throw new Error('Unable to connect to the authentication server. Please check server status.');
  }

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    throw new Error(`Server returned invalid response (${res.status}). Please check backend API.`);
  }

  if (!res.ok) {
    throw new Error(data.message || `Login failed (${res.status}). Please try again.`);
  }

  return data; // { token, user }
}

/**
 * Fetch the current user from the token.
 * Returns user object or throws if token is invalid/expired.
 */
export async function getMe(token) {
  let res;
  try {
    res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    throw new Error('Session check failed.');
  }

  if (!res.ok) {
    throw new Error('Session expired. Please log in again.');
  }

  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

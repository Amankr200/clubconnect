// Uses Vite dev proxy (/api → http://localhost:5000) during development
const API_BASE = '/api';

/**
 * Login with email + password.
 * Returns { token, user } on success.
 * Throws an Error with a user-friendly message on failure.
 */
export async function loginUser(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Login failed. Please try again.');
  }

  return data; // { token, user }
}

/**
 * Fetch the current user from the token.
 * Returns user object or throws if token is invalid/expired.
 */
export async function getMe(token) {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error('Session expired. Please log in again.');
  }

  return res.json(); // { id, name, email, role }
}

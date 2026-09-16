const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function getVenues() {
  const response = await fetch(`${API_BASE}/venues`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch venues.');
  }

  return data.venues || [];
}

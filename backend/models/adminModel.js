const db = require('../db');

function formatRegistration(row) {
  if (!row) return null;
  return {
    id: row.id,
    societyName: row.society_name,
    category: row.category,
    description: row.description,
    requestedByEmail: row.requested_by_email,
    requestedByName: row.requested_by_name,
    status: row.status,
    createdAt: row.created_at,
  };
}

function formatVenue(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    capacity: row.capacity,
    type: row.type,
    location: row.location,
    isActive: row.is_active,
  };
}

async function createSocietyRegistration({ societyName, category, description, requestedByEmail, requestedByName }) {
  const result = await db.query(
    `INSERT INTO society_registrations (society_name, category, description, requested_by_email, requested_by_name)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [societyName, category, description, requestedByEmail, requestedByName]
  );
  return formatRegistration(result.rows[0]);
}

async function findAllSocietyRegistrations() {
  const result = await db.query('SELECT * FROM society_registrations ORDER BY created_at DESC');
  return result.rows.map(formatRegistration);
}

async function updateSocietyRegistrationStatus(id, status) {
  const result = await db.query(
    'UPDATE society_registrations SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );
  return formatRegistration(result.rows[0]);
}

async function findAllVenues() {
  const result = await db.query('SELECT * FROM venues ORDER BY id ASC');
  return result.rows.map(formatVenue);
}

async function upsertVenue({ id, name, capacity, type, location, isActive = true }) {
  const result = await db.query(
    `INSERT INTO venues (id, name, capacity, type, location, is_active)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       capacity = EXCLUDED.capacity,
       type = EXCLUDED.type,
       location = EXCLUDED.location,
       is_active = EXCLUDED.is_active
     RETURNING *`,
    [id, name, capacity, type, location, isActive]
  );
  return formatVenue(result.rows[0]);
}

async function updateVenueStatus(id, isActive) {
  const result = await db.query(
    'UPDATE venues SET is_active = $1 WHERE id = $2 RETURNING *',
    [isActive, id]
  );
  return formatVenue(result.rows[0]);
}

module.exports = {
  createSocietyRegistration,
  findAllSocietyRegistrations,
  updateSocietyRegistrationStatus,
  findAllVenues,
  upsertVenue,
  updateVenueStatus,
};

const db = require('../db');

function formatVenue(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    location: row.location,
    description: row.description,
    facilities: row.facilities ? String(row.facilities).split(',').map((item) => item.trim()).filter(Boolean) : [],
    contactPerson: row.contact_person,
    contactPhone: row.contact_phone,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

async function findAll({ includeInactive = true } = {}) {
  const result = await db.query(
    `
    SELECT id, name, location, description, facilities, contact_person,
           contact_phone, is_active, created_at
    FROM venues
    ${includeInactive ? '' : 'WHERE is_active = TRUE'}
    ORDER BY id ASC
    `,
  );

  return result.rows.map(formatVenue);
}

async function findById(id) {
  const result = await db.query(
    `
    SELECT id, name, location, description, facilities, contact_person,
           contact_phone, is_active, created_at
    FROM venues
    WHERE id = $1
    `,
    [id],
  );

  return formatVenue(result.rows[0]);
}

async function updateStatus(id, isActive) {
  const result = await db.query(
    `UPDATE venues SET is_active = $1 WHERE id = $2 RETURNING *`,
    [isActive, id],
  );

  return formatVenue(result.rows[0]);
}

module.exports = {
  findAll,
  findById,
  updateStatus,
};

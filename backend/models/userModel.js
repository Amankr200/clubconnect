const db = require('../db');

function formatUser(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    department: row.department || '',
    societyId: row.society_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findByEmail(email) {
  const result = await db.query(
    'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
    [email.trim()]
  );
  return formatUser(result.rows[0]);
}

async function findById(id) {
  if (!id) return null;
  const result = await db.query(
    'SELECT * FROM users WHERE id::text = $1',
    [String(id)]
  );
  return formatUser(result.rows[0]);
}

async function createUser({ name, email, passwordHash, role, department = '', societyId = null }) {
  const result = await db.query(
    `INSERT INTO users (name, email, password_hash, role, department, society_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [name, email.toLowerCase().trim(), passwordHash, role, department, societyId]
  );
  return formatUser(result.rows[0]);
}

async function findAllUsers() {
  const result = await db.query('SELECT * FROM users ORDER BY name ASC');
  return result.rows.map(formatUser);
}

async function updateUser(id, { name, email, passwordHash, role, department = '', societyId = null }) {
  const result = await db.query(
    `UPDATE users
     SET name = $1,
         email = $2,
         password_hash = COALESCE($3, password_hash),
         role = $4,
         department = $5,
         society_id = $6,
         updated_at = NOW()
     WHERE id = $7
     RETURNING *`,
    [name, email.toLowerCase().trim(), passwordHash, role, department, societyId, id]
  );
  return formatUser(result.rows[0]);
}

async function deleteUser(id) {
  const result = await db.query(
    'DELETE FROM users WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows[0] || null;
}

module.exports = {
  findByEmail,
  findById,
  createUser,
  findAllUsers,
  updateUser,
  deleteUser,
};

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
  const result = await db.query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return formatUser(result.rows[0]);
}

async function createUser({ name, email, passwordHash, role, department = '' }) {
  const result = await db.query(
    `INSERT INTO users (name, email, password_hash, role, department)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, email.toLowerCase().trim(), passwordHash, role, department]
  );
  return formatUser(result.rows[0]);
}

async function findAllUsers() {
  const result = await db.query('SELECT * FROM users ORDER BY name ASC');
  return result.rows.map(formatUser);
}

module.exports = {
  findByEmail,
  findById,
  createUser,
  findAllUsers,
};

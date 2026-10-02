const db = require("../db");

function formatStudent(row) {
  if (!row) return null;

  return {
    enrollmentId: row.enrollment_id,
    name: row.name,
    collegeEmailId: row.college_email_id,
    branch: row.branch,
    year: row.year,
  };
}

async function create({ enrollmentId, name, collegeEmailId, branch, year = 1 }) {
  const query = `
    INSERT INTO students (enrollment_id, name, college_email_id, branch, year)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;

  const values = [enrollmentId, name, collegeEmailId, branch, year];
  const result = await db.query(query, values);

  return formatStudent(result.rows[0]);
}

async function findByEmail(collegeEmailId) {
  const query = `
    SELECT *
    FROM students
    WHERE college_email_id = $1;
  `;

  const result = await db.query(query, [collegeEmailId]);

  return formatStudent(result.rows[0]);
}

async function findById(id) {
  const query = `
    SELECT *
    FROM students
    WHERE enrollment_id = $1;
  `;

  const result = await db.query(query, [id]);

  return formatStudent(result.rows[0]);
}

async function getAll() {
  const result = await db.query(`
    SELECT *
    FROM students
    ORDER BY enrollment_id;
  `);

  return result.rows.map(formatStudent);
}

async function getAllNameAndEmail() {
  const result = await db.query(`
    SELECT name, college_email_id
    FROM students
    ORDER BY enrollment_id;
  `);

  return result.rows.map(formatStudent);
}

async function deleteById(id) {
  await db.query(
    `DELETE FROM students WHERE enrollment_id = $1`,
    [id]
  );
}

module.exports = {
  create,
  findByEmail,
  findById,
  getAll,
  getAllNameAndEmail,
  deleteById,
};
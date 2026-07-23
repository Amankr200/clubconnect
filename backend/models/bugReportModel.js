const db = require('../db');

function formatBugReport(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    userEmail: row.user_email,
    pageUrl: row.page_url,
    status: row.status,
    createdAt: row.created_at,
  };
}

async function createBugReport({ title, description, userEmail, pageUrl = '' }) {
  const result = await db.query(
    `INSERT INTO bug_reports (title, description, user_email, page_url)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [title, description, userEmail, pageUrl]
  );
  return formatBugReport(result.rows[0]);
}

async function findAllBugReports() {
  const result = await db.query('SELECT * FROM bug_reports ORDER BY created_at DESC');
  return result.rows.map(formatBugReport);
}

async function updateBugStatus(id, status) {
  const result = await db.query(
    'UPDATE bug_reports SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );
  return formatBugReport(result.rows[0]);
}

module.exports = {
  createBugReport,
  findAllBugReports,
  updateBugStatus,
};

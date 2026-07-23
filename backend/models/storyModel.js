const db = require('../db');

function formatStory(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    mediaUrl: row.media_url,
    mediaType: row.media_type,
    authorName: row.author_name,
    authorRole: row.author_role,
    viewsCount: row.views_count,
    clicksCount: row.clicks_count,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

async function findActiveStories() {
  const result = await db.query(
    'SELECT * FROM stories WHERE expires_at > NOW() ORDER BY created_at DESC'
  );
  return result.rows.map(formatStory);
}

async function createStory({ title, mediaUrl, mediaType = 'image', authorName, authorRole }) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
  const result = await db.query(
    `INSERT INTO stories (title, media_url, media_type, author_name, author_role, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [title, mediaUrl, mediaType, authorName, authorRole, expiresAt]
  );
  return formatStory(result.rows[0]);
}

async function incrementView(id) {
  const result = await db.query(
    `UPDATE stories SET views_count = views_count + 1 WHERE id = $1 RETURNING *`,
    [id]
  );
  return formatStory(result.rows[0]);
}

async function incrementClick(id) {
  const result = await db.query(
    `UPDATE stories SET clicks_count = clicks_count + 1 WHERE id = $1 RETURNING *`,
    [id]
  );
  return formatStory(result.rows[0]);
}

module.exports = {
  findActiveStories,
  createStory,
  incrementView,
  incrementClick,
};

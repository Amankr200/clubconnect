const db = require('../db');

function formatSociety(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    fullName: row.full_name,
    category: row.category,
    description: row.description,
    vision: row.vision || '',
    mission: row.mission || '',
    logo: row.logo,
    banner: row.banner,
    rating: parseFloat(row.rating || 4.5),
    facultyCoordinator: row.faculty_coordinator || {},
    studentCoordinators: row.student_coordinators || [],
    createdAt: row.created_at,
  };
}

async function findAllSocieties() {
  const result = await db.query('SELECT * FROM societies ORDER BY name ASC');
  return result.rows.map(formatSociety);
}

async function findSocietyByName(name) {
  const result = await db.query('SELECT * FROM societies WHERE LOWER(name) = LOWER($1)', [name.trim()]);
  return formatSociety(result.rows[0]);
}

async function createSociety(data) {
  const { name, fullName, category, description, vision = '', mission = '', logo, banner, rating = 4.5, facultyCoordinator = {}, studentCoordinators = [] } = data;
  const facultyJson = typeof facultyCoordinator === 'string' ? facultyCoordinator : JSON.stringify(facultyCoordinator);
  const studentJson = typeof studentCoordinators === 'string' ? studentCoordinators : JSON.stringify(studentCoordinators);

  try {
    const result = await db.query(
      `INSERT INTO societies (name, full_name, category, description, vision, mission, logo, banner, rating, faculty_coordinator, student_coordinators)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (name) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         category = EXCLUDED.category,
         description = EXCLUDED.description,
         vision = EXCLUDED.vision,
         mission = EXCLUDED.mission,
         logo = EXCLUDED.logo,
         banner = EXCLUDED.banner,
         faculty_coordinator = EXCLUDED.faculty_coordinator,
         student_coordinators = EXCLUDED.student_coordinators
       RETURNING *`,
      [name, fullName || `${name} Society`, category, description, vision, mission, logo, banner, rating, facultyJson, studentJson]
    );
    return formatSociety(result.rows[0]);
  } catch (err) {
    try {
      const updateRes = await db.query(
        `UPDATE societies SET full_name = $1, category = $2, description = $3, vision = $4, mission = $5, logo = $6, banner = $7, faculty_coordinator = $8, student_coordinators = $9
         WHERE LOWER(name) = LOWER($10) RETURNING *`,
        [fullName || `${name} Society`, category, description, vision, mission, logo, banner, facultyJson, studentJson, name]
      );
      if (updateRes.rows.length > 0) {
        return formatSociety(updateRes.rows[0]);
      }
    } catch {}

    const fallbackRes = await db.query(
      `INSERT INTO societies (name, full_name, category, description, vision, mission, logo, banner, rating, faculty_coordinator, student_coordinators)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [name, fullName || `${name} Society`, category, description, vision, mission, logo, banner, rating, facultyJson, studentJson]
    );
    return formatSociety(fallbackRes.rows[0]);
  }
}

async function updateSociety(name, updates) {
  const society = await findSocietyByName(name);
  if (!society) return null;

  const setClauses = [];
  const values = [];
  let idx = 1;

  if (updates.fullName !== undefined) {
    setClauses.push(`full_name = $${idx++}`);
    values.push(updates.fullName);
  }
  if (updates.description !== undefined) {
    setClauses.push(`description = $${idx++}`);
    values.push(updates.description);
  }
  if (updates.vision !== undefined) {
    setClauses.push(`vision = $${idx++}`);
    values.push(updates.vision);
  }
  if (updates.mission !== undefined) {
    setClauses.push(`mission = $${idx++}`);
    values.push(updates.mission);
  }
  if (updates.banner !== undefined) {
    setClauses.push(`banner = $${idx++}`);
    values.push(updates.banner);
  }
  if (updates.logo !== undefined) {
    setClauses.push(`logo = $${idx++}`);
    values.push(updates.logo);
  }
  if (updates.rating !== undefined) {
    setClauses.push(`rating = $${idx++}`);
    values.push(updates.rating);
  }
  if (updates.facultyCoordinator !== undefined) {
    setClauses.push(`faculty_coordinator = $${idx++}`);
    values.push(JSON.stringify(updates.facultyCoordinator));
  }
  if (updates.studentCoordinators !== undefined) {
    setClauses.push(`student_coordinators = $${idx++}`);
    values.push(JSON.stringify(updates.studentCoordinators));
  }

  if (setClauses.length === 0) return society;

  values.push(society.id);
  const result = await db.query(
    `UPDATE societies SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return formatSociety(result.rows[0]);
}

module.exports = {
  findAllSocieties,
  findSocietyByName,
  createSociety,
  updateSociety,
};

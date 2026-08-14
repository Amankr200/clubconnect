const { Pool } = require('pg');
const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!connectionString) {
  console.warn('⚠️  DATABASE_URL is not set in environment variables.');
}

const isLocalhost = connectionString && (connectionString.includes('localhost') || connectionString.includes('127.0.0.1'));

const pool = new Pool({
  connectionString,
  ssl: isLocalhost ? false : { rejectUnauthorized: false },
});

const query = (text, params) => pool.query(text, params);

async function initDb() {
  const client = await pool.connect();
  try {
    // Ensure pgcrypto is available for gen_random_uuid()
    await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        department VARCHAR(100) DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT '';

      CREATE TABLE IF NOT EXISTS societies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        full_name VARCHAR(255) DEFAULT '',
        category VARCHAR(100) DEFAULT 'Technical',
        description TEXT DEFAULT '',
        vision TEXT DEFAULT '',
        mission TEXT DEFAULT '',
        logo TEXT DEFAULT '',
        banner TEXT DEFAULT '',
        rating NUMERIC(3,2) DEFAULT 4.50,
        faculty_coordinator JSONB DEFAULT '{}'::jsonb,
        student_coordinators JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Ensure all missing columns exist in existing societies table
    await client.query(`ALTER TABLE societies ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) DEFAULT '';`);
    await client.query(`ALTER TABLE societies ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Technical';`);
    await client.query(`ALTER TABLE societies ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';`);
    await client.query(`ALTER TABLE societies ADD COLUMN IF NOT EXISTS vision TEXT DEFAULT '';`);
    await client.query(`ALTER TABLE societies ADD COLUMN IF NOT EXISTS mission TEXT DEFAULT '';`);
    await client.query(`ALTER TABLE societies ADD COLUMN IF NOT EXISTS logo TEXT DEFAULT '';`);
    await client.query(`ALTER TABLE societies ADD COLUMN IF NOT EXISTS banner TEXT DEFAULT '';`);
    await client.query(`ALTER TABLE societies ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 4.50;`);
    await client.query(`ALTER TABLE societies ADD COLUMN IF NOT EXISTS faculty_coordinator JSONB DEFAULT '{}'::jsonb;`);
    await client.query(`ALTER TABLE societies ADD COLUMN IF NOT EXISTS student_coordinators JSONB DEFAULT '[]'::jsonb;`);

    await client.query(`

      CREATE TABLE IF NOT EXISTS venues (
        id INT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        location VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS society_registrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        society_name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        requested_by_email VARCHAR(255) NOT NULL,
        requested_by_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS stories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        media_url TEXT NOT NULL,
        media_type VARCHAR(20) DEFAULT 'image',
        author_name VARCHAR(255) NOT NULL,
        author_role VARCHAR(100) NOT NULL,
        views_count INT DEFAULT 0,
        clicks_count INT DEFAULT 0,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS students (
        enrollment_id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        name VARCHAR(100) NOT NULL,
        college_email_id VARCHAR(150) NOT NULL UNIQUE,
        branch VARCHAR(6) NOT NULL,
        year SMALLINT DEFAULT 1 NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "students_pkey" ON "students" ("enrollment_id");

      CREATE TABLE IF NOT EXISTS stud_club (
        stud_id bigint,
        club_id smallint,
        CONSTRAINT "unique_record" PRIMARY KEY("stud_id","club_id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS unique_record ON stud_club (stud_id, club_id);

      CREATE TABLE IF NOT EXISTS bug_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        page_url VARCHAR(255) DEFAULT '',
        status VARCHAR(50) DEFAULT 'open',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS venue_bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        venue_id INT NOT NULL,
        date VARCHAR(20) NOT NULL,
        time_slots JSONB NOT NULL,
        event_name VARCHAR(255) NOT NULL,
        host_club SMALLINT NOT NULL,
        photo TEXT,
        photo_file_name VARCHAR(255),
        description TEXT NOT NULL,
        eligibility TEXT NOT NULL,
        attendance VARCHAR(100) NOT NULL,
        feedback TEXT NOT NULL,
        student_coordinators TEXT NOT NULL,
        requested_by JSONB NOT NULL,
        assigned_faculty_coordinator JSONB DEFAULT '{}'::jsonb,
        status VARCHAR(50) NOT NULL DEFAULT 'pending_faculty',
        current_reviewer_role VARCHAR(50) DEFAULT 'faculty_coordinator',
        change_request JSONB DEFAULT '{}'::jsonb,
        review_trail JSONB DEFAULT '[]'::jsonb,
        approved_at TIMESTAMPTZ DEFAULT NULL,
        requested_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ All PostgreSQL database schemas verified');
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query,
  initDb,
};

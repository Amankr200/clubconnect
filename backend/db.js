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
        full_name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        logo TEXT NOT NULL,
        banner TEXT NOT NULL,
        rating NUMERIC(3,2) DEFAULT 4.50,
        faculty_coordinator JSONB DEFAULT '{}'::jsonb,
        student_coordinators JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS venues (
        id INT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        capacity INT NOT NULL,
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
        host_club VARCHAR(255) NOT NULL,
        photo TEXT NOT NULL,
        photo_file_name VARCHAR(255) NOT NULL,
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

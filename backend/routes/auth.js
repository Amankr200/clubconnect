const express  = require('express');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const userModel = require('../models/userModel');
const studentModel = require('../models/studentModel');
const db        = require('../db');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'clubconnect_super_secret_jwt_key_2026';
const BRANCHES = new Set(['CSE', 'IT', 'ECE', 'EEE', 'ME', 'CE', 'AI', 'AIDS', 'CSBS', 'BBA', 'BCA', 'MCA', 'MBA', 'Other']);
const INTERESTS = new Set([
  'Technical', 'Dance', 'Drama', 'Art', 'Singing', 'Literature', 'Social Service', 'Finance',
  'Entrepreneurship', 'Sports', 'Photography', 'Content Creation', 'Public Speaking', 'Design',
  'Gaming', 'Robotics', 'AI & ML', 'Cyber Security', 'Open Source', 'Other',
]);

/* ─── Helper ─────────────────────────────────────────────── */
const signToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

/* ─── POST /api/auth/student-register ────────────────────── */
router.post('/student-register', async (req, res) => {
  const {
    enrolment_id: enrolmentId,
    name,
    college_email_id: collegeEmailId,
    branch,
    year,
    password,
    interests,
  } = req.body;

  const email = typeof collegeEmailId === 'string' ? collegeEmailId.trim().toLowerCase() : '';
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const admissionYear = Number(year);
  const currentYear = new Date().getFullYear();
  const validEnrolmentId = typeof enrolmentId === 'string'
    && /^\d{8,20}$/.test(enrolmentId)
    && BigInt(enrolmentId) <= 9223372036854775807n;

  if (!validEnrolmentId) {
    return res.status(400).json({ field: 'enrolment_id', message: 'Enter an 8–20 digit Enrolment ID within the supported BIGINT range.' });
  }
  if (normalizedName.length < 3 || normalizedName.length > 100) {
    return res.status(400).json({ message: 'Full name must be between 3 and 100 characters.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Enter a valid college email address.' });
  }
  const emailDomain = process.env.COLLEGE_EMAIL_DOMAIN?.replace(/^@/, '').toLowerCase();
  if (emailDomain && !email.endsWith(`@${emailDomain}`)) {
    return res.status(400).json({ message: `Use your @${emailDomain} email address.` });
  }
  if (typeof password !== 'string' || password.length < 8
    || !/[A-Z]/.test(password) || !/[a-z]/.test(password)
    || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return res.status(400).json({ message: 'Password does not meet the required strength.' });
  }
  if (!BRANCHES.has(branch)) {
    return res.status(400).json({ message: 'Select a valid branch.' });
  }
  if (!Number.isInteger(admissionYear) || admissionYear < currentYear - 10 || admissionYear > currentYear) {
    return res.status(400).json({ message: 'Select a valid year of admission.' });
  }
  if (!Array.isArray(interests) || interests.length === 0 || interests.some((interest) => !INTERESTS.has(interest))) {
    return res.status(400).json({ message: 'Select at least one valid interest.' });
  }

  let client;
  try {
    client = await db.pool.connect();
    const passwordHash = await bcrypt.hash(password, await bcrypt.genSalt(10));
    await client.query('BEGIN');
    const existing = await client.query(
      'SELECT EXISTS (SELECT 1 FROM students WHERE LOWER(college_email_id) = $1) AS found',
      [email]
    );
    if (existing.rows[0].found) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'User already exists' });
    }

    await client.query(
      `INSERT INTO students (enrollment_id, name, college_email_id, branch, year, password, interests)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [enrolmentId, normalizedName, email, branch, admissionYear, passwordHash, interests]
    );
    await client.query('COMMIT');
    return res.status(201).json({ success: true, message: 'Account created successfully' });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (error.code === '23505') {
      if (error.constraint === 'students_pkey' || error.constraint === 'students_enrollment_id_key') {
        return res.status(409).json({ field: 'enrolment_id', message: 'An account already exists with this Enrolment ID.' });
      }
      if (error.constraint?.includes('college_email_id')) {
        return res.status(409).json({ message: 'User already exists' });
      }
      return res.status(409).json({ message: 'User already exists' });
    }
    console.error('[/student-register]', error);
    return res.status(500).json({ message: 'Something went wrong. Please try again.' });
  } finally {
    client?.release();
  }
});

/* ─── POST /api/auth/login ───────────────────────────────── */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const student = await studentModel.findByEmailForAuth(email);
    const user = student
      ? {
        id: student.enrollmentId,
        name: student.name,
        email: student.collegeEmailId,
        role: 'student',
        passwordHash: student.passwordHash,
      }
      : await userModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(user);

    res.json({
      token,
      user: {
        id:    user.id,
        name:  user.name,
        email: user.email,
        role:  user.role,
      },
    });
  } catch (err) {
    console.error('[/login]', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

/* ─── GET /api/auth/me ───────────────────────────────────── */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }

    let user = decoded.role === 'student'
      ? await studentModel.findById(decoded.id)
      : null;
    if (!user) user = await userModel.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({
      id:    user.id ?? user.enrollmentId,
      name:  user.name,
      email: user.email || user.collegeEmailId,
      role:  user.role || decoded.role,
    });
  } catch (err) {
    console.error('[/me]', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;

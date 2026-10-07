const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const studentModel = require('../models/studentModel');

const JWT_SECRET = process.env.JWT_SECRET || 'clubconnect_super_secret_jwt_key_2026';

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Invalid or expired token.' });
    }

    const student = decoded.role === 'student'
      ? await studentModel.findById(decoded.id)
      : null;
    const user = student
      ? {
        id: student.enrollmentId,
        name: student.name,
        email: student.collegeEmailId,
        role: 'student',
      }
      : await userModel.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'User account not found.' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    return next();
  } catch (error) {
    console.error('[requireAuth]', error);
    return res.status(500).json({ success: false, code: 'INTERNAL_SERVER_ERROR', message: 'Server error.' });
  }
}

module.exports = requireAuth;
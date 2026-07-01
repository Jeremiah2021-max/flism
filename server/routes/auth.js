const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');
const { notifyAdmins } = require('../lib/notifyAdmins');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password, full_name, phone, university, student_id, department, faculty, year_of_study, momo_number, momo_provider } = req.body;
  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Email, password and full name are required' });
  }
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, phone, university, student_id, department, faculty, year_of_study, momo_number, momo_provider)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, email, full_name, trust_score, loan_limit, is_verified, is_kyc_complete, university, phone, student_id, department, momo_number, momo_provider, role`,
      [email, hash, full_name, phone || null, university || 'University of Ghana', student_id || null,
       department || null, faculty || null, year_of_study || null, momo_number || null, momo_provider || 'MTN MoMo']
    );
    const user = result.rows[0];

    // Create welcome notification
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
      [user.id, 'Welcome to Flism!', 'Your account has been created. Complete your KYC to start borrowing.', 'info']
    );
    await notifyAdmins(
      '🎓 New Student Registered',
      `${full_name} from ${university || 'University of Ghana'} just created an account (${email}).`,
      'info'
    );

    const token = jwt.sign({ userId: user.id, role: user.role || 'student' }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const result = await pool.query(
      `SELECT id, email, full_name, password_hash, trust_score, loan_limit, is_verified, is_kyc_complete, university, phone, student_id, profile_image, role
       FROM users WHERE email = $1`,
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const { password_hash, ...safeUser } = user;
    const token = jwt.sign({ userId: user.id, role: user.role || 'student' }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

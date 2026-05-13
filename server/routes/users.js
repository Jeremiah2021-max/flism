const express = require('express');
const { pool } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, full_name, phone, student_id, university, trust_score, loan_limit, is_verified, is_kyc_complete, profile_image, created_at
       FROM users WHERE id = $1`,
      [req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/me', authMiddleware, async (req, res) => {
  const { full_name, phone, university, student_id } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET full_name = COALESCE($1, full_name), phone = COALESCE($2, phone),
       university = COALESCE($3, university), student_id = COALESCE($4, student_id)
       WHERE id = $5
       RETURNING id, email, full_name, phone, student_id, university, trust_score, loan_limit, is_verified, is_kyc_complete`,
      [full_name, phone, university, student_id, req.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/kyc', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE users SET is_kyc_complete = true, is_verified = true, trust_score = trust_score + 50
       WHERE id = $1
       RETURNING id, trust_score, is_kyc_complete, is_verified`,
      [req.userId]
    );
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
      [req.userId, 'KYC Verified!', 'Your identity has been verified. You can now request loans.', 'success']
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

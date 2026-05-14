const express = require('express');
const { pool } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const USER_FIELDS = `
  id, email, full_name, phone, student_id, university, department, faculty, year_of_study,
  date_of_birth, address, ghana_card_number, momo_number, momo_provider,
  trust_score, loan_limit, is_verified, is_kyc_complete, is_student_verified,
  kyc_step, role, profile_image, created_at
`;

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`SELECT ${USER_FIELDS} FROM users WHERE id = $1`, [req.userId]);
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/me', authMiddleware, async (req, res) => {
  const { full_name, phone, university, student_id, momo_number, momo_provider } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET
        full_name = COALESCE($1, full_name),
        phone = COALESCE($2, phone),
        university = COALESCE($3, university),
        student_id = COALESCE($4, student_id),
        momo_number = COALESCE($5, momo_number),
        momo_provider = COALESCE($6, momo_provider)
       WHERE id = $7
       RETURNING ${USER_FIELDS}`,
      [full_name, phone, university, student_id, momo_number, momo_provider, req.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* Step-based KYC: step 1 = identity, 2 = student, 3 = momo */
router.post('/kyc/identity', authMiddleware, async (req, res) => {
  const { ghana_card_number, date_of_birth, address } = req.body;
  if (!ghana_card_number || !date_of_birth || !address) {
    return res.status(400).json({ error: 'All identity fields are required' });
  }
  try {
    const step = await pool.query('SELECT kyc_step FROM users WHERE id = $1', [req.userId]);
    const currentStep = step.rows[0]?.kyc_step ?? 0;
    const newStep = Math.max(currentStep, 1);
    const result = await pool.query(
      `UPDATE users SET ghana_card_number=$1, date_of_birth=$2, address=$3, kyc_step=$4 WHERE id=$5 RETURNING ${USER_FIELDS}`,
      [ghana_card_number, date_of_birth, address, newStep, req.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/kyc/student', authMiddleware, async (req, res) => {
  const { department, faculty, year_of_study, student_id } = req.body;
  if (!department || !year_of_study) {
    return res.status(400).json({ error: 'Department and year are required' });
  }
  try {
    const newScore = `trust_score + CASE WHEN is_student_verified THEN 0 ELSE 20 END`;
    const result = await pool.query(
      `UPDATE users SET department=$1, faculty=$2, year_of_study=$3, student_id=COALESCE($4, student_id),
       is_student_verified=true, kyc_step=GREATEST(kyc_step, 2), trust_score=${newScore}
       WHERE id=$5 RETURNING ${USER_FIELDS}`,
      [department, faculty, year_of_study, student_id, req.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/kyc/momo', authMiddleware, async (req, res) => {
  const { momo_number, momo_provider } = req.body;
  if (!momo_number || !momo_provider) {
    return res.status(400).json({ error: 'Mobile Money number and provider are required' });
  }
  try {
    const result = await pool.query(
      `UPDATE users SET momo_number=$1, momo_provider=$2, kyc_step=GREATEST(kyc_step, 3) WHERE id=$3 RETURNING ${USER_FIELDS}`,
      [momo_number, momo_provider, req.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* Final KYC submit — mark fully complete, give trust boost */
router.post('/kyc/complete', authMiddleware, async (req, res) => {
  try {
    const check = await pool.query('SELECT kyc_step, is_kyc_complete FROM users WHERE id=$1', [req.userId]);
    if (check.rows[0]?.is_kyc_complete) {
      return res.status(400).json({ error: 'KYC already completed' });
    }
    const result = await pool.query(
      `UPDATE users SET is_kyc_complete=true, is_verified=true, kyc_step=4,
       trust_score=trust_score+50, loan_limit=loan_limit+200 WHERE id=$1 RETURNING ${USER_FIELDS}`,
      [req.userId]
    );
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)`,
      [req.userId, 'KYC Verified!', 'Your identity has been verified. Your trust score increased and loan limit raised.', 'success']
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* Legacy KYC endpoint (backward compat) */
router.post('/kyc', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE users SET is_kyc_complete=true, is_verified=true, trust_score=trust_score+50 WHERE id=$1
       RETURNING ${USER_FIELDS}`,
      [req.userId]
    );
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)`,
      [req.userId, 'KYC Verified!', 'Your identity has been verified. You can now request loans.', 'success']
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

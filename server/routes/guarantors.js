const express = require('express');
const { pool } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM guarantors WHERE user_id=$1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  const { name, phone, email, relationship } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });
  try {
    const existing = await pool.query('SELECT COUNT(*) FROM guarantors WHERE user_id=$1', [req.userId]);
    if (parseInt(existing.rows[0].count) >= 3) {
      return res.status(400).json({ error: 'Maximum of 3 guarantors allowed' });
    }
    const result = await pool.query(
      `INSERT INTO guarantors (user_id, name, phone, email, relationship) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.userId, name, phone, email || null, relationship || 'Parent/Guardian']
    );
    await pool.query(
      `UPDATE users SET trust_score=trust_score+10 WHERE id=$1`,
      [req.userId]
    );
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)`,
      [req.userId, 'Guarantor Added', `${name} has been added as your guarantor. Your trust score increased by 10 points.`, 'success']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM guarantors WHERE id=$1 AND user_id=$2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Guarantor not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

const express = require('express');
const { pool } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM assets WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, l.id as active_loan_id, l.amount as loan_amount, l.status as loan_status
       FROM assets a
       LEFT JOIN loans l ON l.asset_id = a.id AND l.status IN ('active', 'pending')
       WHERE a.id = $1 AND a.user_id = $2`,
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Asset not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  const { type, description, serial_number, estimated_value, condition, brand, model } = req.body;
  if (!type || !estimated_value) {
    return res.status(400).json({ error: 'Asset type and estimated value are required' });
  }
  if (parseFloat(estimated_value) < 200) {
    return res.status(400).json({ error: 'Minimum asset value is GHS 200' });
  }
  try {
    const loanValue = (parseFloat(estimated_value) * 0.55).toFixed(2);
    const result = await pool.query(
      `INSERT INTO assets (user_id, type, description, serial_number, estimated_value, loan_value, condition, brand, model)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.userId, type, description, serial_number, estimated_value, loanValue, condition || 'good', brand || null, model || null]
    );
    const asset = result.rows[0];

    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
      [req.userId, 'Asset Submitted', `Your ${type} has been submitted for verification. Estimated loan value: GHS ${loanValue}.`, 'info']
    );

    res.status(201).json(asset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: approve asset (for demo, accessible by any user to simulate approval)
router.post('/:id/approve', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE assets SET status = 'approved' WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Asset not found' });
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
      [req.userId, 'Asset Approved!', `Your ${result.rows[0].type} has been approved as collateral. You can now use it to request a loan.`, 'success']
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

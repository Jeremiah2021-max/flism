const express = require('express');
const { pool } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { notifyAdmins } = require('../lib/notifyAdmins');
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
    const ownerRow = await pool.query('SELECT full_name, university FROM users WHERE id = $1', [req.userId]);
    const o = ownerRow.rows[0];
    await notifyAdmins(
      'New Asset Submitted',
      `${o.full_name} (${o.university}) submitted a ${brand ? brand + ' ' : ''}${type}${model ? ' ' + model : ''} for verification. Est. value: GHS ${parseFloat(estimated_value).toFixed(2)}.`,
      'info'
    );

    res.status(201).json(asset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin only: approve or reject an asset
router.post('/:id/approve', authMiddleware, async (req, res) => {
  // Security: only admins may approve assets
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const result = await pool.query(
      `UPDATE assets SET status = 'approved' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Asset not found' });
    const asset = result.rows[0];
    // Notify the asset owner
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
      [asset.user_id, 'Asset Approved!', `Your ${asset.type} has been approved as collateral. You can now use it to request a loan.`, 'success']
    );
    res.json(asset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin only: reject an asset
router.post('/:id/reject', authMiddleware, async (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const { reason } = req.body;
  try {
    const result = await pool.query(
      `UPDATE assets SET status = 'rejected' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Asset not found' });
    const asset = result.rows[0];
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
      [asset.user_id, 'Asset Not Approved', reason || `Your ${asset.type} could not be verified as collateral.`, 'error']
    );
    res.json(asset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

const express = require('express');
const { pool } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

function adminOnly(req, res, next) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

router.get('/stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [users, loans, assets, txns] = await Promise.all([
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_kyc_complete) as verified FROM users'),
      pool.query(`SELECT COUNT(*) as total,
        COUNT(*) FILTER (WHERE status='active') as active,
        COUNT(*) FILTER (WHERE status='pending') as pending,
        COUNT(*) FILTER (WHERE status='defaulted') as defaulted,
        COALESCE(SUM(amount),0) as total_disbursed FROM loans`),
      pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='pending') as pending FROM assets`),
      pool.query(`SELECT COALESCE(SUM(amount),0) as total_repaid FROM transactions WHERE type='repayment' AND status='success'`),
    ]);
    res.json({
      users: users.rows[0],
      loans: loans.rows[0],
      assets: assets.rows[0],
      repaid: txns.rows[0].total_repaid,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, full_name, phone, university, trust_score, loan_limit,
       is_verified, is_kyc_complete, role, created_at FROM users ORDER BY created_at DESC LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/loans', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, u.full_name, u.email, u.phone, a.type as asset_type, a.brand as asset_brand
       FROM loans l
       JOIN users u ON l.user_id = u.id
       LEFT JOIN assets a ON l.asset_id = a.id
       ORDER BY l.created_at DESC LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/loans/:id/approve', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE loans SET status='active' WHERE id=$1 AND status='pending' RETURNING *`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Loan not found or not pending' });
    const loan = result.rows[0];
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)`,
      [loan.user_id, 'Loan Approved!', `Your loan of GHS ${parseFloat(loan.amount).toFixed(2)} has been approved and disbursed.`, 'success']
    );
    await pool.query(
      `INSERT INTO transactions (user_id, loan_id, type, amount, provider, status, notes) VALUES ($1,$2,'disbursement',$3,'Flism','success','Loan disbursement')`,
      [loan.user_id, loan.id, loan.amount]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/loans/:id/reject', authMiddleware, adminOnly, async (req, res) => {
  const { reason } = req.body;
  try {
    const result = await pool.query(
      `UPDATE loans SET status='rejected' WHERE id=$1 AND status='pending' RETURNING *`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Loan not found or not pending' });
    const loan = result.rows[0];
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)`,
      [loan.user_id, 'Loan Application Update', reason || 'Your loan application could not be approved at this time.', 'warning']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/assets/:id/approve', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE assets SET status='approved' WHERE id=$1 AND status='pending' RETURNING *`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Asset not found' });
    const asset = result.rows[0];
    await pool.query(
      `UPDATE users SET trust_score=trust_score+15 WHERE id=$1`,
      [asset.user_id]
    );
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)`,
      [asset.user_id, 'Asset Verified', `Your ${asset.brand ? asset.brand + ' ' : ''}${asset.type} has been verified. Trust score +15 pts.`, 'success']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/assets/:id/reject', authMiddleware, adminOnly, async (req, res) => {
  const { reason } = req.body;
  try {
    const result = await pool.query(
      `UPDATE assets SET status='rejected' WHERE id=$1 AND status='pending' RETURNING *`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Asset not found' });
    const asset = result.rows[0];
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)`,
      [asset.user_id, 'Asset Review Update', reason || 'Your asset submission could not be verified at this time. Please resubmit.', 'warning']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

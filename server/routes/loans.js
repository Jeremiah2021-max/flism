const express = require('express');
const { pool } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, a.type as asset_type, a.description as asset_description, a.estimated_value as asset_value
       FROM loans l
       LEFT JOIN assets a ON l.asset_id = a.id
       WHERE l.user_id = $1
       ORDER BY l.created_at DESC`,
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
      `SELECT l.*, a.type as asset_type, a.description as asset_description, a.estimated_value as asset_value, a.brand, a.model
       FROM loans l
       LEFT JOIN assets a ON l.asset_id = a.id
       WHERE l.id = $1 AND l.user_id = $2`,
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Loan not found' });

    const repayments = await pool.query(
      `SELECT * FROM repayments WHERE loan_id = $1 ORDER BY due_date ASC`,
      [req.params.id]
    );
    res.json({ ...result.rows[0], repayments: repayments.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  const { amount, purpose, asset_id, duration_days } = req.body;
  if (!amount || !purpose) {
    return res.status(400).json({ error: 'Amount and purpose are required' });
  }
  try {
    const user = await pool.query('SELECT loan_limit, trust_score FROM users WHERE id = $1', [req.userId]);
    const { loan_limit, trust_score } = user.rows[0];
    if (parseFloat(amount) > parseFloat(loan_limit)) {
      return res.status(400).json({ error: `Loan amount exceeds your limit of GHS ${loan_limit}` });
    }
    if (parseFloat(amount) < 50) {
      return res.status(400).json({ error: 'Minimum loan amount is GHS 50' });
    }

    // Check asset if provided
    if (asset_id) {
      const asset = await pool.query(
        `SELECT id, status, loan_value FROM assets WHERE id = $1 AND user_id = $2`,
        [asset_id, req.userId]
      );
      if (asset.rows.length === 0) return res.status(404).json({ error: 'Asset not found' });
      if (asset.rows[0].status !== 'approved') return res.status(400).json({ error: 'Asset must be approved to use as collateral' });
    }

    const interest_rate = trust_score >= 300 ? 3.5 : trust_score >= 200 ? 4.5 : 5.0;
    const days = duration_days || 30;
    const repayment_date = new Date();
    repayment_date.setDate(repayment_date.getDate() + days);

    const result = await pool.query(
      `INSERT INTO loans (user_id, asset_id, amount, purpose, duration_days, repayment_date, interest_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.userId, asset_id || null, amount, purpose, days, repayment_date, interest_rate]
    );
    const loan = result.rows[0];

    // Create repayment schedule
    const totalDue = parseFloat(amount) * (1 + interest_rate / 100);
    await pool.query(
      `INSERT INTO repayments (loan_id, amount, due_date) VALUES ($1, $2, $3)`,
      [loan.id, totalDue.toFixed(2), repayment_date]
    );

    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
      [req.userId, 'Loan Application Received', `Your loan request for GHS ${amount} is under review. We'll notify you shortly.`, 'info']
    );

    res.status(201).json(loan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/repay', authMiddleware, async (req, res) => {
  const { amount } = req.body;
  try {
    const loan = await pool.query(
      `SELECT * FROM loans WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );
    if (loan.rows.length === 0) return res.status(404).json({ error: 'Loan not found' });

    const loanData = loan.rows[0];
    const newRepaid = parseFloat(loanData.amount_repaid) + parseFloat(amount);
    const totalDue = parseFloat(loanData.amount) * (1 + parseFloat(loanData.interest_rate) / 100);
    const newStatus = newRepaid >= totalDue ? 'repaid' : 'active';

    await pool.query(
      `UPDATE loans SET amount_repaid = $1, status = $2 WHERE id = $3`,
      [newRepaid, newStatus, req.params.id]
    );
    await pool.query(
      `UPDATE repayments SET status = 'paid', paid_at = NOW() WHERE loan_id = $1 AND status = 'pending' LIMIT 1`,
      [req.params.id]
    );

    if (newStatus === 'repaid') {
      // Boost trust score on repayment
      await pool.query(
        `UPDATE users SET trust_score = LEAST(trust_score + 30, 500), loan_limit = LEAST(loan_limit * 1.2, 5000) WHERE id = $1`,
        [req.userId]
      );
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
        [req.userId, 'Loan Repaid!', 'Congratulations! Your loan has been fully repaid. Your trust score has increased.', 'success']
      );
    }

    res.json({ success: true, status: newStatus, amount_repaid: newRepaid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

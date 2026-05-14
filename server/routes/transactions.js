const express = require('express');
const { pool } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, l.purpose, l.amount as loan_amount
       FROM transactions t
       LEFT JOIN loans l ON t.loan_id = l.id
       WHERE t.user_id=$1
       ORDER BY t.created_at DESC LIMIT 50`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* Initiate a Mobile Money repayment */
router.post('/repay', authMiddleware, async (req, res) => {
  const { loan_id, amount, provider, momo_number } = req.body;
  if (!loan_id || !amount || !provider || !momo_number) {
    return res.status(400).json({ error: 'All payment fields are required' });
  }
  try {
    const loanCheck = await pool.query(
      'SELECT * FROM loans WHERE id=$1 AND user_id=$2 AND status IN (\'active\',\'pending\')',
      [loan_id, req.userId]
    );
    if (!loanCheck.rows.length) return res.status(404).json({ error: 'Loan not found or already settled' });
    const loan = loanCheck.rows[0];
    const interest = parseFloat(loan.amount) * parseFloat(loan.interest_rate) / 100;
    const totalDue = parseFloat(loan.amount) + interest - parseFloat(loan.amount_repaid || 0);
    if (parseFloat(amount) > totalDue + 1) {
      return res.status(400).json({ error: `Payment exceeds amount due (GHS ${totalDue.toFixed(2)})` });
    }

    const reference = `FLM-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const txn = await pool.query(
      `INSERT INTO transactions (user_id, loan_id, type, amount, provider, momo_number, reference, status, notes)
       VALUES ($1,$2,'repayment',$3,$4,$5,$6,'success',$7) RETURNING *`,
      [req.userId, loan_id, amount, provider, momo_number, reference, `MoMo repayment via ${provider}`]
    );

    const newRepaid = parseFloat(loan.amount_repaid || 0) + parseFloat(amount);
    const isFullyPaid = newRepaid >= totalDue - 0.01;
    const newStatus = isFullyPaid ? 'repaid' : 'active';

    await pool.query(
      `UPDATE loans SET amount_repaid=$1, status=$2 WHERE id=$3`,
      [newRepaid, newStatus, loan_id]
    );

    if (isFullyPaid) {
      await pool.query(
        `UPDATE users SET trust_score=trust_score+30 WHERE id=$1`,
        [req.userId]
      );
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)`,
        [req.userId, 'Loan Fully Repaid!', `Your loan has been fully settled. Trust score +30 pts.`, 'success']
      );
    } else {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)`,
        [req.userId, 'Payment Received', `GHS ${parseFloat(amount).toFixed(2)} repayment recorded via ${provider}. Ref: ${reference}`, 'info']
      );
    }

    res.json({ transaction: txn.rows[0], fully_paid: isFullyPaid, reference });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

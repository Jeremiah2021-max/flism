const express = require('express');
const { pool } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { notifyAdmins } = require('../lib/notifyAdmins');
const router = express.Router();

function calcPenalty(loan) {
  if (loan.status !== 'active') return { days_overdue: 0, penalty: 0 };
  const due = new Date(loan.repayment_date);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysOverdue = Math.max(0, Math.floor((today - due) / msPerDay));
  const penaltyRate = parseFloat(loan.penalty_rate ?? 0.5);
  const principal = parseFloat(loan.amount);
  const penalty = parseFloat((daysOverdue * (penaltyRate / 100) * principal).toFixed(2));
  return { days_overdue: daysOverdue, penalty };
}

function enrichLoan(loan) {
  const { days_overdue, penalty } = calcPenalty(loan);
  const principal = parseFloat(loan.amount);
  const interestRate = parseFloat(loan.interest_rate);
  const interest = parseFloat((principal * interestRate / 100).toFixed(2));
  const total_due = parseFloat((principal + interest + penalty).toFixed(2));
  return { ...loan, days_overdue, penalty_amount: penalty, interest_amount: interest, total_due };
}

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
    res.json(result.rows.map(enrichLoan));
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
    res.json({ ...enrichLoan(result.rows[0]), repayments: repayments.rows });
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
    
    // Check total outstanding loans
    const activeLoans = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_outstanding FROM loans WHERE user_id = $1 AND status IN ('active', 'pending')`,
      [req.userId]
    );
    const totalOutstanding = parseFloat(activeLoans.rows[0].total_outstanding);
    const newTotal = totalOutstanding + parseFloat(amount);
    
    if (newTotal > parseFloat(loan_limit)) {
      return res.status(400).json({ 
        error: `Loan amount exceeds your limit. You have GHS ${totalOutstanding.toFixed(2)} in active loans and your limit is GHS ${loan_limit}. Maximum additional loan: GHS ${(parseFloat(loan_limit) - totalOutstanding).toFixed(2)}` 
      });
    }
    if (parseFloat(amount) < 50) {
      return res.status(400).json({ error: 'Minimum loan amount is GHS 50' });
    }

    if (asset_id) {
      const asset = await pool.query(
        `SELECT id, status, loan_value FROM assets WHERE id = $1 AND user_id = $2`,
        [asset_id, req.userId]
      );
      if (asset.rows.length === 0) return res.status(404).json({ error: 'Asset not found' });
      if (asset.rows[0].status !== 'approved') return res.status(400).json({ error: 'Asset must be approved to use as collateral' });
    }

    const interest_rate = trust_score >= 300 ? 3.5 : trust_score >= 200 ? 4.5 : 5.0;
    const penalty_rate = 0.50;
    const days = duration_days || 30;
    const repayment_date = new Date();
    repayment_date.setDate(repayment_date.getDate() + days);

    const result = await pool.query(
      `INSERT INTO loans (user_id, asset_id, amount, purpose, duration_days, repayment_date, interest_rate, penalty_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.userId, asset_id || null, amount, purpose, days, repayment_date, interest_rate, penalty_rate]
    );
    const loan = result.rows[0];

    const interest = parseFloat(amount) * (interest_rate / 100);
    const totalDue = (parseFloat(amount) + interest).toFixed(2);
    await pool.query(
      `INSERT INTO repayments (loan_id, amount, due_date) VALUES ($1, $2, $3)`,
      [loan.id, totalDue, repayment_date]
    );

    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
      [req.userId, 'Loan Application Received', `Your loan request for GHS ${amount} is under review. We'll notify you shortly.`, 'info']
    );
    const studentRow = await pool.query('SELECT full_name, university FROM users WHERE id = $1', [req.userId]);
    const s = studentRow.rows[0];
    await notifyAdmins(
      'New Loan Request',
      `${s.full_name} (${s.university}) requested GHS ${parseFloat(amount).toFixed(2)} for "${purpose}". Loan #${loan.id}.`,
      'warning'
    );

    res.status(201).json(enrichLoan(loan));
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
    const { penalty } = calcPenalty(loanData);
    const principal = parseFloat(loanData.amount);
    const interestRate = parseFloat(loanData.interest_rate);
    const interest = principal * interestRate / 100;
    const totalDue = principal + interest + penalty;

    const newRepaid = parseFloat(loanData.amount_repaid) + parseFloat(amount);
    const newStatus = newRepaid >= totalDue ? 'repaid' : 'active';

    await pool.query(
      `UPDATE loans SET amount_repaid = $1, status = $2 WHERE id = $3`,
      [newRepaid.toFixed(2), newStatus, req.params.id]
    );
    // PostgreSQL does not support LIMIT on UPDATE; use a ctid subquery to mark
    // only the earliest pending repayment row as paid.
    await pool.query(
      `UPDATE repayments SET status = 'paid', paid_at = NOW()
       WHERE ctid = (
         SELECT ctid FROM repayments
         WHERE loan_id = $1 AND status = 'pending'
         ORDER BY due_date ASC
         LIMIT 1
       )`,
      [req.params.id]
    );

    if (newStatus === 'repaid') {
      const wasPenalised = penalty > 0;
      const trustBoost = wasPenalised ? 10 : 30;
      await pool.query(
        `UPDATE users SET trust_score = LEAST(trust_score + $1, 500), loan_limit = LEAST(loan_limit * 1.2, 5000) WHERE id = $2`,
        [trustBoost, req.userId]
      );
      const penaltyNote = wasPenalised
        ? ` A late penalty of GHS ${penalty.toFixed(2)} was applied.`
        : '';
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
        [req.userId, 'Loan Repaid', `Your loan has been fully repaid.${penaltyNote} Trust score +${trustBoost}.`, 'success']
      );
      const repayRow = await pool.query('SELECT full_name FROM users WHERE id = $1', [req.userId]);
      await notifyAdmins(
        '✅ Loan Fully Repaid',
        `${repayRow.rows[0].full_name} repaid Loan #${req.params.id} — GHS ${newRepaid.toFixed(2)} collected.${wasPenalised ? ` Penalty: GHS ${penalty.toFixed(2)}.` : ''}`,
        'success'
      );
    }

    res.json({ success: true, status: newStatus, amount_repaid: newRepaid, total_due: totalDue, penalty_applied: penalty });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

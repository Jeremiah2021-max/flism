const express = require('express');
const { pool } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { initializePayment, verifyPayment } = require('../services/paystack');

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

/* Initiate a Paystack payment for loan repayment */
router.post('/repay', authMiddleware, async (req, res) => {
  const { loan_id, amount } = req.body;
  if (!loan_id || !amount) {
    return res.status(400).json({ error: 'Loan ID and amount are required' });
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

    // Get user email for Paystack
    const userResult = await pool.query('SELECT email FROM users WHERE id=$1', [req.userId]);
    const userEmail = userResult.rows[0]?.email;

    if (!userEmail) {
      return res.status(400).json({ error: 'User email is required for payment' });
    }

    const reference = `FLM-REP-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    // Initialize Paystack transaction
    const paystackResponse = await initializePayment(
      parseFloat(amount),
      userEmail,
      reference,
      {
        loan_id,
        user_id: req.userId,
        type: 'loan_repayment',
      }
    );

    // Create pending transaction record
    const txn = await pool.query(
      `INSERT INTO transactions (user_id, loan_id, type, amount, reference, status, notes)
       VALUES ($1,$2,'repayment',$3,$4,'pending',$5) RETURNING *`,
      [req.userId, loan_id, amount, reference, `Paystack payment initiated - Ref: ${reference}`]
    );

    res.json({
      transaction: txn.rows[0],
      payment_url: paystackResponse.data.authorization_url,
      reference,
      access_code: paystackResponse.data.access_code,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* Process Mobile Money payment */
router.post('/momo-repay', authMiddleware, async (req, res) => {
  const { loan_id, amount, pin } = req.body;
  if (!loan_id || !amount || !pin) {
    return res.status(400).json({ error: 'Loan ID, amount, and PIN are required' });
  }
  if (pin.length !== 4) {
    return res.status(400).json({ error: 'Invalid PIN format' });
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

    // Get user's MoMo details
    const userResult = await pool.query(
      'SELECT momo_number, momo_provider FROM users WHERE id=$1',
      [req.userId]
    );
    const user = userResult.rows[0];

    if (!user || !user.momo_number) {
      return res.status(400).json({ error: 'Mobile Money number not configured. Please complete KYC.' });
    }

    // In production, this would integrate with actual Mobile Money APIs (MTN, Vodafone, etc.)
    // For now, we'll simulate the payment processing
    const reference = `FLM-MOMO-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create transaction record
    const txn = await pool.query(
      `INSERT INTO transactions (user_id, loan_id, type, amount, provider, momo_number, reference, status, notes)
       VALUES ($1,$2,'repayment',$3,$4,$5,$6,'success',$7) RETURNING *`,
      [req.userId, loan_id, amount, user.momo_provider, user.momo_number, reference, `Mobile Money payment via ${user.momo_provider} - Ref: ${reference}`]
    );

    // Update loan repayment
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
        [req.userId, 'Loan Fully Repaid!', `Your loan has been fully settled via Mobile Money. Trust score +30 pts.`, 'success']
      );
    } else {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)`,
        [req.userId, 'Payment Received', `GHS ${parseFloat(amount).toFixed(2)} repayment recorded via Mobile Money. Ref: ${reference}`, 'info']
      );
    }

    res.json({
      transaction: txn.rows[0],
      fully_paid: isFullyPaid,
      message: 'Mobile Money payment processed successfully',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* Verify Paystack payment callback */
router.get('/verify/:reference', async (req, res) => {
  const { reference } = req.params;
  try {
    const verification = await verifyPayment(reference);

    if (!verification.data.status || verification.data.status !== 'success') {
      return res.status(400).json({ error: 'Payment not successful' });
    }

    const metadata = verification.data.metadata;
    const { loan_id, user_id } = metadata;
    const amount = verification.data.amount / 100; // Convert from kobo to GHS

    // Check if transaction already processed
    const existingTxn = await pool.query(
      'SELECT * FROM transactions WHERE reference=$1 AND status=$2',
      [reference, 'success']
    );

    if (existingTxn.rows.length > 0) {
      return res.json({ message: 'Transaction already processed', transaction: existingTxn.rows[0] });
    }

    // Get loan details
    const loanCheck = await pool.query(
      'SELECT * FROM loans WHERE id=$1 AND user_id=$2',
      [loan_id, user_id]
    );

    if (!loanCheck.rows.length) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = loanCheck.rows[0];
    const interest = parseFloat(loan.amount) * parseFloat(loan.interest_rate) / 100;
    const totalDue = parseFloat(loan.amount) + interest - parseFloat(loan.amount_repaid || 0);

    // Update transaction to success
    const txn = await pool.query(
      `UPDATE transactions SET status='success', notes=$1 WHERE reference=$2 RETURNING *`,
      [`Paystack payment verified - Ref: ${reference}`, reference]
    );

    // Update loan repayment
    const newRepaid = parseFloat(loan.amount_repaid || 0) + amount;
    const isFullyPaid = newRepaid >= totalDue - 0.01;
    const newStatus = isFullyPaid ? 'repaid' : 'active';

    await pool.query(
      `UPDATE loans SET amount_repaid=$1, status=$2 WHERE id=$3`,
      [newRepaid, newStatus, loan_id]
    );

    if (isFullyPaid) {
      await pool.query(
        `UPDATE users SET trust_score=trust_score+30 WHERE id=$1`,
        [user_id]
      );
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)`,
        [user_id, 'Loan Fully Repaid!', `Your loan has been fully settled. Trust score +30 pts.`, 'success']
      );
    } else {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)`,
        [user_id, 'Payment Received', `GHS ${amount.toFixed(2)} repayment recorded via Paystack. Ref: ${reference}`, 'info']
      );
    }

    res.json({
      transaction: txn.rows[0],
      fully_paid: isFullyPaid,
      message: 'Payment verified and processed successfully',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

const express = require('express');
const { pool } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { initiateTransfer, createMoMoRecipient } = require('../services/paystack');

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

router.get('/assets', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.full_name, u.email, u.phone, u.university
       FROM assets a
       JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC LIMIT 200`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/users/:id/verify', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE users SET is_verified=true, is_kyc_complete=true, trust_score=trust_score+50, kyc_step=4
       WHERE id=$1 RETURNING id, email, full_name, is_verified, is_kyc_complete, trust_score`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)`,
      [req.params.id, 'Account Verified', 'Your account has been manually verified by the Flism team. Trust score +50 pts.', 'success']
    );
    res.json(result.rows[0]);
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

/* Helper: attempt disbursement via Paystack, trying MoMo first then bank */
async function attemptDisbursement(loan, user) {
  const reference = `FLM-DIS-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const amount = parseFloat(loan.amount);

  // 1. Try pre-registered MoMo recipient
  if (user.momo_recipient_code) {
    const transfer = await initiateTransfer({
      amount,
      recipient_code: user.momo_recipient_code,
      reference,
      reason: `Flism loan disbursement — ${loan.purpose}`,
    });
    if (transfer.status) {
      return { ok: true, reference, method: 'momo', label: `${user.momo_provider} wallet (${user.momo_number})` };
    }
  }

  // 2. Try creating MoMo recipient on the fly from KYC data
  if (user.momo_number && user.full_name) {
    try {
      const recipientRes = await createMoMoRecipient({
        name: user.full_name,
        phone: user.momo_number,
        provider: user.momo_provider || 'MTN MoMo',
      });
      if (recipientRes.status) {
        const momoCode = recipientRes.data.recipient_code;
        // Save for next time
        await pool.query('UPDATE users SET momo_recipient_code=$1 WHERE id=$2', [momoCode, user.id]);
        const transfer = await initiateTransfer({
          amount,
          recipient_code: momoCode,
          reference,
          reason: `Flism loan disbursement — ${loan.purpose}`,
        });
        if (transfer.status) {
          return { ok: true, reference, method: 'momo', label: `${user.momo_provider} wallet (${user.momo_number})` };
        }
      }
    } catch (_e) { /* fall through to bank */ }
  }

  // 3. Try bank account recipient
  if (user.recipient_code) {
    const transfer = await initiateTransfer({
      amount,
      recipient_code: user.recipient_code,
      reference,
      reason: `Flism loan disbursement — ${loan.purpose}`,
    });
    if (transfer.status) {
      return { ok: true, reference, method: 'bank', label: `${user.bank_name} (${user.account_number})` };
    }
  }

  return { ok: false, reference, method: 'manual', label: 'No payment method on file' };
}

router.put('/loans/:id/approve', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE loans SET status='active' WHERE id=$1 AND status='pending' RETURNING *`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Loan not found or not pending' });
    const loan = result.rows[0];

    const userResult = await pool.query(
      `SELECT id, full_name, momo_number, momo_provider, momo_recipient_code,
              recipient_code, account_number, bank_name
       FROM users WHERE id=$1`,
      [loan.user_id]
    );
    const user = userResult.rows[0];

    let disbursement = { ok: false, reference: `MANUAL-${Date.now()}`, method: 'manual', label: 'No payment method' };
    try {
      disbursement = await attemptDisbursement(loan, user);
    } catch (e) {
      console.error('Disbursement error:', e.message);
    }

    const txn = await pool.query(
      `INSERT INTO transactions (user_id, loan_id, type, amount, provider, reference, status, notes)
       VALUES ($1,$2,'disbursement',$3,$4,$5,$6,$7) RETURNING *`,
      [
        loan.user_id, loan.id, loan.amount,
        disbursement.method === 'momo' ? 'Paystack MoMo' : disbursement.method === 'bank' ? 'Paystack Bank' : 'Manual',
        disbursement.reference,
        disbursement.ok ? 'success' : 'failed',
        disbursement.ok
          ? `Disbursed via ${disbursement.label} — Ref: ${disbursement.reference}`
          : `Manual disbursement required — ${disbursement.label}`,
      ]
    );

    const notifMsg = disbursement.ok
      ? `Your loan of GHS ${parseFloat(loan.amount).toFixed(2)} has been approved and sent to your ${disbursement.method === 'momo' ? 'Mobile Money wallet' : 'bank account'} (${disbursement.label}).`
      : `Your loan of GHS ${parseFloat(loan.amount).toFixed(2)} has been approved. Please ensure your Mobile Money wallet is set up to receive funds.`;

    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,'success')`,
      [loan.user_id, 'Loan Approved! 🎉', notifMsg]
    );

    res.json({
      loan: result.rows[0],
      transaction: txn.rows[0],
      transfer_status: disbursement.ok ? 'success' : 'manual_required',
      disbursement_method: disbursement.method,
      disbursement_label: disbursement.label,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* Retry disbursement for an already-active loan (admin use) */
router.post('/loans/:id/disburse', authMiddleware, adminOnly, async (req, res) => {
  try {
    const loanResult = await pool.query(
      "SELECT * FROM loans WHERE id=$1 AND status='active'",
      [req.params.id]
    );
    if (!loanResult.rows.length) return res.status(404).json({ error: 'Active loan not found' });
    const loan = loanResult.rows[0];

    const userResult = await pool.query(
      `SELECT id, full_name, momo_number, momo_provider, momo_recipient_code,
              recipient_code, account_number, bank_name
       FROM users WHERE id=$1`,
      [loan.user_id]
    );
    const user = userResult.rows[0];

    const disbursement = await attemptDisbursement(loan, user);

    await pool.query(
      `INSERT INTO transactions (user_id, loan_id, type, amount, provider, reference, status, notes)
       VALUES ($1,$2,'disbursement',$3,$4,$5,$6,$7)`,
      [
        loan.user_id, loan.id, loan.amount,
        disbursement.method === 'momo' ? 'Paystack MoMo' : 'Paystack Bank',
        disbursement.reference,
        disbursement.ok ? 'success' : 'failed',
        disbursement.ok ? `Retry disbursement via ${disbursement.label}` : `Retry failed — ${disbursement.label}`,
      ]
    );

    if (disbursement.ok) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,'success')`,
        [loan.user_id, 'Funds Sent', `GHS ${parseFloat(loan.amount).toFixed(2)} has been sent to your ${disbursement.label}.`]
      );
    }

    res.json({
      ok: disbursement.ok,
      method: disbursement.method,
      label: disbursement.label,
      reference: disbursement.reference,
    });
  } catch (err) {
    console.error(err);
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

router.post('/notify/broadcast', authMiddleware, adminOnly, async (req, res) => {
  const { title, message, type, university } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Title and message required' });
  try {
    let query = 'SELECT id FROM users WHERE role != $1';
    const params = ['admin'];
    if (university && university !== 'all') { query += ' AND university = $2'; params.push(university); }
    const users = await pool.query(query, params);
    if (!users.rows.length) return res.status(404).json({ error: 'No users found' });
    const values = users.rows.map((_, i) => `($${i * 4 + 1},$${i * 4 + 2},$${i * 4 + 3},$${i * 4 + 4})`).join(',');
    const flat = users.rows.flatMap(u => [u.id, title, message, type || 'info']);
    await pool.query(`INSERT INTO notifications (user_id, title, message, type) VALUES ${values}`, flat);
    res.json({ sent: users.rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
router.post('/notify/user/:id', authMiddleware, adminOnly, async (req, res) => {
  const { title, message, type } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Title and message required' });
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)`,
      [req.params.id, title, message, type || 'info']
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
router.get('/export/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, email, phone, student_id, university, department, faculty,
       year_of_study, ghana_card_number, momo_number, momo_provider, trust_score,
       loan_limit, kyc_step, is_verified, is_kyc_complete, created_at
       FROM users WHERE role != 'admin' ORDER BY created_at DESC`
    );
    const cols = ['id','full_name','email','phone','student_id','university','department','faculty','year_of_study','ghana_card_number','momo_number','momo_provider','trust_score','loan_limit','kyc_step','is_verified','is_kyc_complete','created_at'];
    const csv = [cols.join(','), ...result.rows.map(r => cols.map(c => JSON.stringify(r[c] ?? '')).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="flism-users.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
router.get('/export/loans', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.id, u.full_name, u.email, u.university, l.amount, l.interest_rate,
       l.purpose, l.status, l.repayment_date, l.amount_repaid, l.created_at
       FROM loans l JOIN users u ON l.user_id = u.id ORDER BY l.created_at DESC`
    );
    const cols = ['id','full_name','email','university','amount','interest_rate','purpose','status','repayment_date','amount_repaid','created_at'];
    const csv = [cols.join(','), ...result.rows.map(r => cols.map(c => JSON.stringify(r[c] ?? '')).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="flism-loans.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
router.post('/admins', authMiddleware, adminOnly, async (req, res) => {
  const bcrypt = require('bcryptjs');
  const { email, password, full_name } = req.body;
  if (!email || !password || !full_name) return res.status(400).json({ error: 'Email, password and name required' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, trust_score, loan_limit, is_verified, is_kyc_complete, kyc_step)
       VALUES ($1,$2,$3,'admin',500,10000,true,true,4)
       ON CONFLICT (email) DO UPDATE SET role='admin', full_name=$3 RETURNING id, email, full_name, role`,
      [email, hash, full_name]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

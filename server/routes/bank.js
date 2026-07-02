const express = require('express');
const { pool } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { getBanks, resolveAccount, createRecipient, createMoMoRecipient } = require('../services/paystack');

const router = express.Router();

/* Get list of Ghana banks from Paystack */
router.get('/banks', async (req, res) => {
  try {
    const banks = await getBanks();
    if (!banks.status || !banks.data) {
      return res.status(502).json({ error: 'Failed to fetch banks from Paystack' });
    }
    res.json(banks.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch banks' });
  }
});

/* Resolve bank account number to get account name */
router.post('/resolve', authMiddleware, async (req, res) => {
  const { account_number, bank_code } = req.body;
  if (!account_number || !bank_code) {
    return res.status(400).json({ error: 'Account number and bank code are required' });
  }
  try {
    const resolution = await resolveAccount(account_number, bank_code);
    if (!resolution.status || !resolution.data) {
      return res.status(400).json({ error: resolution.message || 'Could not resolve account. Check the number and bank.' });
    }
    res.json({
      account_name: resolution.data.account_name,
      account_number: resolution.data.account_number,
      bank_code: resolution.data.bank_code,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to resolve account' });
  }
});

/* Save user's bank account details */
router.post('/account', authMiddleware, async (req, res) => {
  const { bank_name, bank_code, account_number, account_name } = req.body;
  if (!bank_name || !bank_code || !account_number || !account_name) {
    return res.status(400).json({ error: 'All bank account fields are required' });
  }
  try {
    // Create Paystack recipient
    const recipient = await createRecipient({
      type: 'nuban',
      name: account_name,
      account_number,
      bank_code,
    });

    if (!recipient.status || !recipient.data) {
      return res.status(400).json({ error: recipient.message || 'Failed to register account with Paystack' });
    }

    const recipientCode = recipient.data.recipient_code;

    // Save to user profile
    const result = await pool.query(
      `UPDATE users 
       SET bank_name=$1, bank_code=$2, account_number=$3, account_name=$4, recipient_code=$5 
       WHERE id=$6 
       RETURNING bank_name, bank_code, account_number, account_name`,
      [bank_name, bank_code, account_number, account_name, recipientCode, req.userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Bank account saved successfully',
      account: result.rows[0],
      recipient_code: recipientCode,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* Get user's disbursement account details (MoMo + bank) */
router.get('/account', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT bank_name, bank_code, account_number, account_name, 
              momo_number, momo_provider, momo_recipient_code, recipient_code
       FROM users WHERE id=$1`,
      [req.userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    const u = result.rows[0];
    res.json({
      has_momo: !!(u.momo_number && u.momo_recipient_code),
      momo_number: u.momo_number,
      momo_provider: u.momo_provider,
      momo_registered: !!u.momo_recipient_code,
      has_bank: !!(u.bank_name && u.account_number),
      bank_name: u.bank_name,
      bank_code: u.bank_code,
      account_number: u.account_number,
      account_name: u.account_name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* Register user's MoMo wallet as a Paystack transfer recipient for disbursements */
router.post('/momo-recipient', authMiddleware, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT full_name, momo_number, momo_provider FROM users WHERE id=$1',
      [req.userId]
    );
    const user = userResult.rows[0];
    if (!user?.momo_number) {
      return res.status(400).json({ error: 'No Mobile Money number on file. Please complete KYC first.' });
    }

    const recipient = await createMoMoRecipient({
      name: user.full_name,
      phone: user.momo_number,
      provider: user.momo_provider || 'MTN MoMo',
    });

    if (!recipient.status || !recipient.data) {
      return res.status(400).json({ error: recipient.message || 'Failed to register MoMo wallet with Paystack' });
    }

    const recipientCode = recipient.data.recipient_code;
    await pool.query(
      'UPDATE users SET momo_recipient_code=$1 WHERE id=$2',
      [recipientCode, req.userId]
    );

    res.json({
      message: 'Mobile Money wallet registered for disbursements',
      momo_number: user.momo_number,
      momo_provider: user.momo_provider,
      recipient_code: recipientCode,
    });
  } catch (err) {
    console.error('MoMo recipient error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

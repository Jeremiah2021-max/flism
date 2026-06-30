const express = require('express');
const { pool } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { getBanks, resolveAccount, createRecipient } = require('../services/paystack');

const router = express.Router();

/* Get list of Nigerian banks for Paystack */
router.get('/banks', async (req, res) => {
  try {
    const banks = await getBanks();
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

/* Get user's bank account details */
router.get('/account', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT bank_name, bank_code, account_number, account_name FROM users WHERE id=$1',
      [req.userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    
    if (!user.bank_name || !user.account_number) {
      return res.json({ has_account: false });
    }

    res.json({
      has_account: true,
      bank_name: user.bank_name,
      bank_code: user.bank_code,
      account_number: user.account_number,
      account_name: user.account_name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

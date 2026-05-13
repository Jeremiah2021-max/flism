const express = require('express');
const { pool } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const userResult = await pool.query(
      `SELECT trust_score, loan_limit, is_verified, is_kyc_complete FROM users WHERE id = $1`,
      [req.userId]
    );
    const user = userResult.rows[0];

    const loansResult = await pool.query(
      `SELECT COUNT(*) as total, SUM(CASE WHEN status='repaid' THEN 1 ELSE 0 END) as repaid,
       SUM(CASE WHEN status='defaulted' THEN 1 ELSE 0 END) as defaulted
       FROM loans WHERE user_id = $1`,
      [req.userId]
    );
    const loanStats = loansResult.rows[0];

    const assetsResult = await pool.query(
      `SELECT COUNT(*) as total FROM assets WHERE user_id = $1 AND status = 'approved'`,
      [req.userId]
    );

    const score = user.trust_score;
    const tier = score >= 400 ? 'Platinum' : score >= 300 ? 'Gold' : score >= 200 ? 'Silver' : 'Bronze';
    const nextTierScore = score >= 400 ? 500 : score >= 300 ? 400 : score >= 200 ? 300 : 200;

    res.json({
      score,
      tier,
      next_tier_score: nextTierScore,
      loan_limit: user.loan_limit,
      is_verified: user.is_verified,
      is_kyc_complete: user.is_kyc_complete,
      stats: {
        total_loans: parseInt(loanStats.total),
        repaid_loans: parseInt(loanStats.repaid),
        defaulted_loans: parseInt(loanStats.defaulted),
        approved_assets: parseInt(assetsResult.rows[0].total),
      },
      factors: [
        { name: 'Identity Verified', points: user.is_kyc_complete ? 50 : 0, max: 50 },
        { name: 'Loan Repayment', points: Math.min(parseInt(loanStats.repaid) * 30, 150), max: 150 },
        { name: 'Approved Collateral', points: Math.min(parseInt(assetsResult.rows[0].total) * 20, 100), max: 100 },
        { name: 'Account Activity', points: 70, max: 100 },
        { name: 'No Defaults', points: parseInt(loanStats.defaulted) === 0 ? 100 : 0, max: 100 },
      ]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

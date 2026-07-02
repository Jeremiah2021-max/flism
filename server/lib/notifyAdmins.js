const { pool } = require('../db');

async function notifyAdmins(title, message, type = 'info') {
  try {
    const admins = await pool.query(`SELECT id FROM users WHERE role = 'admin'`);
    if (admins.rows.length === 0) return;

    // Build parameterised VALUES list: ($1,$2,$3,$4), ($5,$6,$7,$8), …
    const values = admins.rows
      .map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`)
      .join(', ');

    const params = admins.rows.flatMap((row) => [row.id, title, message, type]);

    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ${values}`,
      params
    );
  } catch (err) {
    console.error('notifyAdmins error:', err.message);
  }
}

module.exports = { notifyAdmins };

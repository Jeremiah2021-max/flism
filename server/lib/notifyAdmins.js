const { pool } = require('../db');

async function notifyAdmins(title, message, type = 'info') {
  try {
    const admins = await pool.query(`SELECT id FROM users WHERE role = 'admin'`);
    if (admins.rows.length === 0) return;
    const values = admins.rows.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(', ');
    const params = admins.rows.flatMap(() => [undefined, title, message, type]).map((v, i) => {
      if (i % 4 === 0) return admins.rows[Math.floor(i / 4)].id;
      return v;
    });
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ${values}`,
      params
    );
  } catch (err) {
    console.error('notifyAdmins error:', err.message);
  }
}

module.exports = { notifyAdmins };
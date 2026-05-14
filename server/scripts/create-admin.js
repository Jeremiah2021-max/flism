/**
 * Flism Admin Creation Script
 * Usage: node server/scripts/create-admin.js <email> <password> <full_name>
 * Example: node server/scripts/create-admin.js admin@flism.gh Admin1234! "Flism Admin"
 */

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createAdmin(email, password, fullName) {
  if (!email || !password || !fullName) {
    console.error('Usage: node create-admin.js <email> <password> <full_name>');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  try {
    const existing = await pool.query('SELECT id, role FROM users WHERE email = $1', [email]);

    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      if (user.role === 'admin') {
        console.log(`✓ User ${email} is already an admin (id: ${user.id})`);
        process.exit(0);
      }
      // Upgrade existing user to admin
      await pool.query(
        `UPDATE users SET role='admin', is_verified=true, is_kyc_complete=true WHERE id=$1`,
        [user.id]
      );
      console.log(`✓ Upgraded existing user ${email} to admin role (id: ${user.id})`);
      process.exit(0);
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, is_verified, is_kyc_complete, university, trust_score, loan_limit)
       VALUES ($1, $2, $3, 'admin', true, true, 'Flism HQ', 500, 0)
       RETURNING id, email, full_name, role`,
      [email, hash, fullName]
    );
    const admin = result.rows[0];
    console.log('✓ Admin user created successfully!');
    console.log(`  ID:    ${admin.id}`);
    console.log(`  Email: ${admin.email}`);
    console.log(`  Name:  ${admin.full_name}`);
    console.log(`  Role:  ${admin.role}`);
    console.log('');
    console.log('Login at the app with these credentials and you will see the Admin Panel in your profile.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

const [,, email, password, ...nameParts] = process.argv;
createAdmin(email, password, nameParts.join(' ') || 'Flism Admin');

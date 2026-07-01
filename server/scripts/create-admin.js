/**
 * Flism Admin Creation Script
 * Usage:   node server/scripts/create-admin.js <email> <password> <full_name>
 * Example: node server/scripts/create-admin.js admin@flism.gh Admin1234! "Flism Admin"
 *
 * If the email already exists:
 *   - role = admin  → reports already an admin, exits cleanly
 *   - role = student → upgrades to admin
 * If the email does not exist, creates a new admin user.
 */

// Fix: __dirname is server/scripts/, so .env is one directory up in server/
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('❌  DATABASE_URL is not set. Make sure server/.env exists and is configured.');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createAdmin(email, password, fullName) {
  // Validate CLI arguments before doing any DB work
  if (!email || !password || !fullName) {
    console.error('Usage: node scripts/create-admin.js <email> <password> <full_name>');
    console.error('Example: node scripts/create-admin.js admin@flism.gh Admin1234! "Flism Admin"');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('❌  Password must be at least 8 characters.');
    process.exit(1);
  }

  try {
    const existing = await pool.query('SELECT id, role FROM users WHERE email = $1', [email]);

    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      if (user.role === 'admin') {
        console.log(`✓ ${email} is already an admin (id: ${user.id}). Nothing to do.`);
        process.exit(0);
      }
      // Upgrade existing student to admin
      await pool.query(
        `UPDATE users SET role = 'admin', is_verified = true, is_kyc_complete = true WHERE id = $1`,
        [user.id]
      );
      console.log(`✓ Upgraded existing user ${email} to admin role (id: ${user.id}).`);
      process.exit(0);
    }

    // Create brand-new admin user
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users
         (email, password_hash, full_name, role, is_verified, is_kyc_complete,
          university, trust_score, loan_limit, kyc_step)
       VALUES ($1, $2, $3, 'admin', true, true, 'Flism HQ', 500, 0, 4)
       RETURNING id, email, full_name, role`,
      [email, hash, fullName]
    );
    const admin = result.rows[0];
    console.log('✅ Admin user created successfully!');
    console.log(`   ID:    ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Name:  ${admin.full_name}`);
    console.log(`   Role:  ${admin.role}`);
    console.log('');
    console.log('You can now log in to the admin app with these credentials.');
  } catch (err) {
    console.error('❌  Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

const [, , email, password, ...nameParts] = process.argv;
createAdmin(email, password, nameParts.join(' ') || 'Flism Admin');

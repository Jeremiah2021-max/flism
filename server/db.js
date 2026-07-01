const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL &&
    !process.env.DATABASE_URL.includes('localhost') &&
    !process.env.DATABASE_URL.includes('127.0.0.1')
    ? { rejectUnauthorized: false }
    : false,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      student_id VARCHAR(100),
      university VARCHAR(255) DEFAULT 'University of Ghana',
      department VARCHAR(100),
      faculty VARCHAR(100),
      year_of_study VARCHAR(20),
      date_of_birth DATE,
      address TEXT,
      ghana_card_number VARCHAR(100),
      momo_number VARCHAR(50),
      momo_provider VARCHAR(50) DEFAULT 'MTN MoMo',
      role VARCHAR(20) DEFAULT 'student',
      kyc_step INTEGER DEFAULT 0,
      trust_score INTEGER DEFAULT 120,
      loan_limit DECIMAL(10,2) DEFAULT 300.00,
      is_verified BOOLEAN DEFAULT false,
      is_kyc_complete BOOLEAN DEFAULT false,
      is_student_verified BOOLEAN DEFAULT false,
      profile_image VARCHAR(500),
      created_at TIMESTAMP DEFAULT NOW()
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS faculty VARCHAR(100);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS year_of_study VARCHAR(20);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS ghana_card_number VARCHAR(100);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS momo_number VARCHAR(50);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS momo_provider VARCHAR(50) DEFAULT 'MTN MoMo';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'student';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_step INTEGER DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_student_verified BOOLEAN DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_code VARCHAR(20);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS account_number VARCHAR(20);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS account_name VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS recipient_code VARCHAR(100);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS momo_recipient_code VARCHAR(100);

    CREATE TABLE IF NOT EXISTS assets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(100) NOT NULL,
      description TEXT,
      serial_number VARCHAR(255),
      estimated_value DECIMAL(10,2) NOT NULL,
      loan_value DECIMAL(10,2),
      status VARCHAR(50) DEFAULT 'pending',
      images JSONB DEFAULT '[]',
      condition VARCHAR(50) DEFAULT 'good',
      brand VARCHAR(100),
      model VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS loans (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      asset_id INTEGER REFERENCES assets(id),
      amount DECIMAL(10,2) NOT NULL,
      interest_rate DECIMAL(5,2) DEFAULT 5.00,
      penalty_rate DECIMAL(5,2) DEFAULT 0.50,
      purpose TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      repayment_date DATE,
      duration_days INTEGER DEFAULT 30,
      amount_repaid DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    ALTER TABLE loans ADD COLUMN IF NOT EXISTS penalty_rate DECIMAL(5,2) DEFAULT 0.50;

    CREATE TABLE IF NOT EXISTS repayments (
      id SERIAL PRIMARY KEY,
      loan_id INTEGER REFERENCES loans(id) ON DELETE CASCADE,
      amount DECIMAL(10,2) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      due_date DATE,
      paid_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'info',
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS guarantors (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      email VARCHAR(255),
      relationship VARCHAR(100) DEFAULT 'Parent/Guardian',
      is_verified BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      loan_id INTEGER REFERENCES loans(id),
      type VARCHAR(50) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      provider VARCHAR(50),
      momo_number VARCHAR(50),
      reference VARCHAR(100),
      status VARCHAR(50) DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Seed default admin account if none exists
  try {
    const existing = await pool.query(`SELECT id FROM users WHERE email = 'admin@flism.com'`);
    if (existing.rows.length === 0) {
      const hash = await bcrypt.hash('Admin@Flism2024', 10);
      await pool.query(
        `INSERT INTO users (email, password_hash, full_name, role, trust_score, loan_limit, is_verified, is_kyc_complete, kyc_step)
         VALUES ($1, $2, 'Flism Admin', 'admin', 500, 10000, true, true, 4)`,
        ['admin@flism.com', hash]
      );
      console.log('Default admin seeded: admin@flism.com / Admin@Flism2024');
    }
  } catch (err) {
    console.error('Admin seed warning:', err.message);
  }

  console.log('Database schema initialized');
}

module.exports = { pool, initDb };

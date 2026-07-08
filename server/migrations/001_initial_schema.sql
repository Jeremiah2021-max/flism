-- Users table
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
  bank_name VARCHAR(100),
  bank_code VARCHAR(20),
  account_number VARCHAR(20),
  account_name VARCHAR(255),
  recipient_code VARCHAR(100),
  momo_recipient_code VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Assets table
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

-- Loans table
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

-- Repayments table
CREATE TABLE IF NOT EXISTS repayments (
  id SERIAL PRIMARY KEY,
  loan_id INTEGER REFERENCES loans(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  due_date DATE,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Guarantors table
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

-- Transactions table
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_asset_id ON loans(asset_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_loan_id ON transactions(loan_id);

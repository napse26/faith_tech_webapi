const { Client } = require('pg');

async function setupDatabase() {
  const client = new Client({
    connectionString: 'postgresql://postgres.dpezrpzxuqidqxgivklx:FaithTech%402026@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log("Connected to Supabase PostgreSQL.");

  // 1. Ensure user_id auto-increment sequence on users table
  console.log("Configuring users.user_id sequence...");
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'users_user_id_seq') THEN
        CREATE SEQUENCE users_user_id_seq;
      END IF;
      PERFORM setval('users_user_id_seq', COALESCE((SELECT MAX(user_id) FROM users), 0) + 1, false);
      ALTER TABLE users ALTER COLUMN user_id SET DEFAULT nextval('users_user_id_seq');
    END $$;
  `);

  // 2. Add status column to users if not present
  console.log("Checking status column on users...");
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'status'
      ) THEN
        ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'ACTIVE';
      END IF;
    END $$;
  `);

  // 3. Create otp_verification table
  console.log("Creating otp_verification table if not exists...");
  await client.query(`
    CREATE TABLE IF NOT EXISTS otp_verification (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      challenge_id UUID UNIQUE DEFAULT gen_random_uuid(),
      phone_number VARCHAR(20) NOT NULL,
      purpose VARCHAR(30) NOT NULL,
      channel VARCHAR(20) NOT NULL DEFAULT 'SMS',
      otp_hash VARCHAR(128) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      attempts INTEGER NOT NULL DEFAULT 0,
      resend_count INTEGER NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ NOT NULL,
      verified_at TIMESTAMPTZ,
      consumed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_otp_phone_created ON otp_verification (phone_number, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_otp_challenge ON otp_verification (challenge_id);
    CREATE INDEX IF NOT EXISTS idx_otp_status ON otp_verification (status);
  `);

  // 4. Create user_sessions table
  console.log("Creating user_sessions table if not exists...");
  await client.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      device_id VARCHAR(255),
      device_type VARCHAR(20),
      device_name VARCHAR(255),
      refresh_token_hash VARCHAR(128) NOT NULL,
      ip_address VARCHAR(45),
      user_agent TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions (user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON user_sessions (refresh_token_hash);
    CREATE INDEX IF NOT EXISTS idx_sessions_device ON user_sessions (user_id, device_id);
  `);

  // 5. Create auth_audit_logs table
  console.log("Creating auth_audit_logs table if not exists...");
  await client.query(`
    CREATE TABLE IF NOT EXISTS auth_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
      phone_number VARCHAR(20),
      event_type VARCHAR(50) NOT NULL,
      ip_address VARCHAR(45),
      device_id VARCHAR(255),
      status VARCHAR(20) NOT NULL,
      failure_reason VARCHAR(100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_audit_user_id ON auth_audit_logs (user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_phone ON auth_audit_logs (phone_number);
    CREATE INDEX IF NOT EXISTS idx_audit_event_time ON auth_audit_logs (event_type, created_at DESC);
  `);

  console.log("Database tables verified and updated successfully!");
  await client.end();
}

setupDatabase().catch(err => {
  console.error("Database setup failed:", err);
  process.exit(1);
});

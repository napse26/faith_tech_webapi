const { Client } = require('pg');

async function run() {
  const c = new Client({
    connectionString: 'postgresql://postgres.dpezrpzxuqidqxgivklx:FaithTech%402026@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });
  await c.connect();
  const tables = ['otp_verification', 'user_sessions', 'auth_audit_logs', 'users', 'customer_details', 'roles', 'user_roles'];
  for (const t of tables) {
    const r = await c.query(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
      [t]
    );
    console.log(`Table ${t}: ${r.rows.length} columns`);
  }
  await c.end();
}

run().catch(console.error);

const { Client } = require('pg');

async function run() {
  const c = new Client({
    connectionString: 'postgresql://postgres.dpezrpzxuqidqxgivklx:FaithTech%402026@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });
  await c.connect();

  const tables = ['users', 'roles', 'user_roles', 'customer_details', 'otp_verification', 'user_sessions', 'auth_audit_logs'];

  for (const table of tables) {
    console.log(`\n=================== ${table} ===================`);
    const cols = await c.query(
      `SELECT column_name, data_type, udt_name, is_nullable, column_default 
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = $1 
       ORDER BY ordinal_position`,
      [table]
    );
    cols.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.udt_name}) | nullable: ${col.is_nullable} | default: ${col.column_default}`);
    });
  }

  await c.end();
}

run().catch(console.error);

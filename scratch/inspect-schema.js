const { Client } = require('pg');

async function inspectTables() {
  const client = new Client({
    connectionString: 'postgresql://postgres.dpezrpzxuqidqxgivklx:FaithTech%402026@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const tablesToInspect = [
    'users',
    'roles',
    'user_roles',
    'customer_details',
    'user_otps',
    'user_devices',
    'user_refresh_tokens',
    'user_login_history',
    'astrologers'
  ];

  for (const table of tablesToInspect) {
    console.log(`\n=================== TABLE: ${table} ===================`);
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [table]);

    console.table(cols.rows);

    const constraints = await client.query(`
      SELECT conname, contype, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' AND conrelid = $1::regclass;
    `, [table]);
    console.log("Constraints:", constraints.rows);
  }

  // Also check existing roles
  console.log("\n=================== EXISTING ROLES ===================");
  const roles = await client.query('SELECT * FROM roles;');
  console.table(roles.rows);

  await client.end();
}

inspectTables().catch(console.error);

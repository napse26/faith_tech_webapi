const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres.dpezrpzxuqidqxgivklx:FaithTech%402026@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  const tables = ['customer_details', 'user_roles', 'user_devices', 'user_refresh_tokens', 'user_login_history'];
  for (const t of tables) {
    console.log(`=== ${t} ===`);
    const cols = await client.query(
      `SELECT column_name, data_type, is_nullable, column_default 
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = $1 
       ORDER BY ordinal_position`,
      [t]
    );
    console.table(cols.rows);

    const constraints = await client.query(
      `SELECT conname, contype, pg_get_constraintdef(c.oid) as def
       FROM pg_constraint c
       JOIN pg_namespace n ON n.oid = c.connamespace
       WHERE n.nspname = 'public' AND conrelid = $1::regclass`,
      [t]
    );
    console.log("Constraints:", constraints.rows);
  }
  await client.end();
}

run().catch(console.error);

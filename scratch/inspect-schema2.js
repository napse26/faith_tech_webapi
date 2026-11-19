const { Client } = require('pg');

async function run() {
  const c = new Client({
    connectionString: 'postgresql://postgres.dpezrpzxuqidqxgivklx:FaithTech%402026@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });
  await c.connect();
  const tables = ['user_otps', 'user_devices'];
  for (const t of tables) {
    const r = await c.query(
      `SELECT column_name, data_type, is_nullable, column_default 
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = $1 
       ORDER BY ordinal_position`,
      [t]
    );
    console.log(`\n=== ${t} ===`);
    console.table(r.rows);
  }
  await c.end();
}

run().catch(console.error);

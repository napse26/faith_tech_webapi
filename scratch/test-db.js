const { Client } = require('pg');

async function testConnection() {
  const configs = [
    {
      name: "Supabase Direct",
      connectionString: "postgresql://postgres:FaithTech%402026@db.dpezrpzxuqidqxgivklx.supabase.co:5432/postgres?sslmode=require"
    },
    {
      name: "Supabase Pooler 6543 (ap-south-1)",
      connectionString: "postgresql://postgres.dpezrpzxuqidqxgivklx:FaithTech%402026@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
    },
    {
      name: "Supabase Pooler 5432 (ap-south-1)",
      connectionString: "postgresql://postgres.dpezrpzxuqidqxgivklx:FaithTech%402026@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
    }
  ];

  for (const config of configs) {
    console.log(`\nTesting ${config.name}...`);
    const client = new Client({
      connectionString: config.connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000
    });

    try {
      await client.connect();
      console.log(`✅ Connected successfully via ${config.name}!`);
      
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `);
      console.log("Existing tables in public schema:", tables.rows.map(r => r.table_name));
      await client.end();
      return;
    } catch (err) {
      console.log(`❌ Failed with ${config.name}:`, err.message);
      try { await client.end(); } catch (e) {}
    }
  }
}

testConnection();

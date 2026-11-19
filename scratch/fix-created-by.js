const { Client } = require('pg');

async function fixCreatedBy() {
  const c = new Client({
    connectionString: 'postgresql://postgres.dpezrpzxuqidqxgivklx:FaithTech%402026@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });
  await c.connect();

  const tables = [
    'astrologer_service_request_master',
    'astrologer_services',
    'document_master',
    'service_checklist_master',
    'service_master',
    'services_checklist_mapping_master',
    'tbl_dms_category',
    'tbl_dms_items'
  ];

  for (const table of tables) {
    try {
      console.log(`Altering ${table}.created_by to BIGINT...`);
      await c.query(`ALTER TABLE "${table}" ALTER COLUMN "created_by" TYPE BIGINT;`);
      console.log(`✅ Altered ${table}.created_by to BIGINT`);
    } catch (err) {
      console.error(`Error on ${table}:`, err.message);
    }
  }

  await c.end();
}

fixCreatedBy().catch(console.error);

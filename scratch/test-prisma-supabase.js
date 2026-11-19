const { PrismaClient } = require('@prisma/client');

async function testPrisma() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres.dpezrpzxuqidqxgivklx:FaithTech%402026@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=no-verify"
      }
    }
  });

  try {
    const res = await prisma.$queryRaw`SELECT current_database(), current_user, version()`;
    console.log("✅ Prisma successfully connected to Supabase:", res);
    await prisma.$disconnect();
  } catch (err) {
    console.error("❌ Prisma connection failed:", err.message);
  }
}

testPrisma();

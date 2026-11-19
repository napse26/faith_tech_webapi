const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.dpezrpzxuqidqxgivklx:FaithTech%402026@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=no-verify"
    }
  }
});

async function testUserCreation() {
  const testPhone = "+919999990001";
  // Clean up if exists
  await prisma.users.deleteMany({ where: { mobile_no: testPhone } });

  const user = await prisma.users.create({
    data: {
      mobile_no: testPhone,
      country_code: "+91",
      is_mobile_verified: true,
      status: "ACTIVE",
      is_active: true
    }
  });

  console.log("✅ Successfully created user:", {
    user_id: user.user_id.toString(),
    mobile_no: user.mobile_no,
    status: user.status
  });

  // Clean up test user
  await prisma.users.delete({ where: { user_id: user.user_id } });
  console.log("✅ Successfully cleaned up test user.");

  await prisma.$disconnect();
}

testUserCreation().catch(err => {
  console.error("❌ Failed:", err);
  process.exit(1);
});

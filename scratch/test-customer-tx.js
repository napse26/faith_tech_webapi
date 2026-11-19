const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.dpezrpzxuqidqxgivklx:FaithTech%402026@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=no-verify"
    }
  }
});

async function testCustomerRoleCreation() {
  const testPhone = "+919999990002";
  await prisma.users.deleteMany({ where: { mobile_no: testPhone } });

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.users.create({
      data: {
        mobile_no: testPhone,
        country_code: "+91",
        is_mobile_verified: true,
        status: "ACTIVE",
        is_active: true
      }
    });

    // Assign CUSTOMER role (role_id 1)
    await tx.user_roles.create({
      data: {
        user_id: user.user_id,
        role_id: 1
      }
    });

    // Create customer details
    await tx.customer_details.create({
      data: {
        user_id: user.user_id
      }
    });

    return user;
  });

  console.log("✅ Created user + role + customer_details:", result.user_id.toString());

  // Clean up
  await prisma.users.delete({ where: { user_id: result.user_id } });
  console.log("✅ Cleaned up successfully.");
  await prisma.$disconnect();
}

testCustomerRoleCreation().catch(err => {
  console.error("❌ Failed:", err);
  process.exit(1);
});

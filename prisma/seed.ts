import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting safe development database seeding...');

  // Upsert test user 1
  const mobile1 = '+919999900001';
  let user1 = await prisma.users.findUnique({ where: { mobile_no: mobile1 } });
  if (!user1) {
    user1 = await prisma.users.create({
      data: {
        mobile_no: mobile1,
        country_code: '+91',
        email: 'test.user1@example.com',
        full_name: 'Test Customer One',
        is_mobile_verified: true,
        is_email_verified: true,
        status: 'ACTIVE',
        is_active: true
      }
    });

    await prisma.user_roles.create({
      data: {
        user_id: user1.user_id,
        role_id: 1 // CUSTOMER
      }
    });

    await prisma.customer_details.create({
      data: {
        user_id: user1.user_id,
        first_name: 'Test',
        last_name: 'Customer One',
        gender: 'FEMALE',
        preferred_language: 'en',
        place_of_birth: 'New Delhi'
      }
    });
  }

  console.log(`✅ Seeded test user 1: ${user1.mobile_no} (ID: ${user1.user_id})`);
  console.log('🌱 Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

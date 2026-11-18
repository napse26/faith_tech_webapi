import { PrismaClient, UserStatus, Gender, TimeAccuracy } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting safe development database seeding...');

  // Upsert test user 1
  const user1 = await prisma.user.upsert({
    where: { mobileNumber: '+919999900001' },
    update: {},
    create: {
      mobileNumber: '+919999900001',
      countryCode: '+91',
      email: 'test.user1@example.com',
      isMobileVerified: true,
      isEmailVerified: true,
      status: UserStatus.ACTIVE,
      profile: {
        create: {
          fullName: 'Test User One',
          displayName: 'AstroTester',
          gender: Gender.FEMALE,
          preferredLanguage: 'en',
          country: 'India',
          state: 'Delhi',
          city: 'New Delhi',
          timezone: 'Asia/Kolkata',
          isProfileComplete: true
        }
      },
      birthDetails: {
        create: {
          birthDate: '1992-04-12',
          birthTime: '10:45:00',
          timeAccuracy: TimeAccuracy.EXACT,
          birthPlaceName: 'New Delhi, India',
          latitude: 28.6139,
          longitude: 77.209,
          timezone: 'Asia/Kolkata'
        }
      }
    }
  });

  console.log(`✅ Seeded test user 1: ${user1.mobileNumber} (ID: ${user1.id})`);

  // Upsert test user 2 (approximate birth time)
  const user2 = await prisma.user.upsert({
    where: { mobileNumber: '+919999900002' },
    update: {},
    create: {
      mobileNumber: '+919999900002',
      countryCode: '+91',
      email: 'test.user2@example.com',
      isMobileVerified: true,
      status: UserStatus.ACTIVE,
      profile: {
        create: {
          fullName: 'Test User Two',
          displayName: 'Stargazer',
          gender: Gender.MALE,
          preferredLanguage: 'hi',
          country: 'India',
          state: 'Maharashtra',
          city: 'Mumbai',
          timezone: 'Asia/Kolkata',
          isProfileComplete: true
        }
      },
      birthDetails: {
        create: {
          birthDate: '1998-11-20',
          birthTime: null,
          timeAccuracy: TimeAccuracy.UNKNOWN,
          birthPlaceName: 'Mumbai, India',
          latitude: 19.076,
          longitude: 72.8777,
          timezone: 'Asia/Kolkata'
        }
      }
    }
  });

  console.log(`✅ Seeded test user 2: ${user2.mobileNumber} (ID: ${user2.id})`);
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

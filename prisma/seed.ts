import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@flow.app' },
    update: {},
    create: {
      id: 'demo-user',
      email: 'demo@flow.app',
      name: 'Demo User',
      preferences: JSON.stringify({
        soundEnabled: false,
        theme: 'system',
      }),
    },
  });
  console.log(`✓ Created user: ${user.email}`);

  // Create demo accounts
  const checkingAccount = await prisma.account.upsert({
    where: { id: 'demo-checking' },
    update: { currentBalance: 5420.50, availableBalance: 5420.50 },
    create: {
      id: 'demo-checking',
      userId: user.id,
      name: 'Primary Checking',
      nickname: 'Main Account',
      mask: '1234',
      type: 'depository',
      subtype: 'checking',
      isMaster: true,
      color: '#3B82F6',
      currentBalance: 5420.50,
      availableBalance: 5420.50,
    },
  });
  console.log(`✓ Created master account: ${checkingAccount.name}`);

  const savingsAccount = await prisma.account.upsert({
    where: { id: 'demo-savings' },
    update: { currentBalance: 12350.00, availableBalance: 12350.00 },
    create: {
      id: 'demo-savings',
      userId: user.id,
      name: 'High-Yield Savings',
      nickname: 'Savings',
      mask: '5678',
      type: 'depository',
      subtype: 'savings',
      isMaster: false,
      color: '#22C55E',
      currentBalance: 12350.00,
      availableBalance: 12350.00,
    },
  });
  console.log(`✓ Created savings account: ${savingsAccount.name}`);

  // Create demo buckets
  const buckets = [
    {
      id: 'demo-savings-bucket',
      name: 'Savings',
      emoji: '💰',
      allocationType: 'percent_of_income',
      allocationValue: 0.20,
      priority: 1,
      color: '#22C55E',
      description: 'Pay yourself first! 20% goes straight to savings.',
    },
    {
      id: 'demo-rent',
      name: 'Rent',
      emoji: '🏠',
      allocationType: 'fixed_dollar',
      allocationValue: 1500,
      priority: 1,
      color: '#EF4444',
      description: 'Monthly rent payment',
    },
    {
      id: 'demo-utilities',
      name: 'Utilities',
      emoji: '💡',
      allocationType: 'fixed_dollar',
      allocationValue: 200,
      priority: 1,
      color: '#F59E0B',
      description: 'Electric, gas, internet',
    },
    {
      id: 'demo-groceries',
      name: 'Groceries',
      emoji: '🛒',
      allocationType: 'percent_of_discretionary',
      allocationValue: 0.60,
      priority: 3,
      color: '#3B82F6',
      description: '60% of what\'s left after bills',
    },
    {
      id: 'demo-fun',
      name: 'Fun Money',
      emoji: '🎮',
      allocationType: 'percent_of_discretionary',
      allocationValue: 0.40,
      priority: 3,
      color: '#8B5CF6',
      description: 'Guilt-free spending! Enjoy it.',
    },
  ];

  for (const bucket of buckets) {
    await prisma.bucket.upsert({
      where: { id: bucket.id },
      update: {},
      create: {
        ...bucket,
        userId: user.id,
        masterAccountId: checkingAccount.id,
        targetAccountId: bucket.name === 'Savings' ? savingsAccount.id : null,
      },
    });
    console.log(`✓ Created bucket: ${bucket.emoji} ${bucket.name}`);
  }

  // Create a demo streak
  await prisma.streak.upsert({
    where: {
      userId_streakType: {
        userId: user.id,
        streakType: 'allocation_followed',
      },
    },
    update: {},
    create: {
      userId: user.id,
      streakType: 'allocation_followed',
      currentCount: 3,
      bestCount: 3,
      lastActivityDate: new Date(),
    },
  });
  console.log('✓ Created demo streak');

  console.log('\n🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

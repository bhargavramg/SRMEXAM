const { PrismaClient } = require('./generated/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting minimal system seed...\n');

  // ============================================================================
  // 1. GRADE BOUNDARIES (System configuration — not dummy data)
  // ============================================================================
  console.log('📊 Creating Grade Boundaries...');
  const gradeBoundaries = [
    { grade: 'S',  minPercentage: 90, maxPercentage: 100, description: 'Outstanding', isPass: true },
    { grade: 'A',  minPercentage: 80, maxPercentage: 89.99, description: 'Excellent', isPass: true },
    { grade: 'B',  minPercentage: 70, maxPercentage: 79.99, description: 'Very Good', isPass: true },
    { grade: 'C',  minPercentage: 60, maxPercentage: 69.99, description: 'Good', isPass: true },
    { grade: 'D',  minPercentage: 50, maxPercentage: 59.99, description: 'Average', isPass: true },
    { grade: 'F',  minPercentage: 0,  maxPercentage: 49.99, description: 'Fail', isPass: false },
  ];

  for (const gb of gradeBoundaries) {
    await prisma.gradeBoundary.upsert({
      where: { grade: gb.grade },
      update: gb,
      create: gb,
    });
  }
  console.log('   ✅ Grade Boundaries created\n');

  // ============================================================================
  // 2. SUPER ADMIN ACCOUNT (Required to access the Setup Wizard)
  // ============================================================================
  console.log('👤 Creating Super Admin account...');
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@examportal.com' },
  });

  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    await prisma.user.create({
      data: {
        name: 'System Administrator',
        email: 'admin@examportal.com',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      },
    });
    console.log('   ✅ Super Admin created (admin@examportal.com / admin123)\n');
  } else {
    console.log('   ℹ️  Super Admin already exists, skipping\n');
  }

  // ============================================================================
  // 3. SYSTEM CONFIG — Mark setup as not completed
  // ============================================================================
  console.log('⚙️  Setting system configuration...');
  await prisma.systemConfig.upsert({
    where: { key: 'setup_completed' },
    update: {},
    create: { key: 'setup_completed', value: 'false' },
  });
  console.log('   ✅ setup_completed = false\n');

  console.log('✅ Minimal seed completed successfully!');
  console.log('   ⚠️  No dummy data was created.');
  console.log('   ⚠️  Log in as Super Admin to run the Setup Wizard.\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

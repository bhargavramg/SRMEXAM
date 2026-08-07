const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();

async function run() {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "StudentEnrollment" CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "SubjectOffering" CASCADE;`);
  console.log('Truncated dependent tables!');
}

run().catch(console.error).finally(() => prisma.$disconnect());

require('dotenv').config();
const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.user.count();
  console.log(`Total users in DB: ${users}`);
}
run().finally(() => prisma.$disconnect());

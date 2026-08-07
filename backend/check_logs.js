require('dotenv').config();
const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();
async function run() {
  const logs = await prisma.activityLog.findMany({where: {action: 'SETUP_STUDENTS_IMPORTED'}});
  console.log(logs);
}
run().finally(() => prisma.$disconnect());

const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();
prisma.$connect()
  .then(() => console.log('Connected!'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());

const { PrismaClient } = require('../../prisma/generated/client');

// Prevent multiple instances of Prisma Client in development due to hot reloading
const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

module.exports = prisma;

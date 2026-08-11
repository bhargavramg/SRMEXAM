const { PrismaClient } = require('./prisma/generated/client');
require('dotenv').config();
const prisma = new PrismaClient();

async function main() {
  const exams = await prisma.exam.findMany({
    where: {
      title: { contains: 'sample test' }
    },
    include: {
      _count: { select: { results: true, sessions: true } },
      sessions: true,
      results: true,
    }
  });

  console.log(JSON.stringify(exams, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

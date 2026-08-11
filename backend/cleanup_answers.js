const { PrismaClient } = require('./prisma/generated/client');
require('dotenv').config();
const prisma = new PrismaClient();

async function main() {
  const sessionId = 'f8d46e46-a3a8-42c8-aa37-7144b8fc64df';
  
  const answers = await prisma.studentAnswer.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' } // keep latest
  });

  const seen = new Set();
  let deleted = 0;

  for (const a of answers) {
    if (seen.has(a.questionId)) {
      await prisma.studentAnswer.delete({ where: { id: a.id } });
      deleted++;
    } else {
      seen.add(a.questionId);
    }
  }

  console.log(`Deleted ${deleted} duplicate answers.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

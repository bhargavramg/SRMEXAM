require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const questions = await prisma.question.findMany({ include: { bank: true } });
  console.log('Total Questions:', questions.length);
  if (questions.length > 0) {
    console.log('Sample question:', questions[0].text);
    console.log('Bank Subject ID:', questions[0].bank.subjectId);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

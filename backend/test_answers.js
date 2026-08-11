const { PrismaClient } = require('./prisma/generated/client');
require('dotenv').config();
const prisma = new PrismaClient();

async function main() {
  const sessionId = 'f8d46e46-a3a8-42c8-aa37-7144b8fc64df';
  
  const answers = await prisma.studentAnswer.findMany({
    where: { sessionId },
    include: { question: true, selectedOptions: true }
  });

  console.log(`Found ${answers.length} answers.`);
  answers.forEach((a, i) => {
    console.log(`[${i+1}] Q: ${a.question.text} | Type: ${a.question.type} | Marks: ${a.marksObtained}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

const { PrismaClient } = require('./prisma/generated/client');
require('dotenv').config();
const prisma = new PrismaClient();

async function main() {
  const sessionId = 'f8d46e46-a3a8-42c8-aa37-7144b8fc64df';
  
  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: {
      exam: {
        include: {
          facultyAssignment: {
            include: {
              subject: true,
              faculty: { select: { name: true } }
            }
          }
        }
      },
      student: {
        select: {
          id: true, name: true, register_no: true, email: true,
          department: { select: { name: true, code: true } }
        }
      },
      studentAnswers: {
        include: {
          question: { include: { options: true } },
          selectedOptions: true,
          evaluatedBy: { select: { name: true } }
        },
        orderBy: { question: { createdAt: 'asc' } }
      }
    }
  });

  console.log('Session retrieved:', session ? 'Yes' : 'No');
}

main().catch(console.error).finally(() => prisma.$disconnect());

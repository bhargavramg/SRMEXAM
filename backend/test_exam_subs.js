const { PrismaClient } = require('./prisma/generated/client');
require('dotenv').config();
const prisma = new PrismaClient();

async function main() {
  const examId = '8d644118-774c-4cc1-90a2-c054e5f49984'; // sample test
  const sessions = await prisma.examSession.findMany({
    where: { examId, status: { in: ['SUBMITTED', 'AUTO_SUBMITTED'] } },
    include: {
      student: {
        select: {
          id: true, name: true, register_no: true, email: true,
          department: { select: { name: true, code: true } },
          enrollments: {
            where: { status: 'ACTIVE' },
            include: {  semester: true }
          }
        }
      },
      _count: { select: { warnings: true, studentAnswers: true } }
    },
    orderBy: { submittedAt: 'desc' }
  });

  console.log('Sessions count:', sessions.length);
  // Get results for each session
  const results = await prisma.result.findMany({
    where: { examId },
  });

  const resultMap = {};
  results.forEach(r => { resultMap[r.studentId] = r; });

  const submissions = await Promise.all(sessions.map(async (session) => {
    const pendingCount = await prisma.studentAnswer.count({
      where: { sessionId: session.id, evaluationStatus: 'PENDING' }
    });

    const result = resultMap[session.studentId];

    return {
      sessionId: session.id,
      studentId: session.studentId,
      resultStatus: result?.status || 'SUBMITTED',
    };
  }));

  console.log(JSON.stringify(submissions, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

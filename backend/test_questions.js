const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();

async function checkQuestions() {
  // Let's emulate what getQuestions does for faculty f2c52cf6-1663-490e-9d79-5b2c29866dc7
  const facultyId = 'f2c52cf6-1663-490e-9d79-5b2c29866dc7';
  const assignments = await prisma.facultyAssignment.findMany({
      where: { facultyId, status: 'ACTIVE' },
      select: { subjectOffering: { select: { subjectId: true } } }
    });
  const assignedSubjectIds = assignments
      .map(a => a.subjectOffering?.subjectId)
      .filter(Boolean);
      
  console.log("Assigned Subject IDs:", assignedSubjectIds);
  
  const questions = await prisma.question.findMany({
      where: { bank: { subjectId: { in: assignedSubjectIds } } },
      include: {
        bank: { include: { subject: true } },
        category: true,
        options: true,
        tags: { include: { tag: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  console.log("Questions found:", questions.length);
}

checkQuestions().catch(console.error).finally(() => prisma.$disconnect());

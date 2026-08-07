const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const faculty = await prisma.user.findFirst({ where: { role: 'FACULTY' } });
  if (!faculty) return console.log('No faculty found');
  
  const assignments = await prisma.facultyAssignment.findMany({
    where: { facultyId: faculty.id, status: 'ACTIVE' },
    select: { subject: { select: { id: true } } }
  });
  
  const assignedSubjectIds = assignments.map(a => a.subject?.id).filter(Boolean);
  console.log('Subject IDs:', assignedSubjectIds);
  
  const questions = await prisma.question.findMany({
    where: { bank: { subjectId: { in: assignedSubjectIds } } }
  });
  console.log('Questions found:', questions.length);
}

main().finally(() => prisma.$disconnect());

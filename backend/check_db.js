const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'suseelag@srmist.edu.in' } });
  const assignments = await prisma.facultyAssignment.findMany({
      where: { facultyId: user.id, status: 'ACTIVE' },
      include: {
        subject: { include: { department: true } },
        assessmentType: true,
        academicYear: true,
        _count: { select: { exams: true, students: true } }
      }
    });
  console.log('Assignments:', JSON.stringify(assignments, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());

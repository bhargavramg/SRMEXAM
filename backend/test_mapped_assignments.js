const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();

async function testMyAssignments() {
  const facultyId = 'f2c52cf6-1663-490e-9d79-5b2c29866dc7';
  const assignments = await prisma.facultyAssignment.findMany({
      where: { facultyId, status: 'ACTIVE' },
      include: {
        subjectOffering: { include: { subject: true, section: { include: { semester: { include: { course: { include: { department: true } }, academicYear: true } } } }, academicYear: true } },
        _count: { select: { exams: true } }
      }
    });

    const mappedAssignments = assignments.map(a => ({
      ...a,
      subject: a.subjectOffering?.subject,
      section: a.subjectOffering?.section
    }));
    
    console.log(JSON.stringify(mappedAssignments, null, 2));
}

testMyAssignments().catch(console.error).finally(() => prisma.$disconnect());

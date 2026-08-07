const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();

async function testGetStudents() {
  const facultyId = 'f2c52cf6-1663-490e-9d79-5b2c29866dc7';
  try {
    const assignments = await prisma.facultyAssignment.findMany({
      where: { facultyId, status: 'ACTIVE' },
      select: { subjectOfferingId: true, subjectOffering: { select: { subjectId: true } } }
    });

    if (assignments.length === 0) {
      console.log('No assignments');
      return;
    }

    const offeringIds = [...new Set(assignments.map(a => a.subjectOfferingId).filter(Boolean))];

    const whereClause = {
      enrollments: {
        some: {
          subjectOfferingId: { in: offeringIds }
        }
      },
      role: 'STUDENT'
    };

    const students = await prisma.user.findMany({
      where: whereClause,
      include: {
        enrollments: {
          where: { subjectOfferingId: { in: offeringIds } },
          include: {
            subjectOffering: {
              include: {
                section: true,
                subject: true,
                semester: true,
                academicYear: true,
                subject: { include: { department: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    console.log("Students fetched:", students.length);
  } catch (error) {
    console.error("Error fetching students:", error);
  }
}

testGetStudents().catch(console.error).finally(() => prisma.$disconnect());

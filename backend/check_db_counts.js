const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();

async function check() {
  const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
  const totalEnrollments = await prisma.studentEnrollment.count();
  const totalExams = await prisma.examStudent.count();
  const totalFaculty = await prisma.facultyAssignment.count();
  
  console.log(`Total Students: ${totalStudents}`);
  console.log(`Total Enrollments: ${totalEnrollments}`);
  console.log(`Total ExamStudent: ${totalExams}`);
  console.log(`Total FacultyAssignments: ${totalFaculty}`);

  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    include: {
      enrollments: {
        include: {
          department: true,
          course: true,
          semester: true,
          section: true,
        }
      }
    }
  });

  if (students.length > 0) {
    // just print counts to avoid spam
    const active = students.filter(s => s.status === 'ACTIVE').length;
    console.log(`Active students: ${active}`);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());

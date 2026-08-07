require('dotenv').config();
const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();

async function check() {
  const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
  const totalEnrollments = await prisma.studentEnrollment.count();
  
  console.log(`Total Users with role = STUDENT: ${totalStudents}`);
  console.log(`Total StudentEnrollment records: ${totalEnrollments}`);
  
  const enrollmentsBySection = await prisma.studentEnrollment.groupBy({
    by: ['sectionId'],
    _count: { studentId: true }
  });
  console.log(`Enrollments by sectionId:`, enrollmentsBySection);

  // Also see if any student lacks enrollment
  const unrolled = await prisma.user.count({
    where: { 
      role: 'STUDENT',
      studentEnrollment: null 
    }
  });
  console.log(`Students with NO enrollment: ${unrolled}`);

  const faculties = await prisma.facultyAssignment.findMany({
    include: {
      faculty: true,
      subject: true,
      section: { include: { semester: { include: { course: true } } } }
    }
  });

  console.log('Faculty Assignments:');
  for (const f of faculties) {
    const studentCount = await prisma.studentEnrollment.count({
      where: { sectionId: f.sectionId }
    });
    console.log(`- Assignment ${f.id}: Faculty ${f.faculty?.name}, Subject ${f.subject?.code}, Section ${f.section?.name}, Students: ${studentCount}`);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());

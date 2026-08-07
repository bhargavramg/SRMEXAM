require('dotenv').config();
const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();

async function main() {
  const s1 = await prisma.section.findUnique({
    where: { id: '9e3e434e-1414-4b19-aedf-d4453579b088' },
    include: { semester: { include: { course: true } } }
  });
  
  const s2 = await prisma.section.findUnique({
    where: { id: '8fc5c96b-a54e-417b-bdb7-ed6afb406c9e' },
    include: { semester: { include: { course: true } } }
  });

  console.log('Section 1 (Faculty Assignment):');
  console.log(s1.name, s1.semester.semesterNumber, s1.semester.course.name);

  console.log('Section 2 (Student Enrollments):');
  console.log(s2.name, s2.semester.semesterNumber, s2.semester.course.name);
}

main().catch(console.error).finally(() => prisma.$disconnect());

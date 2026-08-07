require('dotenv').config();
const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.studentEnrollment.count();
  console.log('Total enrollments:', count);
  
  if (count > 0) {
    const enrollments = await prisma.studentEnrollment.findMany({
      include: { section: true, student: true }
    });
    console.log('Sample enrollment section names:');
    enrollments.forEach(e => console.log(e.section.name, e.student.name));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

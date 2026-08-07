const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();
async function check() {
  const assignments = await prisma.facultyAssignment.findMany();
  console.log('Assignments:');
  for (const a of assignments) {
    console.log(a.id, '-', a.facultyId, '-', a.status);
  }
}
check().then(() => prisma.$disconnect()).catch(console.error);

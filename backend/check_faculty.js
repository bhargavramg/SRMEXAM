const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();
async function check() {
  const users = await prisma.user.findMany({ where: { role: 'FACULTY' } });
  console.log('Faculty users:');
  for (const u of users) {
    const assignments = await prisma.facultyAssignment.count({ where: { facultyId: u.id } });
    console.log(u.email, '-', u.id, '- Assignments:', assignments);
  }
}
check().then(() => prisma.$disconnect()).catch(console.error);

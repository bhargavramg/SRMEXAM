const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const faculty = await prisma.user.findMany({
      where: { role: 'FACULTY' },
      include: {
        facultyAssignments: { include: { subjectOffering: true } },
        department: true
      },
      orderBy: { createdAt: 'desc' }
    });
    console.log(JSON.stringify(faculty, null, 2));
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();

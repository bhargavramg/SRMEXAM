const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();
async function main() {
  const faculty = await prisma.user.findFirst({where: {email: 'suseelag@srmist.edu.in'}});
  const assignments = await prisma.assignmentStudent.findMany({ 
    where: { assignment: { facultyId: faculty.id } },
    include: { student: true, assignment: { include: { subject: true } } } 
  });
  console.log(JSON.stringify(assignments[0], null, 2));
}
main().finally(() => prisma.$disconnect());

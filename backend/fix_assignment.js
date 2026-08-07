require('dotenv').config();
const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();

async function main() {
  const faculty = await prisma.user.findFirst({
    where: { name: { contains: 'Suseela' } }
  });
  
  if (!faculty) {
    console.log('Faculty not found');
    return;
  }
  
  const updated = await prisma.facultyAssignment.updateMany({
    where: { facultyId: faculty.id },
    data: {
      sectionId: '8fc5c96b-a54e-417b-bdb7-ed6afb406c9e' // The correct section with 45 students
    }
  });

  console.log('Updated assignments:', updated.count);
}

main().catch(console.error).finally(() => prisma.$disconnect());

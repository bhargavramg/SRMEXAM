const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();

async function fix() {
  const badId = "1e57f165-da26-4e6f-ba55-8ae30988a1e4";
  const goodId = "1ba51cab-a65a-40a8-82b4-eadbcf829e5f";

  // Update exams
  const updatedExams = await prisma.exam.updateMany({
    where: { facultyAssignmentId: badId },
    data: { facultyAssignmentId: goodId }
  });
  console.log("Updated exams:", updatedExams);
  
  // Now try to delete again
  const result = await prisma.facultyAssignment.deleteMany({
    where: { subjectOfferingId: null }
  });
  console.log("Deleted placeholders:", result);
}

fix().catch(console.error).finally(() => prisma.$disconnect());

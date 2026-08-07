const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();
async function clean() {
  const allAssignments = await prisma.facultyAssignment.findMany({
    include: {
      subjectOffering: {
        include: {
          subject: true,
          section: { include: { semester: true }},
          academicYear: true
        }
      }
    }
  });
  console.log('All Assignments:', allAssignments.map(a => ({
    id: a.id,
    subjectName: a.subjectOffering?.subject?.name,
    sectionName: a.subjectOffering?.section?.name,
    sem: a.subjectOffering?.section?.semester?.semesterNumber,
    academicYear: a.subjectOffering?.academicYear?.name
  })));
  
  // Find invalid assignments (missing subject offering data)
  const invalidAssignments = allAssignments.filter(a => 
    !a.subjectOffering || 
    !a.subjectOffering.subject || 
    !a.subjectOffering.section || 
    !a.subjectOffering.academicYear
  );
  
  if (invalidAssignments.length > 0) {
    console.log('Found invalid assignments:', invalidAssignments.map(a => a.id));
    for (let invalid of invalidAssignments) {
        await prisma.facultyAssignment.delete({ where: { id: invalid.id } });
        console.log('Deleted', invalid.id);
    }
  } else {
    console.log('No invalid assignments found.');
  }
}
clean().then(() => prisma.$disconnect()).catch(console.error);

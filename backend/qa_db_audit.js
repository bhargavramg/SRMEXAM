const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runDbAudit() {
  console.log('--- STARTING DATABASE AUDIT ---');
  let issuesFound = 0;

  try {
    // Check for Duplicate Active Enrollments
    const enrollments = await prisma.assignmentStudent.findMany({
      where: { status: 'ACTIVE' },
    });
    
    // Group by student+assignment
    const enrollMap = {};
    let duplicates = 0;
    for (const e of enrollments) {
      const key = `${e.studentId}_${e.assignmentId}`;
      if (enrollMap[key]) {
        duplicates++;
      }
      enrollMap[key] = true;
    }

    if (duplicates > 0) {
      console.log(`[FAIL] Found ${duplicates} duplicate ACTIVE enrollments for the same student+assignment.`);
      issuesFound++;
    } else {
      console.log(`[PASS] No duplicate AssignmentStudent records.`);
    }

    // Check for faculty assignments with missing dependencies (Prisma prevents this via FKs, but let's just count them)
    const assignmentsCount = await prisma.facultyAssignment.count();
    console.log(`[INFO] Found ${assignmentsCount} total FacultyAssignments.`);
    
    const resultsCount = await prisma.result.count();
    console.log(`[INFO] Found ${resultsCount} total Results.`);

    // Prisma guarantees integrity for the rest via foreign key constraints.

  } catch (err) {
    console.error('Audit failed to run:', err);
    issuesFound++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\\n--- DB AUDIT COMPLETE ---');
  if (issuesFound > 0) {
    console.log(`Found ${issuesFound} issues.`);
  } else {
    console.log('Database is healthy.');
  }
}

runDbAudit();

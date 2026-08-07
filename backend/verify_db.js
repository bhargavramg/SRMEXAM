const prisma = require('./src/utils/db');

async function verifyDatabase() {
  console.log('--- DATABASE INTEGRITY AUDIT ---');
  let errors = 0;

  // 1. Verify FacultyAssignments
  const assignments = await prisma.facultyAssignment.findMany({ include: { subject: true, faculty: true } });
  for (const a of assignments) {
    if (!a.subject) { console.error(`[ERROR] Orphaned FacultyAssignment ${a.id}: Missing Subject`); errors++; }
    if (!a.faculty) { console.error(`[ERROR] Orphaned FacultyAssignment ${a.id}: Missing Faculty`); errors++; }
  }

  // 2. Verify AssignmentStudents
  const assignmentStudents = await prisma.assignmentStudent.findMany({ include: { assignment: true, student: true } });
  for (const as of assignmentStudents) {
    if (!as.assignment) { console.error(`[ERROR] Orphaned AssignmentStudent ${as.id}: Missing Assignment`); errors++; }
    if (!as.student) { console.error(`[ERROR] Orphaned AssignmentStudent ${as.id}: Missing Student`); errors++; }
  }

  // 3. Verify Exams
  const exams = await prisma.exam.findMany({ include: { facultyAssignment: true } });
  for (const e of exams) {
    if (!e.facultyAssignment) { console.error(`[ERROR] Orphaned Exam ${e.id}: Missing FacultyAssignment`); errors++; }
  }

  // 4. Verify ExamStudents
  const examStudents = await prisma.examStudent.findMany({ include: { exam: true, student: true } });
  for (const es of examStudents) {
    if (!es.exam) { console.error(`[ERROR] Orphaned ExamStudent ${es.id}: Missing Exam`); errors++; }
    if (!es.student) { console.error(`[ERROR] Orphaned ExamStudent ${es.id}: Missing Student`); errors++; }
  }

  // 5. Verify ExamSessions
  const sessions = await prisma.examSession.findMany({ include: { exam: true, student: true } });
  for (const s of sessions) {
    if (!s.exam) { console.error(`[ERROR] Orphaned ExamSession ${s.id}: Missing Exam`); errors++; }
    if (!s.student) { console.error(`[ERROR] Orphaned ExamSession ${s.id}: Missing Student`); errors++; }
  }

  // 6. Verify Results
  const results = await prisma.result.findMany({ include: { exam: true, student: true } });
  for (const r of results) {
    if (!r.exam) { console.error(`[ERROR] Orphaned Result ${r.id}: Missing Exam`); errors++; }
    if (!r.student) { console.error(`[ERROR] Orphaned Result ${r.id}: Missing Student`); errors++; }
  }
  
  if (errors === 0) {
    console.log('[OK] All core relations hold up. No orphan records found.');
  } else {
    console.log(`[FAILED] Found ${errors} integrity errors.`);
  }
}

verifyDatabase().catch(console.error).finally(() => process.exit(0));

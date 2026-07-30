const { PrismaClient } = require('./generated/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting enterprise seed...\n');

  // ============================================================================
  // CLEANUP (reverse dependency order)
  // ============================================================================
  console.log('🧹 Cleaning existing data...');
  await prisma.upload.deleteMany();
  await prisma.browserSession.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.warning.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.result.deleteMany();
  await prisma.studentAnswer.deleteMany();
  await prisma.examSession.deleteMany();
  await prisma.examQuestion.deleteMany();
  await prisma.examConfiguration.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.facultyAssignment.deleteMany();
  await prisma.studentEnrollment.deleteMany();
  await prisma.questionTagMapping.deleteMany();
  await prisma.questionTag.deleteMany();
  await prisma.questionOption.deleteMany();
  await prisma.question.deleteMany();
  await prisma.questionCategory.deleteMany();
  await prisma.questionBank.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.section.deleteMany();
  await prisma.semester.deleteMany();
  await prisma.course.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.gradeBoundary.deleteMany();
  console.log('✅ Cleanup complete\n');

  // ============================================================================
  // 1. DEPARTMENTS
  // ============================================================================
  console.log('📁 Creating Departments...');
  const deptCSE = await prisma.department.create({
    data: { name: 'Computer Science and Engineering', code: 'CSE', description: 'Department of Computer Science and Engineering' }
  });
  const deptECE = await prisma.department.create({
    data: { name: 'Electronics and Communication Engineering', code: 'ECE', description: 'Department of Electronics and Communication Engineering' }
  });
  console.log(`   ✅ ${deptCSE.code}, ${deptECE.code}\n`);

  // ============================================================================
  // 2. COURSES
  // ============================================================================
  console.log('📚 Creating Courses...');
  const courseCSE = await prisma.course.create({
    data: { name: 'B.Tech Computer Science and Engineering', code: 'BTECH-CSE', departmentId: deptCSE.id, duration: 4 }
  });
  const courseECE = await prisma.course.create({
    data: { name: 'B.Tech Electronics and Communication', code: 'BTECH-ECE', departmentId: deptECE.id, duration: 4 }
  });
  console.log(`   ✅ ${courseCSE.code}, ${courseECE.code}\n`);

  // ============================================================================
  // 3. ACADEMIC YEAR
  // ============================================================================
  console.log('📅 Creating Academic Year...');
  const academicYear = await prisma.academicYear.create({
    data: {
      name: '2026-2027',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2027-05-31'),
      isCurrent: true,
      status: 'ACTIVE'
    }
  });
  console.log(`   ✅ ${academicYear.name}\n`);

  // ============================================================================
  // 4. SEMESTERS
  // ============================================================================
  console.log('📖 Creating Semesters...');
  const semCSE5 = await prisma.semester.create({
    data: { courseId: courseCSE.id, academicYearId: academicYear.id, semesterNumber: 5 }
  });
  const semCSE3 = await prisma.semester.create({
    data: { courseId: courseCSE.id, academicYearId: academicYear.id, semesterNumber: 3 }
  });
  const semECE5 = await prisma.semester.create({
    data: { courseId: courseECE.id, academicYearId: academicYear.id, semesterNumber: 5 }
  });
  console.log(`   ✅ CSE Sem-5, CSE Sem-3, ECE Sem-5\n`);

  // ============================================================================
  // 5. SECTIONS
  // ============================================================================
  console.log('🏷️ Creating Sections...');
  const secCSE5A = await prisma.section.create({
    data: { semesterId: semCSE5.id, name: 'A', capacity: 60 }
  });
  const secCSE5B = await prisma.section.create({
    data: { semesterId: semCSE5.id, name: 'B', capacity: 60 }
  });
  const secCSE3A = await prisma.section.create({
    data: { semesterId: semCSE3.id, name: 'A', capacity: 60 }
  });
  const secECE5A = await prisma.section.create({
    data: { semesterId: semECE5.id, name: 'A', capacity: 60 }
  });
  console.log(`   ✅ CSE-5A, CSE-5B, CSE-3A, ECE-5A\n`);

  // ============================================================================
  // 6. SUBJECTS
  // ============================================================================
  console.log('📝 Creating Subjects...');
  const subDBMS = await prisma.subject.create({
    data: { departmentId: deptCSE.id, semesterId: semCSE5.id, code: 'CS501', name: 'Database Management Systems', credits: 4, type: 'THEORY' }
  });
  const subOS = await prisma.subject.create({
    data: { departmentId: deptCSE.id, semesterId: semCSE5.id, code: 'CS502', name: 'Operating Systems', credits: 4, type: 'THEORY' }
  });
  const subDSA = await prisma.subject.create({
    data: { departmentId: deptCSE.id, semesterId: semCSE3.id, code: 'CS301', name: 'Data Structures and Algorithms', credits: 4, type: 'THEORY' }
  });
  const subDBMSLab = await prisma.subject.create({
    data: { departmentId: deptCSE.id, semesterId: semCSE5.id, code: 'CS511', name: 'DBMS Lab', credits: 2, type: 'LAB' }
  });
  console.log(`   ✅ ${subDBMS.code}, ${subOS.code}, ${subDSA.code}, ${subDBMSLab.code}\n`);

  // ============================================================================
  // 7. USERS
  // ============================================================================
  console.log('👤 Creating Users...');
  const salt = await bcrypt.genSalt(10);
  const defaultPassword = await bcrypt.hash('password123', salt);

  // Super Admin
  const superAdmin = await prisma.user.create({
    data: { name: 'Super Admin', email: 'superadmin@srm.edu', password: defaultPassword, role: 'SUPER_ADMIN' }
  });

  // Admin
  const admin = await prisma.user.create({
    data: { name: 'System Admin', email: 'admin@srm.edu', password: defaultPassword, role: 'ADMIN', departmentId: deptCSE.id }
  });

  // Faculty
  const faculty1 = await prisma.user.create({
    data: { name: 'Dr. John Smith', email: 'john.smith@srm.edu', employeeId: 'FAC001', password: defaultPassword, role: 'FACULTY', departmentId: deptCSE.id }
  });
  const faculty2 = await prisma.user.create({
    data: { name: 'Dr. Sarah Williams', email: 'sarah.w@srm.edu', employeeId: 'FAC002', password: defaultPassword, role: 'FACULTY', departmentId: deptCSE.id }
  });

  // Students — CSE Sem 5 Section A
  const student1 = await prisma.user.create({
    data: { name: 'Alice Johnson', email: 'alice.j@srm.edu', register_no: 'RA2023CSE001', password: defaultPassword, role: 'STUDENT', departmentId: deptCSE.id }
  });
  const student2 = await prisma.user.create({
    data: { name: 'Bob Kumar', email: 'bob.k@srm.edu', register_no: 'RA2023CSE002', password: defaultPassword, role: 'STUDENT', departmentId: deptCSE.id }
  });
  const student3 = await prisma.user.create({
    data: { name: 'Charlie Patel', email: 'charlie.p@srm.edu', register_no: 'RA2023CSE003', password: defaultPassword, role: 'STUDENT', departmentId: deptCSE.id }
  });

  // Students — CSE Sem 5 Section B (different section, should NOT see Section A exams)
  const student4 = await prisma.user.create({
    data: { name: 'Diana Rao', email: 'diana.r@srm.edu', register_no: 'RA2023CSE004', password: defaultPassword, role: 'STUDENT', departmentId: deptCSE.id }
  });

  // Students — ECE (completely different department)
  const student5 = await prisma.user.create({
    data: { name: 'Eve Sharma', email: 'eve.s@srm.edu', register_no: 'RA2023ECE001', password: defaultPassword, role: 'STUDENT', departmentId: deptECE.id }
  });

  console.log(`   ✅ SuperAdmin, Admin, 2 Faculty, 5 Students\n`);

  // ============================================================================
  // 8. STUDENT ENROLLMENTS
  // ============================================================================
  console.log('🎓 Creating Student Enrollments...');
  // Alice, Bob, Charlie → CSE Sem 5 Section A
  for (const student of [student1, student2, student3]) {
    await prisma.studentEnrollment.create({
      data: {
        studentId: student.id,
        courseId: courseCSE.id,
        semesterId: semCSE5.id,
        sectionId: secCSE5A.id,
        academicYearId: academicYear.id,
        status: 'ACTIVE'
      }
    });
  }
  // Diana → CSE Sem 5 Section B
  await prisma.studentEnrollment.create({
    data: { studentId: student4.id, courseId: courseCSE.id, semesterId: semCSE5.id, sectionId: secCSE5B.id, academicYearId: academicYear.id, status: 'ACTIVE' }
  });
  // Eve → ECE Sem 5 Section A
  await prisma.studentEnrollment.create({
    data: { studentId: student5.id, courseId: courseECE.id, semesterId: semECE5.id, sectionId: secECE5A.id, academicYearId: academicYear.id, status: 'ACTIVE' }
  });
  console.log(`   ✅ 5 enrollments created\n`);

  // ============================================================================
  // 9. FACULTY ASSIGNMENTS
  // ============================================================================
  console.log('🏫 Creating Faculty Assignments...');
  // Dr. John Smith teaches DBMS to CSE Sem 5 Section A
  const assignDBMS_A = await prisma.facultyAssignment.create({
    data: {
      facultyId: faculty1.id,
      subjectId: subDBMS.id,
      sectionId: secCSE5A.id,
      academicYearId: academicYear.id,
      teachingType: 'THEORY',
      status: 'ACTIVE'
    }
  });
  // Dr. John Smith teaches DBMS to CSE Sem 5 Section B
  const assignDBMS_B = await prisma.facultyAssignment.create({
    data: {
      facultyId: faculty1.id,
      subjectId: subDBMS.id,
      sectionId: secCSE5B.id,
      academicYearId: academicYear.id,
      teachingType: 'THEORY',
      status: 'ACTIVE'
    }
  });
  // Dr. Sarah Williams teaches OS to CSE Sem 5 Section A
  const assignOS_A = await prisma.facultyAssignment.create({
    data: {
      facultyId: faculty2.id,
      subjectId: subOS.id,
      sectionId: secCSE5A.id,
      academicYearId: academicYear.id,
      teachingType: 'THEORY',
      status: 'ACTIVE'
    }
  });
  // Dr. John Smith teaches DBMS Lab to CSE Sem 5 Section A
  const assignDBMSLab_A = await prisma.facultyAssignment.create({
    data: {
      facultyId: faculty1.id,
      subjectId: subDBMSLab.id,
      sectionId: secCSE5A.id,
      academicYearId: academicYear.id,
      teachingType: 'LAB',
      status: 'ACTIVE'
    }
  });
  console.log(`   ✅ DBMS→A, DBMS→B, OS→A, DBMS Lab→A\n`);

  // ============================================================================
  // 10. QUESTION CATEGORIES & TAGS
  // ============================================================================
  console.log('🏷️ Creating Question Categories & Tags...');
  const cat1 = await prisma.questionCategory.create({
    data: { name: 'SQL Fundamentals', description: 'Basic SQL queries and commands', departmentId: deptCSE.id, createdById: faculty1.id }
  });
  const cat2 = await prisma.questionCategory.create({
    data: { name: 'Normalization', description: 'Database normalization forms (1NF, 2NF, 3NF, BCNF)', departmentId: deptCSE.id, createdById: faculty1.id }
  });
  const cat3 = await prisma.questionCategory.create({
    data: { name: 'ER Modeling', description: 'Entity-Relationship diagrams and design', departmentId: deptCSE.id, createdById: faculty1.id }
  });
  const tag1 = await prisma.questionTag.create({ data: { name: 'Core' } });
  const tag2 = await prisma.questionTag.create({ data: { name: 'SQL' } });
  const tag3 = await prisma.questionTag.create({ data: { name: 'Theory' } });
  const tag4 = await prisma.questionTag.create({ data: { name: 'Practical' } });
  console.log(`   ✅ 3 categories, 4 tags\n`);

  // ============================================================================
  // 11. QUESTION BANK & QUESTIONS
  // ============================================================================
  console.log('❓ Creating Question Bank & Questions...');
  const qBank = await prisma.questionBank.create({
    data: { name: 'DBMS Core Question Bank', subjectId: subDBMS.id }
  });

  const q1 = await prisma.question.create({
    data: {
      bankId: qBank.id, type: 'MCQ',
      text: 'Which of the following is true concerning a Database Management System?',
      marks: 2, negativeMarks: 0.5, difficulty: 'MEDIUM', categoryId: cat1.id,
      explanation: 'A DBMS serves as an intermediary between user applications and the database.',
      bloomsLevel: 'Understand', estimatedTime: 60,
      options: {
        create: [
          { text: 'It manages only the storage of data.', isCorrect: false },
          { text: 'It provides an interface between the data and the application programs.', isCorrect: true },
          { text: 'It only supports single user access at a time.', isCorrect: false },
          { text: 'It cannot enforce data integrity.', isCorrect: false }
        ]
      },
      tags: { create: [{ tagId: tag1.id }, { tagId: tag3.id }] }
    }
  });

  const q2 = await prisma.question.create({
    data: {
      bankId: qBank.id, type: 'TRUE_FALSE',
      text: 'SQL stands for Structured Query Language.',
      marks: 1, difficulty: 'EASY', categoryId: cat1.id,
      options: {
        create: [
          { text: 'True', isCorrect: true },
          { text: 'False', isCorrect: false }
        ]
      },
      tags: { create: [{ tagId: tag2.id }] }
    }
  });

  const q3 = await prisma.question.create({
    data: {
      bankId: qBank.id, type: 'MCQ',
      text: 'Which normal form deals with multi-valued dependencies?',
      marks: 2, negativeMarks: 0.5, difficulty: 'HARD', categoryId: cat2.id,
      explanation: 'Fourth Normal Form (4NF) deals with multi-valued dependencies.',
      bloomsLevel: 'Analyze', estimatedTime: 90,
      options: {
        create: [
          { text: 'Second Normal Form (2NF)', isCorrect: false },
          { text: 'Third Normal Form (3NF)', isCorrect: false },
          { text: 'Fourth Normal Form (4NF)', isCorrect: true },
          { text: 'Boyce-Codd Normal Form (BCNF)', isCorrect: false }
        ]
      },
      tags: { create: [{ tagId: tag1.id }, { tagId: tag3.id }] }
    }
  });

  const q4 = await prisma.question.create({
    data: {
      bankId: qBank.id, type: 'MCQ',
      text: 'In an ER diagram, a weak entity is represented by:',
      marks: 1, difficulty: 'EASY', categoryId: cat3.id,
      bloomsLevel: 'Remember', estimatedTime: 45,
      options: {
        create: [
          { text: 'A single rectangle', isCorrect: false },
          { text: 'A double rectangle', isCorrect: true },
          { text: 'A diamond', isCorrect: false },
          { text: 'An oval', isCorrect: false }
        ]
      },
      tags: { create: [{ tagId: tag3.id }] }
    }
  });

  const q5 = await prisma.question.create({
    data: {
      bankId: qBank.id, type: 'MCQ',
      text: 'Which SQL command is used to remove a table from a database?',
      marks: 1, difficulty: 'EASY', categoryId: cat1.id,
      bloomsLevel: 'Remember', estimatedTime: 30,
      options: {
        create: [
          { text: 'DELETE TABLE', isCorrect: false },
          { text: 'REMOVE TABLE', isCorrect: false },
          { text: 'DROP TABLE', isCorrect: true },
          { text: 'DESTROY TABLE', isCorrect: false }
        ]
      },
      tags: { create: [{ tagId: tag2.id }, { tagId: tag4.id }] }
    }
  });

  // SHORT_ANSWER question (requires faculty evaluation)
  const q6 = await prisma.question.create({
    data: {
      bankId: qBank.id, type: 'SHORT_ANSWER',
      text: 'Explain the difference between a primary key and a foreign key in a relational database. Provide examples.',
      marks: 5, difficulty: 'MEDIUM', categoryId: cat1.id,
      explanation: 'A primary key uniquely identifies records in a table. A foreign key references the primary key of another table.',
      bloomsLevel: 'Understand', estimatedTime: 180,
      tags: { create: [{ tagId: tag3.id }] }
    }
  });

  // FILL_IN_BLANK question
  const q7 = await prisma.question.create({
    data: {
      bankId: qBank.id, type: 'FILL_IN_BLANK',
      text: 'The SQL command used to retrieve data from a database is called ________.',
      marks: 1, difficulty: 'EASY', categoryId: cat1.id,
      options: {
        create: [
          { text: 'SELECT', isCorrect: true }
        ]
      },
      tags: { create: [{ tagId: tag2.id }] }
    }
  });

  console.log(`   ✅ 1 Question Bank, 7 Questions (5 MCQ/TF + 1 Short Answer + 1 Fill-in-Blank)\n`);

  // ============================================================================
  // 12. EXAM (Published, linked to FacultyAssignment)
  // ============================================================================
  console.log('📝 Creating Exam...');
  const now = new Date();
  const exam = await prisma.exam.create({
    data: {
      title: 'DBMS Mid-Semester Examination',
      facultyAssignmentId: assignDBMS_A.id,
      durationMins: 120,
      passingMarks: 40,
      totalMarks: 12,
      instructions: 'Answer all questions. Negative marking applies to MCQs. Do not switch tabs or exit fullscreen.',
      status: 'PUBLISHED',
      startTime: new Date(now.getTime() - 60 * 60 * 1000), // Started 1 hour ago
      endTime: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Ends in 24 hours
      examQuestions: {
        create: [
          { questionId: q1.id, orderIndex: 1 },
          { questionId: q2.id, orderIndex: 2 },
          { questionId: q3.id, orderIndex: 3 },
          { questionId: q4.id, orderIndex: 4 },
          { questionId: q5.id, orderIndex: 5 },
          { questionId: q6.id, orderIndex: 6 },
          { questionId: q7.id, orderIndex: 7 }
        ]
      },
      config: {
        create: {
          maxWarnings: 3,
          autoSubmit: true,
          autoSaveInterval: 30,
          allowResume: true,
          requireFullscreen: true,
          randomQuestions: true,
          randomOptions: true,
          calculatorAllowed: false,
          lateEntryAllowed: true,
          lateEntryMins: 15
        }
      }
    }
  });
  console.log(`   ✅ ${exam.title} (Status: ${exam.status})\n`);

  // ============================================================================
  // 13. NOTIFICATIONS (Auto-generated for eligible students)
  // ============================================================================
  console.log('🔔 Creating Notifications for eligible students...');
  // Eligible students for DBMS Section A: Alice, Bob, Charlie
  for (const student of [student1, student2, student3]) {
    await prisma.notification.create({
      data: {
        userId: student.id,
        examId: exam.id,
        type: 'EXAM_PUBLISHED',
        title: 'New Exam Published',
        message: `${exam.title} has been published. Duration: ${exam.durationMins} minutes. Check your dashboard for details.`
      }
    });
  }
  console.log(`   ✅ 3 notifications sent\n`);

  // ============================================================================
  // SUMMARY
  // ============================================================================
  // ============================================================================
  // 14. GRADE BOUNDARIES (Configurable)
  // ============================================================================
  console.log('📊 Creating Grade Boundaries...');
  const gradeBoundaries = [
    { grade: 'A+', minPercentage: 90, maxPercentage: 100, isPass: true, description: 'Outstanding' },
    { grade: 'A',  minPercentage: 80, maxPercentage: 89.99, isPass: true, description: 'Excellent' },
    { grade: 'B+', minPercentage: 70, maxPercentage: 79.99, isPass: true, description: 'Very Good' },
    { grade: 'B',  minPercentage: 60, maxPercentage: 69.99, isPass: true, description: 'Good' },
    { grade: 'C',  minPercentage: 50, maxPercentage: 59.99, isPass: true, description: 'Average' },
    { grade: 'F',  minPercentage: 0,  maxPercentage: 49.99, isPass: false, description: 'Fail' },
  ];
  for (const gb of gradeBoundaries) {
    await prisma.gradeBoundary.create({ data: gb });
  }
  console.log(`   ✅ 6 grade boundaries created\n`);

  console.log('═══════════════════════════════════════════════════════');
  console.log('🎉 SEED COMPLETED SUCCESSFULLY!');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('📋 Login Credentials (all use password: password123):');
  console.log('');
  console.log('   SUPER ADMIN:  superadmin@srm.edu');
  console.log('   ADMIN:        admin@srm.edu');
  console.log('   FACULTY:      john.smith@srm.edu   (DBMS, Section A & B)');
  console.log('   FACULTY:      sarah.w@srm.edu      (OS, Section A)');
  console.log('   STUDENT:      alice.j@srm.edu      (CSE Sem-5 Sec-A) ← Has exam');
  console.log('   STUDENT:      bob.k@srm.edu        (CSE Sem-5 Sec-A) ← Has exam');
  console.log('   STUDENT:      charlie.p@srm.edu    (CSE Sem-5 Sec-A) ← Has exam');
  console.log('   STUDENT:      diana.r@srm.edu      (CSE Sem-5 Sec-B) ← No exam yet');
  console.log('   STUDENT:      eve.s@srm.edu        (ECE Sem-5 Sec-A) ← Different dept');
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

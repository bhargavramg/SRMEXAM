require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('--- STARTING SUBMISSION REGRESSION TEST ---');

  try {
    // 1. Find a student
    const student = await prisma.user.findFirst({
      where: { role: 'STUDENT', status: 'ACTIVE' },
    });
    if (!student) throw new Error('No student found');
    console.log(`Found student: ${student.name} (${student.email})`);

    // 2. Find a faculty
    const faculty = await prisma.user.findFirst({
      where: { role: 'FACULTY', status: 'ACTIVE' },
    });
    if (!faculty) throw new Error('No faculty found');
    console.log(`Found faculty: ${faculty.name}`);

    // 3. Find an active subject
    const subject = await prisma.subject.findFirst();
    if (!subject) throw new Error('No subject found');

    const assessmentType = await prisma.assessmentType.findFirst();
    if (!assessmentType) throw new Error('No assessment type found');

    // 4. Create an assignment
    let assignment = await prisma.facultyAssignment.findFirst({
      where: { facultyId: faculty.id, subjectId: subject.id }
    });
    if (!assignment) {
      assignment = await prisma.facultyAssignment.create({
        data: {
          facultyId: faculty.id,
          subjectId: subject.id,
          assessmentTypeId: assessmentType.id
        }
      });
      console.log('Created faculty assignment');
    }

    // 5. Enroll student
    let enrollment = await prisma.assignmentStudent.findFirst({
      where: { assignmentId: assignment.id, studentId: student.id }
    });
    if (!enrollment) {
      enrollment = await prisma.assignmentStudent.create({
        data: { assignmentId: assignment.id, studentId: student.id }
      });
      console.log('Enrolled student in assignment');
    }

    // 6. Create a test Exam
    const exam = await prisma.exam.create({
      data: {
        title: `Regression Test Exam ${Date.now()}`,
        facultyAssignmentId: assignment.id,
        durationMins: 60,
        passingMarks: 10,
        totalMarks: 20,
        status: 'ACTIVE',
        startTime: new Date(Date.now() - 10000), // 10s ago
        endTime: new Date(Date.now() + 3600000), // 1 hour from now
      }
    });
    console.log(`Created test exam: ${exam.title}`);

    // Assign student to exam
    await prisma.examStudent.create({
      data: { examId: exam.id, studentId: student.id }
    });

    // Create a mock question
    const bank = await prisma.questionBank.create({
      data: { name: 'Test Bank', subjectId: subject.id }
    });
    const question = await prisma.question.create({
      data: {
        bankId: bank.id, text: 'Test Question 1', type: 'MCQ', marks: 2,
        options: {
          create: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false }
          ]
        }
      },
      include: { options: true }
    });
    await prisma.examQuestion.create({
      data: { examId: exam.id, questionId: question.id, orderIndex: 0 }
    });

    // 7. Create ExamSession
    const session = await prisma.examSession.create({
      data: {
        examId: exam.id,
        studentId: student.id,
        status: 'IN_PROGRESS',
        startTime: new Date(),
        startedAt: new Date(),
      }
    });
    console.log(`Created exam session: ${session.id}`);

    // 8. Start the HTTP server to test the actual API
    console.log('Starting local express app to test submitExam endpoint...');
    const express = require('express');
    const app = express();
    app.use(express.json());
    
    // Mock auth middleware
    app.use((req, res, next) => {
      req.user = { id: student.id, role: 'STUDENT' };
      next();
    });

    const studentController = require('./src/controllers/studentController');
    app.post('/api/student/exams/:sessionId/submit', studentController.submitExam);

    const server = app.listen(0, async () => {
      const port = server.address().port;
      console.log(`Server listening on port ${port}`);

      // 9. Send Submit Exam request
      console.log('Sending submit exam request...');
      
      const payload = {
        answers: {
          [question.id]: {
            selectedOptionId: question.options[0].id,
            timeSpent: 15
          }
        },
        forced: false
      };

      const response = await fetch(`http://localhost:${port}/api/student/exams/${session.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const responseBody = await response.json();
      console.log(`Response Status: ${response.status}`);
      console.log('Response Body:', JSON.stringify(responseBody, null, 2));

      if (response.status === 200) {
        console.log('✅ SUBMIT API SUCCEEDED');
      } else {
        console.error('❌ SUBMIT API FAILED');
      }

      // 10. Verify Database State
      const updatedSession = await prisma.examSession.findUnique({ where: { id: session.id } });
      const result = await prisma.result.findFirst({ where: { sessionId: session.id } });
      const answer = await prisma.studentAnswer.findFirst({ where: { sessionId: session.id } });
      const notifications = await prisma.notification.findMany({ where: { examId: exam.id } });

      console.log('\n--- DATABASE VERIFICATION ---');
      console.log(`Session Status: ${updatedSession.status}`);
      console.log(`Result Created: ${!!result} (Status: ${result?.status}, Published: ${result?.published})`);
      console.log(`Answer Created: ${!!answer} (Marks: ${answer?.marksObtained})`);
      console.log(`Notifications Created: ${notifications.length}`);

      if (updatedSession.status === 'SUBMITTED' && result && answer && notifications.length > 0) {
        console.log('✅ ALL DATABASE CHECKS PASSED');
      } else {
        console.error('❌ DATABASE CHECKS FAILED');
      }

      // Clean up
      server.close();
      process.exit(0);
    });

  } catch (err) {
    console.error('Test script failed:', err);
    process.exit(1);
  }
}

run();

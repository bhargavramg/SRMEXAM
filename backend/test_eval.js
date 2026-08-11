const { PrismaClient } = require('./prisma/generated/client');
require('dotenv').config();
const prisma = new PrismaClient();

async function main() {
  const sessionId = 'f8d46e46-a3a8-42c8-aa37-7144b8fc64df';

  // mock completeEvaluation
  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: {
      exam: { include: { facultyAssignment: true } },
      studentAnswers: { include: { question: true } }
    }
  });

  if (!session) return console.log('Session not found');

  let objectiveMarks = 0;
  let correctCount = 0;
  
  for (const a of session.studentAnswers) {
    const marks = a.marksObtained || 0;
    objectiveMarks += marks;
    if (a.isCorrect === true) correctCount++;
  }

  const percentage = session.exam.totalMarks > 0 ? (objectiveMarks / session.exam.totalMarks) * 100 : 0;

  const res = await prisma.examSession.update({
    where: { id: sessionId },
    data: {
      obtainedMarks: objectiveMarks,
      objectiveMarks,
      percentage,
    }
  });

  const result = await prisma.result.findFirst({
    where: { examId: session.examId, studentId: session.studentId }
  });

  if (result) {
    await prisma.result.update({
      where: { id: result.id },
      data: {
        marksObtained: objectiveMarks,
        objectiveMarks,
        percentage,
        isPass: percentage >= 50,
        grade: 'A',
        status: 'EVALUATED',
        correctAnswers: correctCount,
        incorrectAnswers: 0,
      }
    });
    console.log('Result updated successfully!');
  }

  console.log('Session updated successfully!', res);
}

main().catch(console.error).finally(() => prisma.$disconnect());

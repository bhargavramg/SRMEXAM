const prisma = require('../utils/db');
const { z } = require('zod');
const { updateGlobalExamStatuses } = require('../utils/examLifecycle');

// ============================================================================
// GRADE CALCULATION HELPER
// ============================================================================
async function calculateGrade(percentage) {
  const boundaries = await prisma.gradeBoundary.findMany({
    orderBy: { minPercentage: 'desc' }
  });
  
  if (boundaries.length === 0) {
    // Default grade boundaries if none configured
    const defaults = [
      { grade: 'A+', min: 90, max: 100, pass: true },
      { grade: 'A',  min: 80, max: 89.99, pass: true },
      { grade: 'B+', min: 70, max: 79.99, pass: true },
      { grade: 'B',  min: 60, max: 69.99, pass: true },
      { grade: 'C',  min: 50, max: 59.99, pass: true },
      { grade: 'F',  min: 0,  max: 49.99, pass: false },
    ];
    for (const d of defaults) {
      if (percentage >= d.min && percentage <= d.max) {
        return { grade: d.grade, isPass: d.pass };
      }
    }
    return { grade: 'F', isPass: false };
  }
  
  for (const b of boundaries) {
    if (percentage >= b.minPercentage && percentage <= b.maxPercentage) {
      return { grade: b.grade, isPass: b.isPass };
    }
  }
  return { grade: 'F', isPass: false };
}

// ============================================================================
// AUTO-EVALUATION HELPER
// ============================================================================
function isObjectiveType(type) {
  return ['MCQ', 'TRUE_FALSE', 'MULTIPLE_CORRECT', 'FILL_IN_BLANK'].includes(type);
}

// ============================================================================
// STUDENT DASHBOARD
// ============================================================================
exports.getDashboardData = async (req, res) => {
  try {
    await updateGlobalExamStatuses();
    const studentId = req.user.id;
    const now = new Date();

    const enrollment = await prisma.assignmentStudent.findFirst({
      where: { studentId, status: 'ACTIVE' },
      include: {
        assignment: {
          include: { subject: { include: { department: true } }, assessmentType: true, academicYear: true }
        }
      }
    });

    const assignmentIds = await getStudentAssignmentIds(studentId);

    // Todays Exams: SCHEDULED or ACTIVE with startTime today
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    const todaysExamsCount = await prisma.exam.count({
      where: {
        OR: [
          { examStudents: { some: { studentId } } },
          { examStudents: { none: {} }, facultyAssignmentId: { in: assignmentIds } }
        ],
        status: { in: ['SCHEDULED', 'ACTIVE'] },
        startTime: { gte: startOfDay, lte: endOfDay }
      }
    });

    const upcomingExamsCount = await prisma.exam.count({
      where: {
        OR: [
          { examStudents: { some: { studentId } } },
          { examStudents: { none: {} }, facultyAssignmentId: { in: assignmentIds } }
        ],
        status: 'SCHEDULED'
      }
    });

    const completedExamsCount = await prisma.exam.count({
      where: {
        OR: [
          { examStudents: { some: { studentId } } },
          { examStudents: { none: {} }, facultyAssignmentId: { in: assignmentIds } }
        ],
        status: 'COMPLETED'
      }
    });

    const pendingResultsCount = await prisma.exam.count({
      where: {
        OR: [
          { examStudents: { some: { studentId } } },
          { examStudents: { none: {} }, facultyAssignmentId: { in: assignmentIds } }
        ],
        status: 'EVALUATION'
      }
    });

    const publishedResultsCount = await prisma.exam.count({
      where: {
        OR: [
          { examStudents: { some: { studentId } } },
          { examStudents: { none: {} }, facultyAssignmentId: { in: assignmentIds } }
        ],
        status: 'CLOSED'
      }
    });

    const activeExams = await prisma.exam.findMany({
      where: {
        OR: [
          { examStudents: { some: { studentId } } },
          { examStudents: { none: {} }, facultyAssignmentId: { in: assignmentIds } }
        ],
        status: 'ACTIVE'
      },
      include: {
        facultyAssignment: {
          include: { subject: true, assessmentType: true, academicYear: true, faculty: { select: { name: true } } }
        },
        config: true
      }
    });

    // Filter out submitted ones
    const submittedSessionExamIds = (await prisma.examSession.findMany({
      where: { studentId, status: { in: ['SUBMITTED', 'AUTO_SUBMITTED'] } },
      select: { examId: true }
    })).map(s => s.examId);

    const filteredActiveExams = activeExams.filter(e => !submittedSessionExamIds.includes(e.id));

    const upcomingExams = await prisma.exam.findMany({
      where: {
        OR: [
          { examStudents: { some: { studentId } } },
          { examStudents: { none: {} }, facultyAssignmentId: { in: assignmentIds } }
        ],
        status: 'SCHEDULED'
      },
      include: {
        facultyAssignment: {
          include: { subject: true, assessmentType: true, academicYear: true, faculty: { select: { name: true } } }
        }
      },
      orderBy: { startTime: 'asc' },
      take: 5
    });

    const user = await prisma.user.findUnique({
      where: { id: studentId },
      select: { name: true, email: true, register_no: true }
    });

    const notifications = await prisma.notification.findMany({
      where: { userId: studentId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    res.json({
      stats: { 
        todaysExams: todaysExamsCount, 
        upcomingExams: upcomingExamsCount, 
        completedExams: completedExamsCount,
        pendingResults: pendingResultsCount,
        publishedResults: publishedResultsCount,
        attendance: 100 // placeholder since attendance model isn't active
      },
      activeExams: filteredActiveExams,
      upcomingExams,
      enrollment,
      user,
      notifications
    });
  } catch (error) {
    console.error('Student dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// EXAM LISTING ENDPOINTS
// ============================================================================
async function getStudentAssignmentIds(studentId) {
  const enrollments = await prisma.assignmentStudent.findMany({
    where: { studentId, status: 'ACTIVE' },
    select: { assignmentId: true }
  });
  return enrollments.map(e => e.assignmentId);
}

exports.getUpcomingExams = async (req, res) => {
  try {
    await updateGlobalExamStatuses();
    const assignmentIds = await getStudentAssignmentIds(req.user.id);
    const exams = await prisma.exam.findMany({
      where: {
        OR: [
          { examStudents: { some: { studentId: req.user.id } } },
          { examStudents: { none: {} }, facultyAssignmentId: { in: assignmentIds } }
        ],
        status: 'SCHEDULED'
      },
      include: {
        facultyAssignment: { include: { subject: true, assessmentType: true, academicYear: true, faculty: { select: { name: true } } } },
        config: true
      },
      orderBy: { startTime: 'asc' }
    });
    res.json(exams);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getLiveExams = async (req, res) => {
  try {
    await updateGlobalExamStatuses();
    const now = new Date();
    const assignmentIds = await getStudentAssignmentIds(req.user.id);
    const exams = await prisma.exam.findMany({
      where: {
        OR: [
          { examStudents: { some: { studentId: req.user.id } } },
          { examStudents: { none: {} }, facultyAssignmentId: { in: assignmentIds } }
        ],
        status: 'ACTIVE',
        AND: [
          {
            OR: [
              { startTime: { lte: now } },
              { startTime: null }
            ]
          },
          {
            OR: [
              { endTime: { gte: now } },
              { endTime: null }
            ]
          }
        ]
      },
      include: {
        facultyAssignment: { include: { subject: true, assessmentType: true, academicYear: true, faculty: { select: { name: true } } } },
        config: true
      }
    });
    res.json(exams);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getExamHistory = async (req, res) => {
  try {
    await updateGlobalExamStatuses();
    const assignmentIds = await getStudentAssignmentIds(req.user.id);
    const exams = await prisma.exam.findMany({
      where: {
        OR: [
          { examStudents: { some: { studentId: req.user.id } } },
          { examStudents: { none: {} }, facultyAssignmentId: { in: assignmentIds } }
        ],
        status: { in: ['COMPLETED', 'EVALUATION', 'CLOSED', 'ARCHIVED'] }
      },
      include: {
        facultyAssignment: { include: { subject: true } },
        results: { where: { studentId: req.user.id } }
      },
      orderBy: { endTime: 'desc' }
    });
    const mappedExams = exams.map(exam => ({
      ...exam,
      results: exam.results.map(r => ({
        id: r.id,
        examId: r.examId,
        status: r.status,
        isProvisional: true
      }))
    }));
    res.json(mappedExams);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// RESULTS — Enhanced with full details
// ============================================================================
exports.getResults = async (req, res) => {
  try {
    const studentId = req.user.id;

        // Get all results for this student (published ones show full data, others show "pending")
    const results = await prisma.result.findMany({
      where: { studentId },
      include: {
        exam: {
          include: {
            config: true,
            facultyAssignment: {
              include: {
                subject: true,
                faculty: { select: { name: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Map results: published show full data, unpublished show limited
    const mapped = results.map(r => {
      const base = {
        id: r.id,
        examId: r.examId,
        examTitle: r.exam.title,
        subject: r.exam.facultyAssignment.subject.name,
        subjectCode: r.exam.facultyAssignment.subject.code,
        faculty: r.exam.facultyAssignment.faculty.name,
        section: '-',
        semester: '-',
        status: r.status,
        createdAt: r.createdAt,
      };

      const config = r.exam.config;
      const mode = config?.showResultMode || 'manual';
      const endTime = r.exam.endTime;
      
      let isVisible = false;
      if (mode === 'immediately') {
         isVisible = (r.status === 'EVALUATED' || r.status === 'PUBLISHED' || r.status === 'AUTO_EVALUATED');
      } else if (mode === 'after_end') {
         const hasEnded = endTime && (new Date() >= new Date(endTime));
         isVisible = hasEnded && (r.status === 'EVALUATED' || r.status === 'PUBLISHED' || r.status === 'AUTO_EVALUATED');
      } else { // manual
         isVisible = (r.status === 'PUBLISHED' || r.published === true);
      }
      
      if (r.status === 'PUBLISHED' || r.published === true) {
         isVisible = true;
      }

      if (isVisible) {
        return {
          ...base,
          totalMarks: r.totalMarks,
          marksObtained: r.marksObtained,
          objectiveMarks: r.objectiveMarks,
          percentage: r.percentage,
          grade: r.grade,
          isPass: r.isPass,
          remarks: r.remarks,
          publishedAt: r.publishedAt,
          totalQuestions: r.totalQuestions,
          attemptedQuestions: r.attemptedQuestions,
          correctAnswers: r.correctAnswers,
          incorrectAnswers: r.incorrectAnswers,
          unansweredQuestions: r.unansweredQuestions,
        };
      }

      // Unpublished: show only status without marks
      return {
        ...base,
        isProvisional: true,
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error('getResults error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// EXAM DETAILS & CONFIG
// ============================================================================
exports.getExamDetails = async (req, res) => {
  try {
    await updateGlobalExamStatuses();
    const { id } = req.params;
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        facultyAssignment: {
          include: { subject: true, faculty: { select: { name: true } } }
        },
        config: true
      }
    });

    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    const assignmentIds = await getStudentAssignmentIds(req.user.id);
    
    // Check strict ExamStudent mapping
    const examStudentCount = await prisma.examStudent.count({
      where: { examId: id }
    });
    
    if (examStudentCount > 0) {
      const isAssigned = await prisma.examStudent.findUnique({
        where: { examId_studentId: { examId: id, studentId: req.user.id } }
      });
      if (!isAssigned) {
        return res.status(403).json({ error: 'You are not eligible for this exam' });
      }
    } else {
      // Fallback
      if (!assignmentIds.includes(exam.facultyAssignmentId)) {
        return res.status(403).json({ error: 'You are not eligible for this exam' });
      }
    }

    if (!['ACTIVE', 'SCHEDULED'].includes(exam.status)) {
      return res.status(403).json({ error: 'This exam is not available yet' });
    }

    res.json(exam);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getExamConfig = async (req, res) => {
  try {
    const config = await prisma.examConfiguration.findUnique({
      where: { examId: req.params.id }
    });
    if (!config) return res.status(404).json({ error: 'Configuration not found' });
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// EXAM SESSION
// ============================================================================
exports.startExamSession = async (req, res) => {
  try {
    const examId = req.params.id;
    const studentId = req.user.id;
    
    console.log(`\n--- START EXAM REQUEST ---`);
    console.log(`Student ID: ${studentId}`);
    console.log(`Exam ID: ${examId}`);
    console.log(`Current Time: ${new Date().toISOString()}`);

    const assignmentIds = await getStudentAssignmentIds(studentId);

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { config: true, facultyAssignment: true, _count: { select: { examStudents: true } } }
    });
    
    if (!exam) {
      console.log(`Result: Exam not found`);
      return res.status(404).json({ error: 'Exam not found' });
    }
    
    console.log(`Exam Status: ${exam.status}, Faculty Assignment ID: ${exam.facultyAssignmentId}`);

    if (exam._count.examStudents > 0) {
      // Security Check: Verify if student is explicitly assigned to this exam
      const assignmentCheck = await prisma.examStudent.findUnique({
        where: { examId_studentId: { examId, studentId } }
      });

      if (!assignmentCheck) {
        console.log(`Result: Not eligible (No ExamStudent mapping)`);
        return res.status(403).json({ error: 'You are not assigned to this examination.' });
      }
    } else {
      // Legacy fallback
      if (!assignmentIds.includes(exam.facultyAssignmentId)) {
        console.log(`Result: Not eligible (Legacy fallback)`);
        return res.status(403).json({ error: 'You are not eligible for this exam (legacy mode)' });
      }
    }

    const now = new Date();
    
    if (!['ACTIVE', 'SCHEDULED'].includes(exam.status)) {
      console.log(`Result: Exam not active or scheduled`);
      return res.status(400).json({ error: 'This exam is not available' });
    }
    if (exam.startTime && now < exam.startTime) {
      console.log(`Result: Exam not started yet`);
      return res.status(400).json({ error: 'This exam has not started yet' });
    }
    if (exam.endTime && now > exam.endTime) {
      console.log(`Result: Exam already ended`);
      return res.status(400).json({ error: 'This exam has already ended' });
    }

    let session = await prisma.examSession.findFirst({
      where: { examId, studentId, status: 'IN_PROGRESS' }
    });

    if (!session) {
      const submitted = await prisma.examSession.findFirst({
        where: { examId, studentId, status: { in: ['SUBMITTED', 'AUTO_SUBMITTED'] } }
      });
      if (submitted) {
        console.log(`Result: Already submitted`);
        return res.status(400).json({ error: 'You have already submitted this exam' });
      }

      // Count previous attempts
      const previousAttempts = await prisma.examSession.count({
        where: { examId, studentId }
      });

      console.log(`Creating new ExamSession...`);
      session = await prisma.examSession.create({
        data: {
          examId, studentId, status: 'IN_PROGRESS',
          startedAt: now,
          attemptNumber: previousAttempts + 1,
          ipAddress: req.ip,
          deviceInfo: req.headers['user-agent'],
          browser: req.headers['user-agent']
        }
      });
      console.log(`ExamSession Created: ${session.id}`);

      await prisma.activityLog.create({
        data: {
          userId: studentId, role: 'STUDENT', examId, sessionId: session.id,
          action: 'EXAM_STARTED',
          details: `Student started exam attempt #${session.attemptNumber}`,
          ipAddress: req.ip, browser: req.headers['user-agent']
        }
      });
    } else {
      console.log(`Resuming existing ExamSession: ${session.id}`);
    }

    res.json(session);
  } catch (error) {
    console.error('\n--- START EXAM EXCEPTION ---');
    console.error(error);
    console.error(error.stack);
    res.status(500).json({ error: 'Internal database error' });
  }
};

// ============================================================================
// SEEDED RANDOM UTILITY
// ============================================================================
function getSeededRandom(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

exports.getExamQuestions = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const studentId = req.user.id;

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: { exam: { include: { config: true } } }
    });

    if (!session || session.studentId !== studentId) {
      return res.status(403).json({ error: 'Invalid session' });
    }
    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Exam session is not active' });
    }

    const examQuestions = await prisma.examQuestion.findMany({
      where: { examId: session.examId },
      include: {
        question: {
          include: { options: { select: { id: true, text: true } } }
        }
      },
      orderBy: { orderIndex: 'asc' }
    });

    let questionsList = examQuestions.map(eq => eq.question);

    const random = getSeededRandom(sessionId);

    if (session.exam.config?.randomQuestions) {
      questionsList.sort(() => random() - 0.5);
    }
    if (session.exam.config?.randomOptions) {
      questionsList.forEach(q => {
        if (q.options) q.options.sort(() => random() - 0.5);
      });
    }

    const existingAnswers = await prisma.studentAnswer.findMany({
      where: { sessionId },
      select: {
        questionId: true,
        textAnswer: true,
        selectedOptions: { select: { id: true } }
      }
    });

    res.json({ questions: questionsList, existingAnswers });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// SUBMIT EXAM — Full auto-evaluation with enhanced answer storage
// Results are NEVER published immediately — faculty must publish explicitly.
// ============================================================================
exports.submitExam = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answers, forced, warningCount, fullscreenViolations, networkDisconnects } = req.body;
    const studentId = req.user.id;

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: { 
        exam: {
          include: { 
            facultyAssignment: true,
            config: true 
          }
        },
        student: true
      }
    });

    if (!session || session.studentId !== studentId) {
      return res.status(403).json({ error: 'Invalid session' });
    }
    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Session already completed' });
    }

    const now = new Date();
    const timeTaken = Math.round((now - new Date(session.startedAt)) / 1000);
    const isLateSubmission = session.exam.endTime ? now > new Date(session.exam.endTime) : false;

    // Clear previous answers (from auto-save)
    await prisma.studentAnswer.deleteMany({ where: { sessionId } });

    // Get all exam questions with correct answers
    const examQuestions = await prisma.examQuestion.findMany({
      where: { examId: session.examId },
      include: {
        question: { include: { options: true } }
      },
      orderBy: { orderIndex: 'asc' }
    });

    const random = getSeededRandom(session.id);
    if (session.exam.config?.randomQuestions) {
      examQuestions.sort(() => random() - 0.5);
    }

    let lastAnsweredIndex = -1;
    for (let i = 0; i < examQuestions.length; i++) {
      const q = examQuestions[i].question;
      const rawAnswer = answers ? answers[q.id] : undefined;
      let hasValidAnswer = false;

      if (rawAnswer) {
        if (typeof rawAnswer === 'object' && !Array.isArray(rawAnswer)) {
          hasValidAnswer = !!(rawAnswer.selectedOptionId || rawAnswer.answer || (rawAnswer.textAnswer && rawAnswer.textAnswer.trim()));
        } else if (typeof rawAnswer === 'string') {
          hasValidAnswer = !!rawAnswer.trim();
        }
      }

      if (hasValidAnswer) {
        if (i > lastAnsweredIndex + 1) {
          return res.status(400).json({ error: 'Sequential navigation violation. You skipped a question.' });
        }
        lastAnsweredIndex = i;
      }
    }

    if (!forced && lastAnsweredIndex !== examQuestions.length - 1) {
      return res.status(400).json({ error: 'You must answer all questions sequentially before submitting.' });
    }

    let objectiveMarks = 0;
    let descriptiveMarks = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let attemptedCount = 0;
    let pendingDescriptive = 0;
    const totalQuestions = examQuestions.length;

    // Process each question — store EVERYTHING submitted
    for (const eq of examQuestions) {
      const question = eq.question;
      // answers can be: { questionId: optionId } (legacy)
      // or: { questionId: { selectedOptionId, textAnswer, timeSpent, markedForReview, visited } } (enhanced)
      const rawAnswer = answers ? answers[question.id] : undefined;

      // Parse enhanced or legacy format
      let selectedOptionId = null;
      let textAnswer = null;
      let questionTimeSpent = 0;
      let questionMarkedForReview = false;
      let questionVisited = false;

      if (rawAnswer && typeof rawAnswer === 'object' && !Array.isArray(rawAnswer)) {
        // Enhanced format
        selectedOptionId = rawAnswer.selectedOptionId || rawAnswer.answer || null;
        textAnswer = rawAnswer.textAnswer || null;
        questionTimeSpent = rawAnswer.timeSpent || 0;
        questionMarkedForReview = rawAnswer.markedForReview || false;
        questionVisited = rawAnswer.visited !== undefined ? rawAnswer.visited : true;
      } else if (rawAnswer && typeof rawAnswer === 'string') {
        // Legacy format: answer is an option ID
        selectedOptionId = rawAnswer;
        questionVisited = true;
      }

      const isDescriptive = ['SHORT_ANSWER', 'LONG_ANSWER', 'ESSAY', 'THEORY'].includes(question.type);
      const isObjective = isObjectiveType(question.type);

      // No answer provided at all
      if (!selectedOptionId && !textAnswer) {
        await prisma.studentAnswer.create({
          data: {
            sessionId, studentId, questionId: question.id,
            marksObtained: 0,
            timeSpent: questionTimeSpent,
            markedForReview: questionMarkedForReview,
            visited: questionVisited,
            evaluationStatus: isObjective ? 'EVALUATED' : 'PENDING',
            isEvaluated: isObjective,
          }
        });
        if (isDescriptive) pendingDescriptive++;
        continue;
      }

      attemptedCount++;

      if (isObjective && selectedOptionId) {
        // Auto-evaluate objective questions
        const selectedOption = question.options.find(o => o.id === selectedOptionId);
        const isCorrect = selectedOption ? selectedOption.isCorrect : false;
        const marks = isCorrect ? question.marks : (question.negativeMarks > 0 ? -question.negativeMarks : 0);
        objectiveMarks += marks;
        if (isCorrect) correctCount++;
        else incorrectCount++;

        await prisma.studentAnswer.create({
          data: {
            sessionId, studentId, questionId: question.id,
            marksObtained: marks,
            isCorrect,
            textAnswer,
            timeSpent: questionTimeSpent,
            markedForReview: questionMarkedForReview,
            visited: questionVisited,
            evaluationStatus: 'EVALUATED',
            isEvaluated: true,
            selectedOptions: selectedOption ? { connect: { id: selectedOption.id } } : undefined,
          }
        });
      } else if (isDescriptive) {
        // Descriptive: store answer, mark as PENDING for faculty evaluation
        pendingDescriptive++;
        await prisma.studentAnswer.create({
          data: {
            sessionId, studentId, questionId: question.id,
            textAnswer: textAnswer || selectedOptionId, // store whatever text was typed
            marksObtained: null, // faculty will assign marks
            timeSpent: questionTimeSpent,
            markedForReview: questionMarkedForReview,
            visited: questionVisited,
            evaluationStatus: 'PENDING',
            isEvaluated: false,
          }
        });
      } else {
        // Fallback: treat as objective
        const selectedOption = question.options.find(o => o.id === selectedOptionId);
        const isCorrect = selectedOption ? selectedOption.isCorrect : false;
        const marks = isCorrect ? question.marks : (question.negativeMarks > 0 ? -question.negativeMarks : 0);
        objectiveMarks += marks;
        if (isCorrect) correctCount++;
        else incorrectCount++;

        await prisma.studentAnswer.create({
          data: {
            sessionId, studentId, questionId: question.id,
            marksObtained: marks,
            isCorrect,
            textAnswer,
            timeSpent: questionTimeSpent,
            markedForReview: questionMarkedForReview,
            visited: questionVisited,
            evaluationStatus: 'EVALUATED',
            isEvaluated: true,
            selectedOptions: selectedOption ? { connect: { id: selectedOption.id } } : undefined,
          }
        });
      }
    }

    // Ensure objectiveMarks is not negative
    objectiveMarks = Math.max(0, objectiveMarks);

    const unansweredQuestions = totalQuestions - attemptedCount;
    const obtainedMarks = objectiveMarks + descriptiveMarks;
    const percentage = session.exam.totalMarks > 0 ? (obtainedMarks / session.exam.totalMarks) * 100 : 0;

    // Calculate grade (provisional — may change after descriptive evaluation)
    const gradeInfo = await calculateGrade(percentage);

    // Update session
    await prisma.examSession.update({
      where: { id: sessionId },
      data: {
        status: forced ? 'AUTO_SUBMITTED' : 'SUBMITTED',
        endTime: now,
        submittedAt: now,
        timeTaken,
        submissionType: forced ? 'AUTO_SUBMIT' : 'MANUAL',
        isLateSubmission,
        warningCount: warningCount || session.warningCount || 0,
        fullscreenViolations: fullscreenViolations || session.fullscreenViolations || 0,
        networkDisconnects: networkDisconnects || session.networkDisconnects || 0,
        totalMarks: session.exam.totalMarks,
        obtainedMarks,
        objectiveMarks,
        percentage,
        browser: req.headers['user-agent'],
        ipAddress: req.ip,
      }
    });

    // Create result — UNPUBLISHED by default
    // Faculty must explicitly publish results for students to see marks
    const result = await prisma.result.create({
      data: {
        examId: session.examId,
        studentId,
        sessionId,
        marksObtained: obtainedMarks,
        totalMarks: session.exam.totalMarks,
        objectiveMarks,
        percentage,
        isPass: gradeInfo.isPass,
        grade: gradeInfo.grade,
        status: pendingDescriptive > 0 ? 'PENDING_EVALUATION' : 'EVALUATED',
        published: (session.exam.config?.showResultMode === 'immediately' && pendingDescriptive === 0) ? true : false,
        publishedAt: (session.exam.config?.showResultMode === 'immediately' && pendingDescriptive === 0) ? new Date() : null,
        totalQuestions,
        attemptedQuestions: attemptedCount,
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        unansweredQuestions,
      }
    });

    // Activity log
    await prisma.activityLog.create({
      data: {
        userId: studentId, role: 'STUDENT', examId: session.examId, sessionId,
        action: forced ? 'AUTO_SUBMITTED' : 'EXAM_SUBMITTED',
        details: `Submitted. Objective: ${objectiveMarks}/${session.exam.totalMarks}. Pending descriptive: ${pendingDescriptive}.`,
        ipAddress: req.ip, browser: req.headers['user-agent']
      }
    });

    // Notification to student — no marks revealed
    await prisma.notification.create({
      data: {
        userId: studentId,
        examId: session.examId,
        type: 'SUBMISSION_RECEIVED',
        title: 'Exam Submitted Successfully',
        message: `Your submission for "${session.exam.title}" has been received. Results will be available after faculty evaluation and publication.`
      }
    });

    // Notification to faculty
    await prisma.notification.create({
      data: {
        userId: session.exam.facultyAssignment.facultyId,
        examId: session.examId,
        type: pendingDescriptive > 0 ? 'EVALUATION_PENDING' : 'SUBMISSION_RECEIVED',
        title: 'Student Submission',
        message: `${session.student.name} (${session.student.registerNumber}) has submitted "${session.exam.title}". ${pendingDescriptive > 0 ? pendingDescriptive + ' descriptive answers need evaluation.' : 'Auto-evaluation complete.'}`
      }
    });

    // Socket.IO notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${studentId}`).emit('notification', {
        type: 'SUBMISSION_RECEIVED',
        title: 'Exam Submitted',
        message: `Your submission for "${session.exam.title}" has been received. Results are under evaluation.`
      });
    }

    // Response — do NOT include marks/percentage/grade
    res.json({
      success: true,
      message: 'Exam submitted successfully. Results will be available after faculty publishes them.',
      examTitle: session.exam.title,
    });
  } catch (error) {
    console.error('Submit exam error [CRITICAL]:', {
      error: error,
      message: error.message,
      stack: error.stack,
      prismaCode: error.code,
      prismaMeta: error.meta,
      sessionId: req.params.sessionId,
      studentId: req.user?.id,
    });
    res.status(500).json({ 
      error: 'Submission failed', 
      details: error.message,
      prismaCode: error.code 
    });
  }
};

// ============================================================================
// AUTO SAVE
// ============================================================================
const autoSaveSchema = z.object({
  answers: z.record(z.string(), z.any().nullable())
});

exports.autoSaveExam = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const studentId = req.user.id;
    const parsed = autoSaveSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid data format' });

    const { answers } = parsed.data;

    const session = await prisma.examSession.findUnique({ where: { id: sessionId }, include: { exam: { include: { config: true } } } });
    if (!session || session.studentId !== studentId || session.status !== 'IN_PROGRESS') {
      return res.status(403).json({ error: 'Invalid or inactive session' });
    }

    const examQuestions = await prisma.examQuestion.findMany({
      where: { examId: session.examId },
      orderBy: { orderIndex: 'asc' }
    });
    
    const random = getSeededRandom(session.id);
    if (session.exam.config?.randomQuestions) {
      examQuestions.sort(() => random() - 0.5);
    }

    let lastAnsweredIndex = -1;
    for (let i = 0; i < examQuestions.length; i++) {
      const qId = examQuestions[i].questionId;
      const rawAnswer = answers ? answers[qId] : undefined;
      let hasValidAnswer = false;

      if (rawAnswer) {
        if (typeof rawAnswer === 'object' && !Array.isArray(rawAnswer)) {
          hasValidAnswer = !!(rawAnswer.selectedOptionId || rawAnswer.answer || (rawAnswer.textAnswer && rawAnswer.textAnswer.trim()));
        } else if (typeof rawAnswer === 'string') {
          hasValidAnswer = !!rawAnswer.trim();
        }
      }

      if (hasValidAnswer) {
        if (i > lastAnsweredIndex + 1) {
          return res.status(400).json({ error: 'Sequential navigation violation. You skipped a question.' });
        }
        lastAnsweredIndex = i;
      }
    }

    await prisma.studentAnswer.deleteMany({ where: { sessionId } });

    for (const [qId, rawAnswer] of Object.entries(answers)) {
      if (!rawAnswer) continue;

      let selectedOptionId = null;
      let textAnswer = null;
      let questionTimeSpent = 0;
      let questionMarkedForReview = false;
      let questionVisited = false;

      if (typeof rawAnswer === 'object' && !Array.isArray(rawAnswer)) {
        selectedOptionId = rawAnswer.selectedOptionId || rawAnswer.answer || null;
        textAnswer = rawAnswer.textAnswer || null;
        questionTimeSpent = rawAnswer.timeSpent || 0;
        questionMarkedForReview = rawAnswer.markedForReview || false;
        questionVisited = rawAnswer.visited !== undefined ? rawAnswer.visited : true;
      } else if (typeof rawAnswer === 'string') {
        selectedOptionId = rawAnswer;
        questionVisited = true;
      }

      await prisma.studentAnswer.create({
        data: {
          sessionId,
          studentId,
          questionId: qId,
          textAnswer,
          timeSpent: questionTimeSpent,
          markedForReview: questionMarkedForReview,
          visited: questionVisited,
          evaluationStatus: 'PENDING',
          isEvaluated: false,
          selectedOptions: selectedOptionId ? { connect: { id: selectedOptionId } } : undefined
        }
      });
    }

    // Update lastSavedAt
    await prisma.examSession.update({
      where: { id: sessionId },
      data: { lastSavedAt: new Date() }
    });

    res.json({ success: true, message: 'Auto-saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// LOG ACTIVITY
// ============================================================================
const logActivitySchema = z.object({
  action: z.string(),
  details: z.string().optional(),
  type: z.string().optional()
});

exports.logActivity = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const studentId = req.user.id;
    const parsed = logActivitySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid data format' });

    const { action, details, type } = parsed.data;

    const session = await prisma.examSession.findUnique({ where: { id: sessionId } });
    if (!session || session.studentId !== studentId) {
      return res.status(403).json({ error: 'Invalid session' });
    }

    if (action === 'WARNING') {
      await prisma.warning.create({
        data: { sessionId, studentId, type: type || 'GENERAL', message: details || 'Warning issued' }
      });

      // Increment warning counters on session
      const updateData = {};
      if (type === 'FULLSCREEN_EXIT' || type === 'Exited Full Screen' || type === 'Not in Full Screen') {
        updateData.fullscreenViolations = { increment: 1 };
      } else if (type === 'NETWORK_DISCONNECT') {
        updateData.networkDisconnects = { increment: 1 };
      }
      updateData.warningCount = { increment: 1 };

      await prisma.examSession.update({
        where: { id: sessionId },
        data: updateData
      });
    }

    await prisma.activityLog.create({
      data: {
        userId: studentId, role: 'STUDENT', sessionId, examId: session.examId, action, details,
        ipAddress: req.ip, browser: req.headers['user-agent']
      }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// NOTIFICATIONS
// ============================================================================
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ============================================================================
// PROFILE
// ============================================================================
exports.getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, name: true, email: true, register_no: true, phone: true, departmentId: true,
        department: true,
        assignments: {
          where: { status: 'ACTIVE' },
          include: {
            assignment: {
              include: {
                subject: true,
                assessmentType: true,
                academicYear: true,
                faculty: { select: { name: true } }
              }
            }
          }
        }
      }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

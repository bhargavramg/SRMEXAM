const prisma = require('../utils/db');
const { z } = require('zod');

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
    const studentId = req.user.id;
    const now = new Date();

    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { studentId, status: 'ACTIVE' },
      include: {
        course: { include: { department: true } },
        semester: true,
        section: true,
        academicYear: true
      }
    });

    if (!enrollment) {
      return res.json({
        stats: { completedExams: 0, avgScore: 0, upcomingExams: 0, activeExams: 0 },
        activeExams: [],
        upcomingExams: [],
        enrollment: null,
        user: { name: req.user.name || '', email: req.user.email || '' }
      });
    }

    const assignmentIds = (await prisma.facultyAssignment.findMany({
      where: {
        sectionId: enrollment.sectionId,
        academicYearId: enrollment.academicYearId,
        status: 'ACTIVE'
      },
      select: { id: true }
    })).map(a => a.id);

    const results = await prisma.result.findMany({
      where: { studentId, published: true }
    });
    const completedExamsCount = results.length;
    const avgScore = completedExamsCount > 0
      ? (results.reduce((acc, curr) => acc + curr.percentage, 0) / completedExamsCount).toFixed(1)
      : 0;

    const activeExams = await prisma.exam.findMany({
      where: {
        facultyAssignmentId: { in: assignmentIds },
        status: 'PUBLISHED',
        startTime: { lte: now },
        endTime: { gte: now }
      },
      include: {
        facultyAssignment: {
          include: { subject: true, section: true, faculty: { select: { name: true } } }
        },
        config: true
      }
    });

    // Filter out exams the student already submitted
    const submittedSessionExamIds = (await prisma.examSession.findMany({
      where: { studentId, status: { in: ['SUBMITTED', 'AUTO_SUBMITTED'] } },
      select: { examId: true }
    })).map(s => s.examId);

    const filteredActiveExams = activeExams.filter(e => !submittedSessionExamIds.includes(e.id));

    const upcomingExams = await prisma.exam.findMany({
      where: {
        facultyAssignmentId: { in: assignmentIds },
        status: 'PUBLISHED',
        startTime: { gt: now }
      },
      include: {
        facultyAssignment: {
          include: { subject: true, section: true, faculty: { select: { name: true } } }
        }
      },
      orderBy: { startTime: 'asc' }
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
        completedExams: completedExamsCount,
        avgScore,
        upcomingExams: upcomingExams.length,
        activeExams: filteredActiveExams.length
      },
      activeExams: filteredActiveExams,
      upcomingExams,
      enrollment,
      notifications,
      user
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// EXAM LISTING ENDPOINTS
// ============================================================================
async function getStudentAssignmentIds(studentId) {
  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId, status: 'ACTIVE' }
  });
  if (!enrollment) return [];

  return (await prisma.facultyAssignment.findMany({
    where: {
      sectionId: enrollment.sectionId,
      academicYearId: enrollment.academicYearId,
      status: 'ACTIVE'
    },
    select: { id: true }
  })).map(a => a.id);
}

exports.getUpcomingExams = async (req, res) => {
  try {
    const assignmentIds = await getStudentAssignmentIds(req.user.id);
    const exams = await prisma.exam.findMany({
      where: {
        facultyAssignmentId: { in: assignmentIds },
        status: 'PUBLISHED',
        startTime: { gt: new Date() }
      },
      include: {
        facultyAssignment: { include: { subject: true, section: true, faculty: { select: { name: true } } } },
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
    const now = new Date();
    const assignmentIds = await getStudentAssignmentIds(req.user.id);
    const exams = await prisma.exam.findMany({
      where: {
        facultyAssignmentId: { in: assignmentIds },
        status: 'PUBLISHED',
        startTime: { lte: now },
        endTime: { gte: now }
      },
      include: {
        facultyAssignment: { include: { subject: true, section: true, faculty: { select: { name: true } } } },
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
    const assignmentIds = await getStudentAssignmentIds(req.user.id);
    const exams = await prisma.exam.findMany({
      where: {
        facultyAssignmentId: { in: assignmentIds },
        OR: [
          { status: 'COMPLETED' },
          { status: 'RESULTS_PUBLISHED' },
          { endTime: { lt: new Date() } }
        ]
      },
      include: {
        facultyAssignment: { include: { subject: true, section: true } },
        results: { where: { studentId: req.user.id } }
      },
      orderBy: { endTime: 'desc' }
    });
    res.json(exams);
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
            facultyAssignment: {
              include: {
                subject: true,
                section: { include: { semester: true } },
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
        section: r.exam.facultyAssignment.section.name,
        semester: r.exam.facultyAssignment.section.semester.semesterNumber,
        status: r.status,
        published: r.published,
        createdAt: r.createdAt,
      };

      if (r.published) {
        return {
          ...base,
          totalMarks: r.totalMarks,
          marksObtained: r.marksObtained,
          objectiveMarks: r.objectiveMarks,
          descriptiveMarks: r.descriptiveMarks,
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

      // Unpublished: show provisional objective score
      return {
        ...base,
        totalMarks: r.totalMarks,
        objectiveMarks: r.objectiveMarks,
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
    const { id } = req.params;
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        facultyAssignment: {
          include: { subject: true, section: { include: { semester: { include: { course: true } } } }, faculty: { select: { name: true } } }
        },
        config: true
      }
    });

    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    const assignmentIds = await getStudentAssignmentIds(req.user.id);
    if (!assignmentIds.includes(exam.facultyAssignmentId)) {
      return res.status(403).json({ error: 'You are not eligible for this exam' });
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

    const assignmentIds = await getStudentAssignmentIds(studentId);
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { config: true }
    });
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    if (!assignmentIds.includes(exam.facultyAssignmentId)) {
      return res.status(403).json({ error: 'You are not eligible for this exam' });
    }

    const now = new Date();
    if (exam.status !== 'PUBLISHED' || !exam.startTime || !exam.endTime || now < exam.startTime || now > exam.endTime) {
      return res.status(400).json({ error: 'This exam is not currently active' });
    }

    let session = await prisma.examSession.findFirst({
      where: { examId, studentId, status: 'IN_PROGRESS' }
    });

    if (!session) {
      const submitted = await prisma.examSession.findFirst({
        where: { examId, studentId, status: { in: ['SUBMITTED', 'AUTO_SUBMITTED'] } }
      });
      if (submitted) {
        return res.status(400).json({ error: 'You have already submitted this exam' });
      }

      // Count previous attempts
      const previousAttempts = await prisma.examSession.count({
        where: { examId, studentId }
      });

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

      await prisma.activityLog.create({
        data: {
          userId: studentId, role: 'STUDENT', examId, sessionId: session.id,
          action: 'EXAM_STARTED',
          details: `Student started exam attempt #${session.attemptNumber}`,
          ipAddress: req.ip, browser: req.headers['user-agent']
        }
      });
    }

    res.json(session);
  } catch (error) {
    console.error('Start exam error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

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

    if (session.exam.config?.randomQuestions) {
      questionsList.sort(() => Math.random() - 0.5);
    }
    if (session.exam.config?.randomOptions) {
      questionsList.forEach(q => {
        if (q.options) q.options.sort(() => Math.random() - 0.5);
      });
    }

    res.json({ questions: questionsList });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// SUBMIT EXAM — Full auto-evaluation
// ============================================================================
exports.submitExam = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answers, forced, warningCount, fullscreenViolations, networkDisconnects } = req.body;
    const studentId = req.user.id;

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: { exam: true }
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

    // Clear previous answers
    await prisma.studentAnswer.deleteMany({ where: { sessionId } });

    // Get all exam questions with correct answers
    const examQuestions = await prisma.examQuestion.findMany({
      where: { examId: session.examId },
      include: {
        question: { include: { options: true } }
      }
    });

    const questionMap = {};
    examQuestions.forEach(eq => { questionMap[eq.question.id] = eq.question; });

    let objectiveMarks = 0;
    let totalObjectiveMax = 0;
    let totalDescriptiveMax = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let attemptedCount = 0;
    const totalQuestions = examQuestions.length;
    const pendingDescriptive = [];

    // Process each question
    for (const eq of examQuestions) {
      const question = eq.question;
      const answer = answers ? answers[question.id] : undefined;

      if (isObjectiveType(question.type)) {
        totalObjectiveMax += question.marks;
      } else {
        totalDescriptiveMax += question.marks;
      }

      // No answer provided
      if (!answer && answer !== '') {
        await prisma.studentAnswer.create({
          data: {
            sessionId, studentId, questionId: question.id,
            marksObtained: 0,
            isCorrect: null,
            evaluationStatus: isObjectiveType(question.type) ? 'AUTO_EVALUATED' : 'PENDING',
            isEvaluated: isObjectiveType(question.type),
          }
        });
        if (!isObjectiveType(question.type)) {
          pendingDescriptive.push(question.id);
        }
        continue;
      }

      attemptedCount++;

      if (question.type === 'MCQ' || question.type === 'TRUE_FALSE') {
        // answer is an option ID
        const selectedOption = question.options.find(o => o.id === answer);
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
            isEvaluated: true,
            evaluationStatus: 'AUTO_EVALUATED',
            selectedOptions: selectedOption ? { connect: { id: selectedOption.id } } : undefined
          }
        });
      } else if (question.type === 'MULTIPLE_CORRECT') {
        // answer is an array of option IDs
        const selectedIds = Array.isArray(answer) ? answer : [answer];
        const correctIds = question.options.filter(o => o.isCorrect).map(o => o.id);
        const isCorrect = selectedIds.length === correctIds.length && selectedIds.every(id => correctIds.includes(id));
        const marks = isCorrect ? question.marks : (question.negativeMarks > 0 ? -question.negativeMarks : 0);
        objectiveMarks += marks;
        if (isCorrect) correctCount++;
        else incorrectCount++;

        await prisma.studentAnswer.create({
          data: {
            sessionId, studentId, questionId: question.id,
            marksObtained: marks,
            isCorrect,
            isEvaluated: true,
            evaluationStatus: 'AUTO_EVALUATED',
            selectedOptions: { connect: selectedIds.map(id => ({ id })) }
          }
        });
      } else if (question.type === 'FILL_IN_BLANK') {
        // answer is text, compare with correct option text
        const correctOption = question.options.find(o => o.isCorrect);
        const isCorrect = correctOption && typeof answer === 'string' && 
          answer.trim().toLowerCase() === correctOption.text.trim().toLowerCase();
        const marks = isCorrect ? question.marks : (question.negativeMarks > 0 ? -question.negativeMarks : 0);
        objectiveMarks += marks;
        if (isCorrect) correctCount++;
        else incorrectCount++;

        await prisma.studentAnswer.create({
          data: {
            sessionId, studentId, questionId: question.id,
            textResponse: typeof answer === 'string' ? answer : String(answer),
            marksObtained: marks,
            isCorrect,
            isEvaluated: true,
            evaluationStatus: 'AUTO_EVALUATED',
          }
        });
      } else {
        // Descriptive: SHORT_ANSWER, LONG_ANSWER, CODING, FILE_UPLOAD
        pendingDescriptive.push(question.id);
        await prisma.studentAnswer.create({
          data: {
            sessionId, studentId, questionId: question.id,
            textResponse: typeof answer === 'string' ? answer : (answer?.text || null),
            fileUrl: answer?.fileUrl || null,
            marksObtained: null,
            isCorrect: null,
            isEvaluated: false,
            evaluationStatus: 'PENDING',
          }
        });
      }
    }

    // Ensure objectiveMarks is not negative
    objectiveMarks = Math.max(0, objectiveMarks);

    const unansweredQuestions = totalQuestions - attemptedCount;
    const obtainedMarks = objectiveMarks; // descriptive not yet graded
    const percentage = session.exam.totalMarks > 0 ? (obtainedMarks / session.exam.totalMarks) * 100 : 0;
    const hasPendingDescriptive = pendingDescriptive.length > 0;

    // Determine result status
    let resultStatus;
    if (hasPendingDescriptive) {
      resultStatus = 'PENDING_EVALUATION';
    } else {
      resultStatus = 'AUTO_EVALUATED';
    }

    // Calculate grade (provisional if has pending descriptive)
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
        descriptiveMarks: 0,
        percentage,
        browser: req.headers['user-agent'],
        ipAddress: req.ip,
      }
    });

    // Create result
    const result = await prisma.result.create({
      data: {
        examId: session.examId,
        studentId,
        sessionId,
        marksObtained: obtainedMarks,
        totalMarks: session.exam.totalMarks,
        objectiveMarks,
        descriptiveMarks: 0,
        percentage,
        isPass: hasPendingDescriptive ? false : gradeInfo.isPass,
        grade: hasPendingDescriptive ? null : gradeInfo.grade,
        status: resultStatus,
        published: false,
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
        details: `Score: ${obtainedMarks}/${session.exam.totalMarks} (${percentage.toFixed(1)}%). ${hasPendingDescriptive ? pendingDescriptive.length + ' questions pending evaluation.' : 'Fully auto-evaluated.'}`,
        ipAddress: req.ip, browser: req.headers['user-agent']
      }
    });

    // Notification to student
    await prisma.notification.create({
      data: {
        userId: studentId,
        examId: session.examId,
        type: 'SUBMISSION_RECEIVED',
        title: 'Exam Submitted Successfully',
        message: `Your submission for "${session.exam.title}" has been received. ${hasPendingDescriptive ? 'Descriptive answers are pending faculty evaluation.' : 'All answers have been auto-evaluated.'}`
      }
    });

    // Socket.IO notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${studentId}`).emit('notification', {
        type: 'SUBMISSION_RECEIVED',
        title: 'Exam Submitted',
        message: `Your submission for "${session.exam.title}" has been received.`
      });
    }

    res.json({
      success: true,
      result,
      totalMarks: obtainedMarks,
      objectiveMarks,
      hasPendingDescriptive,
      pendingCount: pendingDescriptive.length,
      totalQuestions,
      attemptedQuestions: attemptedCount,
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
    });
  } catch (error) {
    console.error('Submit exam error:', error);
    res.status(500).json({ error: 'Internal server error' });
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

    const session = await prisma.examSession.findUnique({ where: { id: sessionId } });
    if (!session || session.studentId !== studentId || session.status !== 'IN_PROGRESS') {
      return res.status(403).json({ error: 'Invalid or inactive session' });
    }

    await prisma.studentAnswer.deleteMany({ where: { sessionId } });

    for (const [qId, optId] of Object.entries(answers)) {
      if (optId) {
        await prisma.studentAnswer.create({
          data: { sessionId, studentId, questionId: qId, selectedOptions: typeof optId === 'string' ? { connect: { id: optId } } : undefined, textResponse: typeof optId !== 'string' ? JSON.stringify(optId) : undefined }
        });
      }
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
        enrollments: {
          where: { status: 'ACTIVE' },
          include: {
            course: true,
            semester: { include: { academicYear: true } },
            section: true,
            academicYear: true
          }
        }
      }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

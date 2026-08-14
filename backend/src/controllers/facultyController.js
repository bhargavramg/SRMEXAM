const prisma = require('../utils/db');
const bcrypt = require('bcryptjs');

// ============================================================================
// GRADE CALCULATION HELPER
// ============================================================================
async function calculateGrade(percentage) {
  const boundaries = await prisma.gradeBoundary.findMany({
    orderBy: { minPercentage: 'desc' }
  });
  
  if (boundaries.length === 0) {
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

// Helper: get faculty's assignment IDs
async function getFacultyAssignmentIds(facultyId) {
  return (await prisma.facultyAssignment.findMany({
    where: { facultyId },
    select: { id: true }
  })).map(a => a.id);
}

// ============================================================================
// FACULTY DASHBOARD
// ============================================================================
const { updateGlobalExamStatuses } = require('../utils/examLifecycle');

exports.getDashboardData = async (req, res) => {
  try {
    await updateGlobalExamStatuses();
    const facultyId = req.user.id;
    const now = new Date();

    const assignments = await prisma.facultyAssignment.findMany({
      where: { facultyId, status: 'ACTIVE' },
      include: {
        subject: true,
        assessmentType: true,
        academicYear: true
      }
    });
    const assignmentIds = assignments.map(a => a.id);

    const upcomingExamsCount = await prisma.exam.count({
      where: { facultyAssignmentId: { in: assignmentIds }, status: 'SCHEDULED' }
    });

    const activeExamsCount = await prisma.exam.count({
      where: { facultyAssignmentId: { in: assignmentIds }, status: 'ACTIVE' }
    });

    const pendingEvals = await prisma.exam.count({
      where: { facultyAssignmentId: { in: assignmentIds }, status: 'EVALUATION' }
    });

    const publishedResults = await prisma.exam.count({
      where: { facultyAssignmentId: { in: assignmentIds }, status: 'CLOSED' }
    });

    const totalStudents = await prisma.assignmentStudent.count({
      where: { assignmentId: { in: assignmentIds }, status: 'ACTIVE' }
    });

    const recentActivity = await prisma.activityLog.findMany({
      where: { exam: { facultyAssignmentId: { in: assignmentIds } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: { select: { name: true, register_no: true } },
        exam: { select: { title: true } }
      }
    });

    res.json({
      stats: {
        totalAssignments: assignments.length,
        totalStudents,
        upcomingExams: upcomingExamsCount,
        activeExams: activeExamsCount,
        pendingEvaluations: pendingEvals,
        publishedResults
      },
      assignments,
      recentActivity
    });
  } catch (error) {
    console.error('Faculty dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// MY ASSIGNMENTS
// ============================================================================
exports.getMyAssignments = async (req, res) => {
  try {
    const assignments = await prisma.facultyAssignment.findMany({
      where: { facultyId: req.user.id, status: 'ACTIVE' },
      include: {
        subject: { include: { department: true } },
        academicYear: true,
        _count: { select: { exams: true } }
      }
    });
    res.json(assignments);
  } catch (error) {
    console.error('getMyAssignments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// EXAM MANAGEMENT
// ============================================================================
exports.getExams = async (req, res) => {
  try {
    const assignmentIds = await getFacultyAssignmentIds(req.user.id);

    const exams = await prisma.exam.findMany({
      where: { facultyAssignmentId: { in: assignmentIds } },
      include: {
        facultyAssignment: {
          include: {
            subject: true,
            
          }
        },
        config: true,
        _count: { select: { examQuestions: true, sessions: true, results: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(exams);
  } catch (error) {
    console.error('getExams error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getExam = async (req, res) => {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: req.params.id },
      include: {
        facultyAssignment: {
          include: {
            subject: true,
            
          }
        },
        config: true,
        examQuestions: { include: { question: { include: { options: true, category: true } } }, orderBy: { orderIndex: 'asc' } }
      }
    });

    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    if (exam.facultyAssignment.facultyId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(exam);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createExam = async (req, res) => {
  try {
    const { title, facultyAssignmentId, durationMins, passingMarks, totalMarks, instructions, questionIds, config, startTime, endTime, assignedStudentIds } = req.body;

    const assignment = await prisma.facultyAssignment.findUnique({ where: { id: facultyAssignmentId } });
    if (!assignment || assignment.facultyId !== req.user.id) {
      return res.status(403).json({ error: 'You are not assigned to this subject' });
    }

    let studentIdsToAssign = assignedStudentIds || [];
    if (studentIdsToAssign.length === 0) {
      const allAssigned = await prisma.assignmentStudent.findMany({ where: { assignmentId: facultyAssignmentId, status: 'ACTIVE' } });
      studentIdsToAssign = allAssigned.map(a => a.studentId);
    }

    const exam = await prisma.exam.create({
      data: {
        title,
        facultyAssignmentId,
        durationMins: parseInt(durationMins, 10),
        passingMarks: parseFloat(passingMarks),
        totalMarks: parseFloat(totalMarks),
        instructions,
        status: 'DRAFT',
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        examQuestions: questionIds ? {
          create: questionIds.map((qId, idx) => ({ questionId: qId, orderIndex: idx + 1 }))
        } : undefined,
        config: config ? { create: config } : { create: {} },
        examStudents: {
          create: studentIdsToAssign.map(studentId => ({ studentId, assignedBy: req.user.id }))
        }
      },
      include: {
        facultyAssignment: { include: { subject: true,  } },
        config: true,
        _count: { select: { examQuestions: true } }
      }
    });

    res.status(201).json(exam);
  } catch (error) {
    console.error('createExam error:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.updateExam = async (req, res) => {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: req.params.id },
      include: { facultyAssignment: true }
    });
    if (!exam || exam.facultyAssignment.facultyId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { config, questionIds, startTime, endTime, ...examData } = req.body;
    if (startTime) examData.startTime = new Date(startTime);
    if (endTime) examData.endTime = new Date(endTime);
    if (examData.durationMins !== undefined) examData.durationMins = parseInt(examData.durationMins, 10);
    if (examData.passingMarks !== undefined) examData.passingMarks = parseFloat(examData.passingMarks);
    if (examData.totalMarks !== undefined) examData.totalMarks = parseFloat(examData.totalMarks);

    const updated = await prisma.exam.update({
      where: { id: req.params.id },
      data: examData
    });

    if (config) {
      await prisma.examConfiguration.upsert({
        where: { examId: req.params.id },
        update: config,
        create: { examId: req.params.id, ...config }
      });
    }

    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteExam = async (req, res) => {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: req.params.id },
      include: { facultyAssignment: true }
    });
    if (!exam || exam.facultyAssignment.facultyId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (exam.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Cannot delete an exam once it has been published or scheduled' });
    }

    await prisma.exam.delete({ where: { id: req.params.id } });
    res.json({ message: 'Exam deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ============================================================================
// PUBLISH EXAM
// ============================================================================
exports.publishExam = async (req, res) => {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: req.params.id },
      include: {
        facultyAssignment: {
          include: {
            
            subject: true
          }
        }
      }
    });

    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    if (exam.facultyAssignment.facultyId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { startTime, endTime } = req.body;
    
    const finalStartTime = startTime ? new Date(startTime) : exam.startTime;
    const finalEndTime = endTime ? new Date(endTime) : exam.endTime;
    const now = new Date();
    
    let newStatus = 'SCHEDULED';
    if (finalStartTime && finalStartTime <= now) {
      newStatus = 'ACTIVE';
    }
    if (finalEndTime && finalEndTime <= now) {
      newStatus = 'COMPLETED';
    }

    const updatedExam = await prisma.exam.update({
      where: { id: req.params.id },
      data: {
        status: newStatus,
        startTime: finalStartTime,
        endTime: finalEndTime
      }
    });

    const examStudents = await prisma.examStudent.findMany({
      where: { examId: exam.id },
      select: { studentId: true }
    });

    if (examStudents.length > 0) {
      await prisma.notification.createMany({
        data: examStudents.map(es => ({
          userId: es.studentId,
          examId: exam.id,
          type: 'EXAM_PUBLISHED',
          title: 'New Exam Published',
          message: `${exam.title} for ${exam.facultyAssignment.subject.name} has been published. Duration: ${exam.durationMins} minutes.`
        }))
      });

      const io = req.app.get('io');
      if (io) {
        examStudents.forEach(es => {
          io.to(`user_${es.studentId}`).emit('notification', {
            type: 'EXAM_PUBLISHED',
            title: 'New Exam Published',
            message: `${exam.title} has been published`,
            examId: exam.id
          });
        });
      }
    }

    res.json({ ...updatedExam, notifiedStudents: examStudents.length });
  } catch (error) {
    console.error('publishExam error:', error);
    res.status(400).json({ error: error.message });
  }
};

// ============================================================================
// QUESTION MANAGEMENT
// ============================================================================
exports.getQuestions = async (req, res) => {
  try {
    const assignedSubjectIds = (await prisma.facultyAssignment.findMany({
      where: { facultyId: req.user.id },
      select: { subjectId: true }
    })).map(a => a.subjectId);

    const questions = await prisma.question.findMany({
      where: { bank: { subjectId: { in: assignedSubjectIds } } },
      include: {
        bank: { include: { subject: true } },
        category: true,
        options: true,
        tags: { include: { tag: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createQuestion = async (req, res) => {
  try {
    const { bankId, type, text, marks, negativeMarks, difficulty, categoryId, explanation, bloomsLevel, estimatedTime, options, tags } = req.body;

    const question = await prisma.question.create({
      data: {
        bankId, type, text, marks, negativeMarks, difficulty, categoryId, explanation, bloomsLevel, estimatedTime,
        options: options ? { create: options } : undefined,
        tags: tags ? { create: tags.map(tagId => ({ tagId })) } : undefined
      },
      include: { options: true, tags: { include: { tag: true } }, category: true }
    });
    res.status(201).json(question);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const { options, tags, ...questionData } = req.body;
    const question = await prisma.question.update({
      where: { id: req.params.id },
      data: questionData
    });
    res.json(question);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    await prisma.question.delete({ where: { id: req.params.id } });
    res.json({ message: 'Question deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ============================================================================
// QUESTION BANKS
// ============================================================================
exports.getQuestionBanks = async (req, res) => {
  try {
    const assignedSubjectIds = (await prisma.facultyAssignment.findMany({
      where: { facultyId: req.user.id },
      select: { subjectId: true }
    })).map(a => a.subjectId);

    const banks = await prisma.questionBank.findMany({
      where: { subjectId: { in: assignedSubjectIds } },
      include: { subject: true, _count: { select: { questions: true } } }
    });
    res.json(banks);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createQuestionBank = async (req, res) => {
  try {
    const { name, subjectId } = req.body;
    const bank = await prisma.questionBank.create({ data: { name, subjectId } });
    res.status(201).json(bank);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ============================================================================
// LIVE MONITORING
// ============================================================================
exports.getLiveMonitoringData = async (req, res) => {
  try {
    const { examId } = req.params;

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        facultyAssignment: {
          include: { subject: true,  }
        }
      }
    });

    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    if (exam.facultyAssignment.facultyId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const sessions = await prisma.examSession.findMany({
      where: { examId },
      include: {
        student: {
          select: {
            id: true, name: true, register_no: true, email: true, departmentId: true,
            department: { select: { code: true } }
          }
        },
        _count: { select: { warnings: true, studentAnswers: true } }
      }
    });

    const examStudents = await prisma.examStudent.findMany({
      where: { examId },
      include: {
        student: { select: { id: true, name: true, register_no: true, email: true } }
      }
    });

    let assignedStudents = [];
    if (examStudents.length > 0) {
      assignedStudents = examStudents.map(es => es.student);
    } else {
      const assignmentStudents = await prisma.assignmentStudent.findMany({
        where: { assignmentId: exam.facultyAssignmentId, status: 'ACTIVE' },
        include: {
          student: { select: { id: true, name: true, register_no: true, email: true } }
        }
      });
      assignedStudents = assignmentStudents.map(as => as.student);
    }

    res.json({ exam, sessions, assignedStudents });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// RESULTS DASHBOARD — Stats overview
// ============================================================================
exports.getResultsDashboard = async (req, res) => {
  try {
    const assignmentIds = await getFacultyAssignmentIds(req.user.id);

    // Get all exams for this faculty
    const exams = await prisma.exam.findMany({
      where: { facultyAssignmentId: { in: assignmentIds } },
      include: {
        facultyAssignment: { include: { subject: true,  } },
        _count: { 
          select: { 
            results: true, 
            sessions: { where: { status: { in: ['SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'] } } } 
          } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get all results for stats
    const allResults = await prisma.result.findMany({
      where: { exam: { facultyAssignmentId: { in: assignmentIds } } }
    });

    const totalSubmissions = allResults.length;
    const pendingEvaluation = allResults.filter(r => r.status === 'PENDING_EVALUATION').length;
    const evaluated = allResults.filter(r => r.status === 'EVALUATED').length;
    const published = allResults.filter(r => r.status === 'PUBLISHED').length;
    const autoEvaluated = allResults.filter(r => r.status === 'AUTO_EVALUATED').length;

    const publishedResults = allResults.filter(r => r.published);
    const avgMarks = publishedResults.length > 0 ? publishedResults.reduce((s, r) => s + r.percentage, 0) / publishedResults.length : 0;
    const highestScore = publishedResults.length > 0 ? Math.max(...publishedResults.map(r => r.percentage)) : 0;
    const lowestScore = publishedResults.length > 0 ? Math.min(...publishedResults.map(r => r.percentage)) : 0;
    const passCount = publishedResults.filter(r => r.isPass).length;
    const passPercentage = publishedResults.length > 0 ? (passCount / publishedResults.length) * 100 : 0;

    res.json({
      stats: {
        totalSubmissions,
        pendingEvaluation,
        evaluated,
        published,
        autoEvaluated,
        avgMarks: avgMarks.toFixed(1),
        highestScore: highestScore.toFixed(1),
        lowestScore: lowestScore.toFixed(1),
        passPercentage: passPercentage.toFixed(1),
      },
      exams: exams.map(e => ({
        id: e.id,
        title: e.title,
        subject: e.facultyAssignment.subject.name,
        subjectCode: e.facultyAssignment.subject.code,
        section: '-',
        semester: '-',
        status: e.status,
        totalSubmissions: e._count.sessions,
        totalSessions: e._count.sessions,
        startTime: e.startTime,
        endTime: e.endTime,
      }))
    });
  } catch (error) {
    console.error('getResultsDashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// EXAM SUBMISSIONS LIST
// ============================================================================
exports.getExamSubmissions = async (req, res) => {
  try {
    const { examId } = req.params;

    // Verify faculty owns this exam
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        facultyAssignment: {
          include: {
            subject: true,
            
            faculty: { select: { name: true } }
          }
        }
      }
    });

    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    if (exam.facultyAssignment.facultyId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: You are not assigned to this exam' });
    }

    const sessions = await prisma.examSession.findMany({
      where: { examId, status: { in: ['SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'] } },
      include: {
        student: {
          select: {
            id: true, name: true, register_no: true, email: true,
            department: { select: { name: true, code: true } }
          }
        },
        _count: { select: { warnings: true, studentAnswers: true } }
      },
      orderBy: { submittedAt: 'desc' }
    });

    // Get results for each session
    const results = await prisma.result.findMany({
      where: { examId },
    });

    const resultMap = {};
    results.forEach(r => { resultMap[r.studentId] = r; });

    // Count pending answers per session
    const submissions = await Promise.all(sessions.map(async (session) => {
      const pendingCount = await prisma.studentAnswer.count({
        where: { sessionId: session.id, evaluationStatus: 'PENDING' }
      });

      const result = resultMap[session.studentId];

      return {
        sessionId: session.id,
        studentId: session.studentId,
        studentName: session.student.name,
        registerNo: session.student.register_no,
        email: session.student.email,
        department: session.student.department?.name,
        departmentCode: session.student.department?.code,
        section: '-',
        semester: '-',
        submittedAt: session.submittedAt,
        timeTaken: session.timeTaken,
        submissionType: session.submissionType,
        warningCount: session.warningCount,
        fullscreenViolations: session.fullscreenViolations,
        networkDisconnects: session.networkDisconnects,
        objectiveMarks: session.objectiveMarks,
        obtainedMarks: result?.marksObtained || session.obtainedMarks || 0,
        totalMarks: session.totalMarks || exam.totalMarks,
        percentage: result?.percentage || session.percentage || 0,
        pendingEvaluation: pendingCount,
        resultStatus: result?.status || 'SUBMITTED',
        grade: result?.grade,
        isPass: result?.isPass,
        resultId: result?.id,
      };
    }));

    res.json({ exam, submissions });
  } catch (error) {
    console.error('getExamSubmissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// SUBMISSION DETAIL — Full answers for evaluation
// ============================================================================
exports.getSubmissionDetail = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        exam: {
          include: {
            facultyAssignment: {
              include: {
                subject: true,
                
                faculty: { select: { name: true } }
              }
            }
          }
        },
        student: {
          select: {
            id: true, name: true, register_no: true, email: true,
            department: { select: { name: true, code: true } }
          }
        },
        studentAnswers: {
          include: {
            question: { include: { options: true } },
            selectedOptions: true,
            evaluatedBy: { select: { name: true } }
          },
          orderBy: { question: { createdAt: 'asc' } }
        }
      }
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Security: verify faculty owns this exam
    if (session.exam.facultyAssignment.facultyId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get result
    const result = await prisma.result.findFirst({
      where: { examId: session.examId, studentId: session.studentId }
    });

    // Get all sessions for this exam (to provide prev/next student navigation)
    const allSessions = await prisma.examSession.findMany({
      where: {
        examId: session.examId,
        status: { in: ['SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'] }
      },
      select: { id: true, studentId: true },
      orderBy: { submittedAt: 'asc' }
    });

    const currentIndex = allSessions.findIndex(s => s.id === sessionId);
    const prevSessionId = currentIndex > 0 ? allSessions[currentIndex - 1].id : null;
    const nextSessionId = currentIndex < allSessions.length - 1 ? allSessions[currentIndex + 1].id : null;

    res.json({
      session: {
        id: session.id,
        startedAt: session.startedAt,
        submittedAt: session.submittedAt,
        timeTaken: session.timeTaken,
        submissionType: session.submissionType,
        warningCount: session.warningCount,
        fullscreenViolations: session.fullscreenViolations,
        networkDisconnects: session.networkDisconnects,
        isLateSubmission: session.isLateSubmission,
        objectiveMarks: session.objectiveMarks,
        obtainedMarks: session.obtainedMarks,
        totalMarks: session.totalMarks,
        browser: session.browser,
        ipAddress: session.ipAddress,
      },
      student: {
        id: session.student.id,
        name: session.student.name,
        registerNo: session.student.register_no,
        email: session.student.email,
        department: session.student.department?.name,
        departmentCode: session.student.department?.code,
        section: '-',
        semester: '-',
      },
      exam: {
        id: session.exam.id,
        title: session.exam.title,
        subject: session.exam.facultyAssignment.subject.name,
        subjectCode: session.exam.facultyAssignment.subject.code,
        totalMarks: session.exam.totalMarks,
        passingMarks: session.exam.passingMarks,
        durationMins: session.exam.durationMins,
      },
      answers: session.studentAnswers
        .filter((a, index, self) => self.findIndex(t => t.questionId === a.questionId) === index)
        .map((a, index) => ({
        id: a.id,
        questionId: a.questionId,
        questionNumber: index + 1,
        questionText: a.question.text,
        questionType: a.question.type,
        questionMarks: a.question.marks,
        questionDifficulty: a.question.difficulty,
        options: a.question.options.map(o => ({
          id: o.id,
          text: o.text,
          isCorrect: o.isCorrect,
        })),
        selectedOptionIds: a.selectedOptions.map(o => o.id),
        textAnswer: a.textAnswer,
        fileUrl: a.fileUrl,
        marksObtained: a.marksObtained,
        isCorrect: a.isCorrect,
        evaluationStatus: a.evaluationStatus,
        evaluationRemarks: a.evaluationRemarks,
        evaluatedBy: a.evaluatedBy?.name,
        evaluatedAt: a.evaluatedAt,
      })),
      result,
      navigation: {
        prevSessionId,
        nextSessionId,
        currentIndex: currentIndex + 1,
        totalSubmissions: allSessions.length,
      }
    });
  } catch (error) {
    console.error('getSubmissionDetail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// EVALUATE ANSWER — Single answer
// ============================================================================
exports.evaluateAnswer = async (req, res) => {
  try {
    const { answerId } = req.params;
    const { marksObtained, remarks } = req.body;

    const answer = await prisma.studentAnswer.findUnique({
      where: { id: answerId },
      include: {
        session: { include: { exam: { include: { facultyAssignment: true } } } },
        question: true
      }
    });

    if (!answer) return res.status(404).json({ error: 'Answer not found' });

    // Security: verify faculty owns this exam
    if (answer.session.exam.facultyAssignment.facultyId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if result is published/locked
    const result = await prisma.result.findFirst({
      where: { examId: answer.session.examId, studentId: answer.studentId }
    });
    if (result && result.status === 'PUBLISHED') {
      return res.status(400).json({ error: 'Cannot edit marks after results are published' });
    }

    // Validate marks
    if (marksObtained !== undefined && (marksObtained < 0 || marksObtained > answer.question.marks)) {
      return res.status(400).json({ error: `Marks must be between 0 and ${answer.question.marks}` });
    }

    const updated = await prisma.studentAnswer.update({
      where: { id: answerId },
      data: {
        marksObtained: marksObtained !== undefined ? marksObtained : answer.marksObtained,
        evaluationRemarks: remarks || answer.evaluationRemarks,
        evaluationStatus: 'EVALUATED',
        isEvaluated: true,
        evaluatedById: req.user.id,
        evaluatedAt: new Date(),
      }
    });

    // Audit log
    await prisma.activityLog.create({
      data: {
        userId: req.user.id, role: 'FACULTY',
        examId: answer.session.examId, sessionId: answer.sessionId,
        action: 'ANSWER_EVALUATED',
        details: `Evaluated Q: "${answer.question.text.substring(0, 50)}..." — Marks: ${marksObtained}/${answer.question.marks}`,
        ipAddress: req.ip, browser: req.headers['user-agent']
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('evaluateAnswer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// SAVE EVALUATION DRAFT — Bulk save for a session
// ============================================================================
exports.saveEvaluationDraft = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { evaluations } = req.body; // Array of { answerId, marksObtained, remarks }

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: { exam: { include: { facultyAssignment: true } } }
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.exam.facultyAssignment.facultyId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check published status
    const result = await prisma.result.findFirst({
      where: { examId: session.examId, studentId: session.studentId }
    });
    if (result && result.status === 'PUBLISHED') {
      return res.status(400).json({ error: 'Cannot edit marks after results are published' });
    }

    // Batch update
    for (const ev of evaluations) {
      await prisma.studentAnswer.update({
        where: { id: ev.answerId },
        data: {
          marksObtained: ev.marksObtained,
          evaluationRemarks: ev.remarks || null,
          evaluationStatus: ev.marksObtained !== null && ev.marksObtained !== undefined ? 'EVALUATED' : 'PENDING',
          isEvaluated: ev.marksObtained !== null && ev.marksObtained !== undefined,
          evaluatedById: req.user.id,
          evaluatedAt: new Date(),
        }
      });
    }

    await prisma.activityLog.create({
      data: {
        userId: req.user.id, role: 'FACULTY',
        examId: session.examId, sessionId,
        action: 'EVALUATION_DRAFT_SAVED',
        details: `Saved draft evaluation for ${evaluations.length} answers`,
        ipAddress: req.ip, browser: req.headers['user-agent']
      }
    });

    res.json({ success: true, message: 'Draft saved successfully' });
  } catch (error) {
    console.error('saveEvaluationDraft error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// COMPLETE EVALUATION — Finalize marks for a session
// ============================================================================
exports.completeEvaluation = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        exam: { include: { facultyAssignment: true } },
        studentAnswers: { include: { question: true } }
      }
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.exam.facultyAssignment.facultyId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check all answers are evaluated
    const pendingAnswers = session.studentAnswers.filter(a => a.evaluationStatus === 'PENDING');
    if (pendingAnswers.length > 0) {
      return res.status(400).json({
        error: `${pendingAnswers.length} answer(s) are still pending evaluation`,
        pendingQuestions: pendingAnswers.map(a => a.question.text.substring(0, 50))
      });
    }

    // Calculate totals
    let objectiveMarks = 0;
    let descriptiveMarks = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let attemptedCount = 0;

    for (const a of session.studentAnswers) {
      const marks = a.marksObtained || 0;
      if (['MCQ', 'TRUE_FALSE', 'MULTIPLE_CORRECT', 'FILL_IN_BLANK'].includes(a.question.type)) {
        objectiveMarks += marks;
        if (a.isCorrect === true) correctCount++;
        else if (a.isCorrect === false && (a.marksObtained !== null && a.marksObtained !== undefined)) incorrectCount++;
      } else {
        descriptiveMarks += marks;
      }
      if (a.marksObtained !== null && a.marksObtained !== undefined && a.marksObtained > 0) attemptedCount++;
    }

    const totalObtained = Math.max(0, objectiveMarks + descriptiveMarks);
    const percentage = session.exam.totalMarks > 0 ? (totalObtained / session.exam.totalMarks) * 100 : 0;
    const gradeInfo = await calculateGrade(percentage);

    // Update session
    await prisma.examSession.update({
      where: { id: sessionId },
      data: {
        obtainedMarks: totalObtained,
        objectiveMarks,
        percentage,
      }
    });

    // Update result
    const result = await prisma.result.findFirst({
      where: { examId: session.examId, studentId: session.studentId }
    });

    if (result) {
      await prisma.result.update({
        where: { id: result.id },
        data: {
          marksObtained: totalObtained,
          objectiveMarks,
          percentage,
          isPass: gradeInfo.isPass,
          grade: gradeInfo.grade,
          status: 'EVALUATED',
          correctAnswers: correctCount,
          incorrectAnswers: incorrectCount,
        }
      });
    }

    // Notification to student
    await prisma.notification.create({
      data: {
        userId: session.studentId,
        examId: session.examId,
        type: 'EVALUATION_COMPLETED',
        title: 'Evaluation Completed',
        message: `Your answers for "${session.exam.title}" have been evaluated by the faculty.`
      }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${session.studentId}`).emit('notification', {
        type: 'EVALUATION_COMPLETED',
        title: 'Evaluation Completed',
        message: `Your answers for "${session.exam.title}" have been evaluated.`
      });
    }

    // Audit log
    await prisma.activityLog.create({
      data: {
        userId: req.user.id, role: 'FACULTY',
        examId: session.examId, sessionId,
        action: 'EVALUATION_COMPLETED',
        details: `Completed evaluation: ${totalObtained}/${session.exam.totalMarks} (${percentage.toFixed(1)}%) — Grade: ${gradeInfo.grade}`,
        ipAddress: req.ip, browser: req.headers['user-agent']
      }
    });

    res.json({
      success: true,
      totalObtained,
      objectiveMarks,
      descriptiveMarks,
      percentage,
      grade: gradeInfo.grade,
      isPass: gradeInfo.isPass,
    });
  } catch (error) {
    console.error('completeEvaluation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// PUBLISH RESULTS — Lock marks, assign grades, notify students
// ============================================================================
exports.publishResults = async (req, res) => {
  try {
    const { examId } = req.params;
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { facultyAssignment: true }
    });
    if (!exam || exam.facultyAssignment.facultyId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check all results are evaluated
    const pendingResults = await prisma.result.findMany({
      where: { examId, status: 'PENDING_EVALUATION' }
    });

    // Get all results
    const results = await prisma.result.findMany({ where: { examId } });

    const now = new Date();

    // Update all results to PUBLISHED
    for (const result of results) {
      // Recalculate grade if not yet set
      const gradeInfo = result.grade ? { grade: result.grade, isPass: result.isPass } : await calculateGrade(result.percentage);

      await prisma.result.update({
        where: { id: result.id },
        data: {
          status: 'PUBLISHED',
          published: true,
          publishedAt: now,
          grade: gradeInfo.grade,
          isPass: gradeInfo.isPass,
        }
      });
    }

    // Update exam status
    await prisma.exam.update({
      where: { id: examId },
      data: { status: 'RESULTS_PUBLISHED' }
    });

    // Notify all students
    if (results.length > 0) {
      await prisma.notification.createMany({
        data: results.map(r => ({
          userId: r.studentId,
          examId,
          type: 'RESULT_PUBLISHED',
          title: 'Results Published',
          message: `Results for "${exam.title}" have been published. Check your results page to view your score and grade.`
        }))
      });

      const io = req.app.get('io');
      if (io) {
        results.forEach(r => {
          io.to(`user_${r.studentId}`).emit('notification', {
            type: 'RESULT_PUBLISHED',
            title: 'Results Published',
            message: `Results for "${exam.title}" have been published.`,
            examId
          });
        });
      }
    }

    // Audit log
    await prisma.activityLog.create({
      data: {
        userId: req.user.id, role: 'FACULTY', examId,
        action: 'RESULTS_PUBLISHED',
        details: `Published results for ${results.length} students. ${pendingResults.length} had pending evaluations.`,
        ipAddress: req.ip, browser: req.headers['user-agent']
      }
    });

    res.json({
      success: true,
      message: 'Results published successfully',
      count: results.length,
      pendingWarning: pendingResults.length > 0 ? `${pendingResults.length} results were published with pending evaluations` : null
    });
  } catch (error) {
    console.error('publishResults error:', error);
    res.status(400).json({ error: error.message });
  }
};

// ============================================================================
// EXAM ANALYTICS
// ============================================================================
exports.getExamAnalytics = async (req, res) => {
  try {
    const { examId } = req.params;

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        facultyAssignment: { include: { subject: true } },
        examQuestions: { include: { question: { include: { options: true } } }, orderBy: { orderIndex: 'asc' } }
      }
    });

    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    if (exam.facultyAssignment.facultyId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all results
    const results = await prisma.result.findMany({
      where: { examId },
      include: { student: { select: { name: true, register_no: true } } },
      orderBy: { percentage: 'desc' }
    });

    // Score distribution
    const scores = results.map(r => r.percentage);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

    // Standard deviation
    const variance = scores.length > 0
      ? scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length
      : 0;
    const stdDeviation = Math.sqrt(variance);

    const passCount = results.filter(r => r.isPass).length;
    const passPercentage = results.length > 0 ? (passCount / results.length) * 100 : 0;

    // Top 10 students
    const top10 = results.slice(0, 10).map(r => ({
      name: r.student.name,
      registerNo: r.student.register_no,
      marks: r.marksObtained,
      percentage: r.percentage,
      grade: r.grade,
    }));

    // Students needing manual evaluation
    const pendingEval = results.filter(r => r.status === 'PENDING_EVALUATION').map(r => ({
      name: r.student.name,
      registerNo: r.student.register_no,
      objectiveMarks: r.objectiveMarks,
      status: r.status,
    }));

    // Question-wise analysis
    const questionAnalysis = await Promise.all(exam.examQuestions.map(async (eq) => {
      const q = eq.question;
      const answers = await prisma.studentAnswer.findMany({
        where: { questionId: q.id, session: { examId } }
      });

      const totalAttempts = answers.length;
      const correctAttempts = answers.filter(a => a.isCorrect === true).length;
      const avgMarks = totalAttempts > 0 ? answers.reduce((s, a) => s + (a.marksObtained || 0), 0) / totalAttempts : 0;
      const correctPercentage = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;

      return {
        questionId: q.id,
        questionText: q.text,
        type: q.type,
        maxMarks: q.marks,
        difficulty: q.difficulty,
        totalAttempts,
        correctAttempts,
        correctPercentage: correctPercentage.toFixed(1),
        avgMarks: avgMarks.toFixed(2),
      };
    }));

    // Marks distribution (buckets)
    const distribution = {
      '90-100': results.filter(r => r.percentage >= 90).length,
      '80-89': results.filter(r => r.percentage >= 80 && r.percentage < 90).length,
      '70-79': results.filter(r => r.percentage >= 70 && r.percentage < 80).length,
      '60-69': results.filter(r => r.percentage >= 60 && r.percentage < 70).length,
      '50-59': results.filter(r => r.percentage >= 50 && r.percentage < 60).length,
      'Below 50': results.filter(r => r.percentage < 50).length,
    };

    res.json({
      exam: {
        title: exam.title,
        subject: exam.facultyAssignment.subject.name,
        totalMarks: exam.totalMarks,
        passingMarks: exam.passingMarks,
      },
      summary: {
        totalSubmissions: results.length,
        avgScore: avgScore.toFixed(1),
        highestScore: highestScore.toFixed(1),
        lowestScore: lowestScore.toFixed(1),
        stdDeviation: stdDeviation.toFixed(1),
        passCount,
        passPercentage: passPercentage.toFixed(1),
      },
      distribution,
      top10,
      pendingEvaluation: pendingEval,
      questionAnalysis,
    });
  } catch (error) {
    console.error('getExamAnalytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// EXPORT RESULTS — CSV
// ============================================================================
exports.exportResults = async (req, res) => {
  try {
    const { examId } = req.params;
    const { format } = req.query; // csv, excel, pdf

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { facultyAssignment: { include: { subject: true } } }
    });

    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    if (exam.facultyAssignment.facultyId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const results = await prisma.result.findMany({
      where: { examId },
      include: {
        student: {
          select: {
            name: true, register_no: true, email: true,
            department: { select: { name: true } },
            enrollments: {
              where: { status: 'ACTIVE' },
              include: {  semester: true }
            }
          }
        }
      },
      orderBy: { student: { name: 'asc' } }
    });

    // Generate CSV
    const headers = ['Register No', 'Name', 'Department', 'Section', 'Semester', 'Objective Marks', 'Descriptive Marks', 'Total Marks', 'Max Marks', 'Percentage', 'Grade', 'Pass/Fail', 'Status'];
    const rows = results.map(r => [
      r.student.register_no || '',
      r.student.name,
      r.student.department?.name || '',
      '-',
      r.student.enrollments[0]?.semester?.semesterNumber || '',
      r.objectiveMarks,
      r.descriptiveMarks,
      r.marksObtained,
      r.totalMarks,
      r.percentage.toFixed(1),
      r.grade || 'N/A',
      r.isPass ? 'PASS' : 'FAIL',
      r.status,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${exam.title}_results.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('exportResults error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// LEGACY RESULTS (keeping for backward compat)
// ============================================================================
exports.getResults = async (req, res) => {
  try {
    const assignmentIds = await getFacultyAssignmentIds(req.user.id);

    const results = await prisma.result.findMany({
      where: { exam: { facultyAssignmentId: { in: assignmentIds } } },
      include: {
        exam: { include: { facultyAssignment: { include: { subject: true,  } } } },
        student: { select: { name: true, register_no: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// STUDENT MANAGEMENT (PLACEHOLDERS)
// ============================================================================
exports.getStudents = async (req, res) => {
  try {
    const assignmentIds = await getFacultyAssignmentIds(req.user.id);
    
    const assignmentStudents = await prisma.assignmentStudent.findMany({
      where: { assignmentId: { in: assignmentIds } },
      include: {
        student: { 
          select: { id: true, name: true, email: true, register_no: true, status: true, firstLogin: true, createdAt: true, phone: true } 
        },
        assignment: { 
          include: { 
            subject: { include: { department: true } }
          } 
        }
      }
    });

    const students = assignmentStudents.map(as => {
      const s = { ...as.student };
      s.subject = as.assignment.subject;
      s.enrollment = {
        course: { department: as.assignment.subject.department }
      };
      return s;
    });

    // Remove duplicates if a student appears in multiple assignments, or keep them if we want to show multiple subjects.
    // Let's keep them so the faculty sees the student per subject.
    res.json(students);
  } catch (error) {
    console.error('getStudents Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
// ============================================================================
// FACULTY STUDENT MANAGEMENT — Full CRUD
// ============================================================================
const bcrypt = require('bcryptjs');

exports.exportStudents = async (req, res) => {
  try {
    const assignmentIds = await getFacultyAssignmentIds(req.user.id);
    const assignmentStudents = await prisma.assignmentStudent.findMany({
      where: { assignmentId: { in: assignmentIds } },
      include: {
        student: { select: { id: true, name: true, email: true, register_no: true, status: true, phone: true, createdAt: true } },
        assignment: { include: { subject: true } }
      }
    });
    const rows = assignmentStudents.map(as => ({
      'Register No': as.student.register_no || '',
      'Name': as.student.name,
      'Email': as.student.email,
      'Phone': as.student.phone || '',
      'Subject': as.assignment.subject?.name || '',
      'Status': as.student.status,
      'Created': as.student.createdAt?.toISOString?.() || ''
    }));
    res.json(rows);
  } catch (error) {
    console.error('exportStudents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.importStudents = async (req, res) => {
  try {
    const { students, assignmentId } = req.body;
    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'No students provided' });
    }
    if (!assignmentId) {
      return res.status(400).json({ error: 'Assignment ID is required' });
    }

    // Verify faculty owns this assignment
    const assignmentIds = await getFacultyAssignmentIds(req.user.id);
    if (!assignmentIds.includes(assignmentId)) {
      return res.status(403).json({ error: 'Unauthorized assignment' });
    }

    const results = { created: 0, existing: 0, enrolled: 0, errors: [] };

    for (const s of students) {
      try {
        const registerNo = String(s.registerNo || s.register_no || s['Register No'] || '').trim();
        const name = String(s.name || s.Name || '').trim();
        const email = String(s.email || s.Email || '').trim();
        const phone = String(s.phone || s.Phone || '').trim();

        if (!registerNo || !name || !email) {
          results.errors.push(`Skipped: missing required fields for ${registerNo || name || 'unknown'}`);
          continue;
        }

        // Find or create student user
        let student = await prisma.user.findFirst({
          where: { OR: [{ email }, { register_no: registerNo }] }
        });

        if (!student) {
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(registerNo, salt);
          student = await prisma.user.create({
            data: {
              name, email, register_no: registerNo, phone: phone || null,
              password: hashedPassword, role: 'STUDENT', firstLogin: true, status: 'ACTIVE'
            }
          });
          results.created++;
        } else {
          results.existing++;
        }

        // Enroll into assignment (skip if already enrolled)
        const existingEnrollment = await prisma.assignmentStudent.findUnique({
          where: { assignmentId_studentId: { assignmentId, studentId: student.id } }
        });
        if (!existingEnrollment) {
          await prisma.assignmentStudent.create({
            data: { assignmentId, studentId: student.id }
          });
          results.enrolled++;
        }
      } catch (err) {
        results.errors.push(`Error processing ${s.registerNo || s.name || 'unknown'}: ${err.message}`);
      }
    }

    res.json({
      message: `Import complete. Created: ${results.created}, Already existed: ${results.existing}, Enrolled: ${results.enrolled}`,
      ...results
    });
  } catch (error) {
    console.error('importStudents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const student = await prisma.user.findUnique({
      where: { id: req.params.id, role: 'STUDENT' },
      select: { id: true, name: true, email: true, register_no: true, phone: true, status: true, firstLogin: true, createdAt: true }
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (error) {
    console.error('getStudentById error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createStudent = async (req, res) => {
  try {
    const { name, registerNo, email, phone, assignmentId } = req.body;
    if (!name || !registerNo || !email) {
      return res.status(400).json({ error: 'Name, register number, and email are required' });
    }

    // Check for existing user
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { register_no: registerNo }] }
    });
    if (existing) return res.status(400).json({ error: 'Student with this email or register number already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(registerNo, salt);

    const student = await prisma.user.create({
      data: {
        name, email, register_no: registerNo, phone: phone || null,
        password: hashedPassword, role: 'STUDENT', firstLogin: true, status: 'ACTIVE'
      }
    });

    // If assignmentId is provided, enroll student
    if (assignmentId) {
      await prisma.assignmentStudent.create({
        data: { assignmentId, studentId: student.id }
      });
    }

    res.status(201).json(student);
  } catch (error) {
    console.error('createStudent error:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const { name, email, phone, status } = req.body;
    const student = await prisma.user.update({
      where: { id: req.params.id },
      data: { name, email, phone, status }
    });
    res.json(student);
  } catch (error) {
    console.error('updateStudent error:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.resetStudentPassword = async (req, res) => {
  try {
    const student = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const newPassword = student.register_no || 'password123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: req.params.id },
      data: { password: hashedPassword, firstLogin: true }
    });

    res.json({ message: `Password reset to register number successfully` });
  } catch (error) {
    console.error('resetStudentPassword error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateStudentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    const student = await prisma.user.update({
      where: { id: req.params.id },
      data: { status }
    });
    res.json(student);
  } catch (error) {
    console.error('updateStudentStatus error:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const studentId = req.params.id;
    // Remove from all assignments first
    await prisma.assignmentStudent.deleteMany({ where: { studentId } });
    // Remove exam students
    await prisma.examStudent.deleteMany({ where: { studentId } });
    // Delete the student
    await prisma.user.delete({ where: { id: studentId } });
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('deleteStudent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
exports.getAssignmentStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const assignmentIds = await getFacultyAssignmentIds(req.user.id);
    
    if (!assignmentIds.includes(id)) {
      return res.status(403).json({ error: 'You are not authorized to view this assignment' });
    }

    const assignmentStudents = await prisma.assignmentStudent.findMany({
      where: { assignmentId: id, status: 'ACTIVE' },
      include: {
        student: { 
          select: { id: true, name: true, email: true, register_no: true, status: true, firstLogin: true, createdAt: true, phone: true } 
        }
      }
    });

    const students = assignmentStudents.map(as => as.student);
    res.json(students);
  } catch (error) {
    console.error('getAssignmentStudents Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// QUESTION CATEGORIES — Full CRUD
// ============================================================================
exports.getCategories = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { departmentId: true } });
    const categories = await prisma.questionCategory.findMany({
      where: user?.departmentId ? { departmentId: user.departmentId } : {},
      include: {
        _count: { select: { questions: true } },
        createdBy: { select: { name: true } }
      },
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    console.error('getCategories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getCategory = async (req, res) => {
  try {
    const category = await prisma.questionCategory.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { questions: true } },
        createdBy: { select: { name: true } }
      }
    });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (error) {
    console.error('getCategory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { departmentId: true } });
    if (!user?.departmentId) return res.status(400).json({ error: 'Faculty must be assigned to a department' });

    const category = await prisma.questionCategory.create({
      data: {
        name,
        description: description || null,
        color: color || '#1976d2',
        departmentId: user.departmentId,
        createdById: req.user.id
      }
    });
    res.status(201).json(category);
  } catch (error) {
    console.error('createCategory error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A category with this name already exists in your department' });
    }
    res.status(400).json({ error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { name, description, color } = req.body;
    const category = await prisma.questionCategory.update({
      where: { id: req.params.id },
      data: { name, description, color }
    });
    res.json(category);
  } catch (error) {
    console.error('updateCategory error:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    // Unlink questions from this category first (set categoryId to null)
    await prisma.question.updateMany({
      where: { categoryId: req.params.id },
      data: { categoryId: null }
    });
    await prisma.questionCategory.delete({ where: { id: req.params.id } });
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('deleteCategory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getCategoryAnalytics = async (req, res) => {
  try {
    const category = await prisma.questionCategory.findUnique({
      where: { id: req.params.id },
      include: {
        questions: {
          select: { id: true, difficulty: true, marks: true, type: true }
        }
      }
    });
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const questions = category.questions;
    const difficultyBreakdown = {
      EASY: questions.filter(q => q.difficulty === 'EASY').length,
      MEDIUM: questions.filter(q => q.difficulty === 'MEDIUM').length,
      HARD: questions.filter(q => q.difficulty === 'HARD').length,
    };
    const typeBreakdown = {};
    questions.forEach(q => { typeBreakdown[q.type] = (typeBreakdown[q.type] || 0) + 1; });
    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

    res.json({
      categoryId: category.id,
      categoryName: category.name,
      totalQuestions: questions.length,
      difficultyBreakdown,
      typeBreakdown,
      totalMarks,
      averageMarks: questions.length > 0 ? (totalMarks / questions.length).toFixed(2) : 0
    });
  } catch (error) {
    console.error('getCategoryAnalytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// QUESTION BULK IMPORT
// ============================================================================
exports.importQuestionsBulk = async (req, res) => {
  try {
    const { questions, bankId, categoryId } = req.body;
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'No questions provided' });
    }
    if (!bankId) {
      return res.status(400).json({ error: 'Question bank ID is required' });
    }

    // Verify bank exists and belongs to faculty's subjects
    const bank = await prisma.questionBank.findUnique({
      where: { id: bankId },
      include: { subject: true }
    });
    if (!bank) return res.status(404).json({ error: 'Question bank not found' });

    const results = { imported: 0, errors: [] };

    for (let i = 0; i < questions.length; i++) {
      try {
        const q = questions[i];
        const text = q.text || q.Question || q.question || '';
        if (!text) {
          results.errors.push(`Row ${i + 1}: Missing question text`);
          continue;
        }

        const options = [];
        const optionTexts = [
          q.optionA || q['Option A'] || q.option_a || '',
          q.optionB || q['Option B'] || q.option_b || '',
          q.optionC || q['Option C'] || q.option_c || '',
          q.optionD || q['Option D'] || q.option_d || '',
        ];

        const correctAnswer = String(q.correctAnswer || q['Correct Answer'] || q.correct_answer || 'A').toUpperCase().trim();
        const correctIndex = ['A', 'B', 'C', 'D'].indexOf(correctAnswer);

        for (let j = 0; j < optionTexts.length; j++) {
          if (optionTexts[j]) {
            options.push({
              text: optionTexts[j],
              isCorrect: j === correctIndex
            });
          }
        }

        if (options.length < 2) {
          results.errors.push(`Row ${i + 1}: Need at least 2 options`);
          continue;
        }

        const marks = parseFloat(q.marks || q.Marks || 1);
        const diffRaw = String(q.difficulty || q.Difficulty || 'MEDIUM').toUpperCase().trim();
        const difficulty = ['EASY', 'MEDIUM', 'HARD'].includes(diffRaw) ? diffRaw : 'MEDIUM';

        await prisma.question.create({
          data: {
            bankId,
            text,
            type: 'MCQ',
            marks: isNaN(marks) ? 1 : marks,
            difficulty,
            categoryId: categoryId || null,
            options: { create: options }
          }
        });

        results.imported++;
      } catch (err) {
        results.errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    res.json({
      message: `Import complete. ${results.imported} questions imported.`,
      ...results
    });
  } catch (error) {
    console.error('importQuestionsBulk error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// PUBLISH-READY EXAMS
// ============================================================================
exports.getPublishReadyExams = async (req, res) => {
  try {
    const assignmentIds = await getFacultyAssignmentIds(req.user.id);
    const exams = await prisma.exam.findMany({
      where: {
        facultyAssignmentId: { in: assignmentIds },
        status: { in: ['COMPLETED', 'EVALUATION'] }
      },
      include: {
        facultyAssignment: {
          include: { subject: true, assessmentType: true }
        },
        _count: { select: { sessions: true, results: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(exams);
  } catch (error) {
    console.error('getPublishReadyExams error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// UNPUBLISH RESULTS
// ============================================================================
exports.unpublishResults = async (req, res) => {
  try {
    const { examId } = req.params;
    const assignmentIds = await getFacultyAssignmentIds(req.user.id);

    const exam = await prisma.exam.findFirst({
      where: { id: examId, facultyAssignmentId: { in: assignmentIds } }
    });
    if (!exam) return res.status(404).json({ error: 'Exam not found or unauthorized' });

    // Unpublish all results
    await prisma.result.updateMany({
      where: { examId },
      data: { published: false, publishedAt: null, status: 'EVALUATED' }
    });

    // Reset exam status
    await prisma.exam.update({
      where: { id: examId },
      data: { status: 'COMPLETED' }
    });

    res.json({ message: 'Results unpublished successfully' });
  } catch (error) {
    console.error('unpublishResults error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

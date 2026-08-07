const prisma = require('../utils/db');

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
        durationMins,
        passingMarks,
        totalMarks,
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
            id: true, name: true, register_no: true, departmentId: true,
            department: { select: { code: true } },
            enrollments: {
              where: { status: 'ACTIVE' },
              include: { course: true, semester: true,  }
            }
          }
        },
        _count: { select: { warnings: true, studentAnswers: true } }
      }
    });

    res.json({ exam, sessions });
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
        _count: { select: { results: true, sessions: true } }
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
        totalSubmissions: e._count.results,
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
      where: { examId, status: { in: ['SUBMITTED', 'AUTO_SUBMITTED'] } },
      include: {
        student: {
          select: {
            id: true, name: true, register_no: true, email: true,
            department: { select: { name: true, code: true } },
            enrollments: {
              where: { status: 'ACTIVE' },
              include: {  semester: true }
            }
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
        semester: session.student.enrollments[0]?.semester?.semesterNumber || '-',
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
            department: { select: { name: true, code: true } },
            enrollments: {
              where: { status: 'ACTIVE' },
              include: {  semester: true }
            }
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
        status: { in: ['SUBMITTED', 'AUTO_SUBMITTED'] }
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
        semester: session.student.enrollments[0]?.semester?.semesterNumber || '-',
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
      answers: session.studentAnswers.map(a => ({
        id: a.id,
        questionId: a.questionId,
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
        textResponse: a.textResponse,
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
        descriptiveMarks,
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
          descriptiveMarks,
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
exports.exportStudents = async (req, res) => res.status(501).json({ error: 'Not implemented' });
exports.importStudents = async (req, res) => res.status(501).json({ error: 'Not implemented' });
exports.getStudentById = async (req, res) => res.status(501).json({ error: 'Not implemented' });
exports.createStudent = async (req, res) => res.status(501).json({ error: 'Not implemented' });
exports.updateStudent = async (req, res) => res.status(501).json({ error: 'Not implemented' });
exports.resetStudentPassword = async (req, res) => res.status(501).json({ error: 'Not implemented' });
exports.updateStudentStatus = async (req, res) => res.status(501).json({ error: 'Not implemented' });
exports.deleteStudent = async (req, res) => res.status(501).json({ error: 'Not implemented' });
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
// OTHER MISSING PLACEHOLDERS
// ============================================================================
exports.getCategories = async (req, res) => res.status(501).json({ error: 'Not implemented' });
exports.getCategory = async (req, res) => res.status(501).json({ error: 'Not implemented' });
exports.createCategory = async (req, res) => res.status(501).json({ error: 'Not implemented' });
exports.updateCategory = async (req, res) => res.status(501).json({ error: 'Not implemented' });
exports.deleteCategory = async (req, res) => res.status(501).json({ error: 'Not implemented' });
exports.getCategoryAnalytics = async (req, res) => res.status(501).json({ error: 'Not implemented' });
exports.importQuestionsBulk = async (req, res) => res.status(501).json({ error: 'Not implemented' });
exports.getPublishReadyExams = async (req, res) => res.status(501).json({ error: 'Not implemented' });
exports.unpublishResults = async (req, res) => res.status(501).json({ error: 'Not implemented' });

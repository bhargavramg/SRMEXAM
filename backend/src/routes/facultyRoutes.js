const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const faculty = require('../controllers/facultyController');

// All routes require FACULTY role
router.use(authenticate, authorize('FACULTY'));

// Dashboard
router.get('/dashboard', faculty.getDashboardData);

// My Assignments
router.get('/assignments', faculty.getMyAssignments);

// Exams
router.get('/exams', faculty.getExams);
router.get('/exams/:id', faculty.getExam);
router.post('/exams', faculty.createExam);
router.put('/exams/:id', faculty.updateExam);
router.delete('/exams/:id', faculty.deleteExam);
router.post('/exams/:id/publish', faculty.publishExam);

// Question Banks
router.get('/question-banks', faculty.getQuestionBanks);
router.post('/question-banks', faculty.createQuestionBank);

// Questions
router.get('/questions', faculty.getQuestions);
router.post('/questions', faculty.createQuestion);
router.put('/questions/:id', faculty.updateQuestion);
router.delete('/questions/:id', faculty.deleteQuestion);

// Live Monitoring
router.get('/monitoring/:examId', faculty.getLiveMonitoringData);

// Results & Evaluation
router.get('/results', faculty.getResults);
router.get('/results/dashboard', faculty.getResultsDashboard);
router.get('/results/exam/:examId', faculty.getExamSubmissions);
router.get('/results/exam/:examId/analytics', faculty.getExamAnalytics);
router.get('/results/exam/:examId/export', faculty.exportResults);
router.get('/results/submission/:sessionId', faculty.getSubmissionDetail);
router.put('/results/answer/:answerId', faculty.evaluateAnswer);
router.put('/results/submission/:sessionId/draft', faculty.saveEvaluationDraft);
router.post('/results/submission/:sessionId/complete', faculty.completeEvaluation);
router.post('/results/:examId/publish', faculty.publishResults);

module.exports = router;

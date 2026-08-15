const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const faculty = require('../controllers/facultyController');

// All routes require FACULTY role
router.use(authenticate, authorize('FACULTY'));

// Dashboard
router.get('/dashboard', faculty.getDashboardData);

// Student Management
router.get('/students', faculty.getStudents);
router.get('/students/export', faculty.exportStudents);
router.post('/students/import', faculty.importStudents);
router.get('/students/:id', faculty.getStudentById);
router.post('/students', faculty.createStudent);
router.put('/students/:id', faculty.updateStudent);
router.put('/students/:id/reset-password', faculty.resetStudentPassword);
router.put('/students/:id/status', faculty.updateStudentStatus);
router.delete('/students/:id', faculty.deleteStudent);

// My Assignments
router.get('/assignments', faculty.getMyAssignments);
router.get('/assignments/:id/students', faculty.getAssignmentStudents);

// Exams
router.get('/exams', faculty.getExams);
router.get('/exams/:id', faculty.getExam);
router.post('/exams', faculty.createExam);
router.put('/exams/:id', faculty.updateExam);
router.delete('/exams/:id', faculty.deleteExam);
router.post('/exams/:id/publish', faculty.publishExam);
router.get('/exams/:id/eligible-students', faculty.getExamEligibleStudents);
router.post('/exams/:id/republish', faculty.republishExam);

// Categories
router.get('/categories', faculty.getCategories);
router.get('/categories/:id', faculty.getCategory);
router.post('/categories', faculty.createCategory);
router.put('/categories/:id', faculty.updateCategory);
router.delete('/categories/:id', faculty.deleteCategory);
router.get('/categories/:id/analytics', faculty.getCategoryAnalytics);

// Question Banks
router.get('/question-banks', faculty.getQuestionBanks);
router.post('/question-banks', faculty.createQuestionBank);

// Questions (Bulk Import goes before /questions/:id to avoid parameter matching issues)
router.post('/questions/bulk', faculty.importQuestionsBulk);

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
router.get('/results/publish-ready', faculty.getPublishReadyExams);
router.get('/results/exam/:examId', faculty.getExamSubmissions);
router.get('/results/exam/:examId/analytics', faculty.getExamAnalytics);
router.get('/results/exam/:examId/export', faculty.exportResults);
router.get('/results/submission/:sessionId', faculty.getSubmissionDetail);
router.put('/results/answer/:answerId', faculty.evaluateAnswer);
router.put('/results/submission/:sessionId/draft', faculty.saveEvaluationDraft);
router.post('/results/submission/:sessionId/complete', faculty.completeEvaluation);
router.post('/results/:examId/publish', faculty.publishResults);
router.post('/results/:examId/unpublish', faculty.unpublishResults);

module.exports = router;

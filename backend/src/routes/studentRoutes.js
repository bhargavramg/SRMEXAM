const express = require('express');
const router = express.Router();
const student = require('../controllers/studentController');
const { authenticate, authorize } = require('../middlewares/auth');

// All student routes require STUDENT role
router.use(authenticate, authorize('STUDENT'));

// Dashboard
router.get('/dashboard', student.getDashboardData);

// Profile
router.get('/profile', student.getProfile);

// Exam Listings
router.get('/exams', student.getUpcomingExams);
router.get('/exams/live', student.getLiveExams);
router.get('/exams/history', student.getExamHistory);

// Exam Details & Session
router.get('/exam/:id', student.getExamDetails);
router.get('/exam/:id/config', student.getExamConfig);
router.post('/exam/:id/start', student.startExamSession);

// Exam Session
router.get('/session/:sessionId', student.getExamQuestions);
router.post('/session/:sessionId/autosave', student.autoSaveExam);
router.post('/session/:sessionId/log', student.logActivity);
router.post('/session/:sessionId/submit', student.submitExam);

// Results
router.get('/results', student.getResults);

// Notifications
router.get('/notifications', student.getNotifications);
router.put('/notifications/:id/read', student.markNotificationRead);

module.exports = router;

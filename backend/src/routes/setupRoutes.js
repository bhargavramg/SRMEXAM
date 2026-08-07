const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const setup = require('../controllers/setupController');

// Public — checked before login to determine if setup wizard should show
router.get('/status', setup.getSetupStatus);

// All remaining setup routes require SUPER_ADMIN authentication
router.use(authenticate, authorize('SUPER_ADMIN'));

// Step 1: College Information
router.post('/college-info', setup.saveCollegeInfo);

// Step 2: Academic / Subject Setup
router.post('/subject', setup.saveSubjectSetup);

// Step 3: Faculty Setup
router.post('/faculty', setup.saveFacultySetup);

// Step 4: Student Import
router.post('/students/add', setup.addStudent);
router.post('/students/import', setup.importStudents);

// Review & Summary
router.get('/summary', setup.getSetupSummary);

// Complete Setup
router.post('/complete', setup.completeSetup);

module.exports = router;

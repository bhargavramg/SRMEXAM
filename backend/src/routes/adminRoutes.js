const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const admin = require('../controllers/adminController');

// All admin routes require ADMIN or SUPER_ADMIN role
router.use(authenticate, authorize('ADMIN', 'SUPER_ADMIN'));

// Dashboard
router.get('/dashboard', admin.getDashboardData);

// Departments
router.get('/departments', admin.getDepartments);
router.post('/departments', admin.createDepartment);
router.put('/departments/:id', admin.updateDepartment);
router.delete('/departments/:id', admin.deleteDepartment);

// Courses
router.get('/courses', admin.getCourses);
router.post('/courses', admin.createCourse);
router.put('/courses/:id', admin.updateCourse);
router.delete('/courses/:id', admin.deleteCourse);

// Academic Years
router.get('/academic-years', admin.getAcademicYears);
router.post('/academic-years', admin.createAcademicYear);
router.put('/academic-years/:id', admin.updateAcademicYear);

// Semesters
router.get('/semesters', admin.getSemesters);
router.post('/semesters', admin.createSemester);
router.put('/semesters/:id', admin.updateSemester);

// Sections
router.get('/sections', admin.getSections);
router.post('/sections', admin.createSection);
router.put('/sections/:id', admin.updateSection);

// Subjects
router.get('/subjects', admin.getSubjects);
router.post('/subjects', admin.createSubject);
router.put('/subjects/:id', admin.updateSubject);

// Faculty Management
router.get('/faculty', admin.getFacultyList);
router.get('/faculty/:id', admin.getFacultyById);
router.post('/faculty', admin.createFaculty);
router.put('/faculty/:id', admin.updateFaculty);
router.put('/faculty/:id/reset-password', admin.resetFacultyPassword);
router.delete('/faculty/:id', admin.deleteFaculty);

// Student Management
router.get('/students', admin.getStudentList);
router.get('/students/stats', admin.getStudentStats);
router.get('/students/:id', admin.getStudentById);
router.post('/students', admin.createStudent);
router.post('/students/import', admin.importStudents);
router.put('/students/:id', admin.updateStudent);
router.delete('/students/:id', admin.deleteStudent);

// Faculty Assignments
router.get('/faculty-assignments', admin.getFacultyAssignments);
router.post('/faculty-assignments', admin.createFacultyAssignment);
router.put('/faculty-assignments/:id', admin.updateFacultyAssignment);
router.delete('/faculty-assignments/:id', admin.deleteFacultyAssignment);

// Assessment Types
router.get('/assessment-types', admin.getAssessmentTypes);
router.post('/assessment-types', admin.createAssessmentType);
router.put('/assessment-types/:id', admin.updateAssessmentType);
router.delete('/assessment-types/:id', admin.deleteAssessmentType);

// University-Wide Exams & Results
router.get('/exams', admin.getExams);
router.get('/results', admin.getResults);
router.put('/exams/:examId/unlock-results', admin.unlockResults);

// Audit Logs
router.get('/audit-logs', admin.getAuditLogs);

module.exports = router;

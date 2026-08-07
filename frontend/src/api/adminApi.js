import axiosClient from './axiosClient';

const adminApi = {
  // Dashboard
  getDashboardData: () => axiosClient.get('/admin/dashboard'),

  // Departments
  getDepartments: () => axiosClient.get('/admin/departments'),
  createDepartment: (data) => axiosClient.post('/admin/departments', data),
  updateDepartment: (id, data) => axiosClient.put(`/admin/departments/${id}`, data),
  deleteDepartment: (id) => axiosClient.delete(`/admin/departments/${id}`),

  // Courses
  getCourses: () => axiosClient.get('/admin/courses'),
  createCourse: (data) => axiosClient.post('/admin/courses', data),
  updateCourse: (id, data) => axiosClient.put(`/admin/courses/${id}`, data),
  deleteCourse: (id) => axiosClient.delete(`/admin/courses/${id}`),

  // Academic Years
  getAcademicYears: () => axiosClient.get('/admin/academic-years'),
  createAcademicYear: (data) => axiosClient.post('/admin/academic-years', data),
  updateAcademicYear: (id, data) => axiosClient.put(`/admin/academic-years/${id}`, data),

  // Semesters
  getSemesters: () => axiosClient.get('/admin/semesters'),
  createSemester: (data) => axiosClient.post('/admin/semesters', data),
  updateSemester: (id, data) => axiosClient.put(`/admin/semesters/${id}`, data),

  // Sections
  getSections: () => axiosClient.get('/admin/sections'),
  createSection: (data) => axiosClient.post('/admin/sections', data),
  updateSection: (id, data) => axiosClient.put(`/admin/sections/${id}`, data),

  // Subjects
  getSubjects: () => axiosClient.get('/admin/subjects'),
  createSubject: (data) => axiosClient.post('/admin/subjects', data),
  updateSubject: (id, data) => axiosClient.put(`/admin/subjects/${id}`, data),

  // Faculty
  getFacultyList: () => axiosClient.get('/admin/faculty'),
  getFacultyById: (id) => axiosClient.get(`/admin/faculty/${id}`),
  createFaculty: (data) => axiosClient.post('/admin/faculty', data),
  updateFaculty: (id, data) => axiosClient.put(`/admin/faculty/${id}`, data),
  resetFacultyPassword: (id) => axiosClient.put(`/admin/faculty/${id}/reset-password`),
  deleteFaculty: (id) => axiosClient.delete(`/admin/faculty/${id}`),

  // Students
  getStudentList: (params) => axiosClient.get('/admin/students', { params }),
  getStudentStats: () => axiosClient.get('/admin/students/stats'),
  getStudentById: (id) => axiosClient.get(`/admin/students/${id}`),
  createStudent: (data) => axiosClient.post('/admin/students', data),
  importStudents: (students) => axiosClient.post('/admin/students/import', { students }),
  updateStudent: (id, data) => axiosClient.put(`/admin/students/${id}`, data),
  deleteStudent: (id) => axiosClient.delete(`/admin/students/${id}`),

  // Faculty Assignments
  getFacultyAssignments: () => axiosClient.get('/admin/faculty-assignments'),
  createFacultyAssignment: (data) => axiosClient.post('/admin/faculty-assignments', data),
  updateFacultyAssignment: (id, data) => axiosClient.put(`/admin/faculty-assignments/${id}`, data),
  deleteFacultyAssignment: (id) => axiosClient.delete(`/admin/faculty-assignments/${id}`),

  // Assessment Types
  getAssessmentTypes: () => axiosClient.get('/admin/assessment-types'),
  createAssessmentType: (data) => axiosClient.post('/admin/assessment-types', data),
  updateAssessmentType: (id, data) => axiosClient.put(`/admin/assessment-types/${id}`, data),
  deleteAssessmentType: (id) => axiosClient.delete(`/admin/assessment-types/${id}`),

  // University-Wide Exams & Results
  getExams: () => axiosClient.get('/admin/exams'),
  getResults: () => axiosClient.get('/admin/results'),
  unlockResults: (examId) => axiosClient.put(`/admin/exams/${examId}/unlock-results`),

  // Audit Logs
  getAuditLogs: () => axiosClient.get('/admin/audit-logs'),
};

export default adminApi;

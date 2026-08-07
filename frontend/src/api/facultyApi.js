import axiosClient from './axiosClient';

const facultyApi = {
  // Dashboard
  getDashboardData: () => axiosClient.get('/faculty/dashboard'),

  // My Assignments
  getMyAssignments: () => axiosClient.get('/faculty/assignments'),
  getAssignmentStudents: (id) => axiosClient.get(`/faculty/assignments/${id}/students`),

  // Student Management
  getStudents: (params) => axiosClient.get('/faculty/students', { params }),
  getStudentById: (id) => axiosClient.get(`/faculty/students/${id}`),
  createStudent: (data) => axiosClient.post('/faculty/students', data),
  updateStudent: (id, data) => axiosClient.put(`/faculty/students/${id}`, data),
  resetStudentPassword: (id, data) => axiosClient.put(`/faculty/students/${id}/reset-password`, data),
  updateStudentStatus: (id, data) => axiosClient.put(`/faculty/students/${id}/status`, data),
  deleteStudent: (id) => axiosClient.delete(`/faculty/students/${id}`),
  importStudents: (data) => axiosClient.post('/faculty/students/import', data),
  exportStudents: () => axiosClient.get('/faculty/students/export'),

  // Exams
  getExams: (params) => axiosClient.get('/faculty/exams', { params }),
  getExam: (id) => axiosClient.get(`/faculty/exams/${id}`),
  createExam: (data) => axiosClient.post('/faculty/exams', data),
  updateExam: (id, data) => axiosClient.put(`/faculty/exams/${id}`, data),
  deleteExam: (id) => axiosClient.delete(`/faculty/exams/${id}`),
  publishExam: (id, data) => axiosClient.post(`/faculty/exams/${id}/publish`, data),

  // Question Banks
  getQuestionBanks: () => axiosClient.get('/faculty/question-banks'),
  createQuestionBank: (data) => axiosClient.post('/faculty/question-banks', data),

  // Questions
  getQuestions: (params) => axiosClient.get('/faculty/questions', { params }),
  getQuestion: (id) => axiosClient.get(`/faculty/questions/${id}`),
  createQuestion: (data) => axiosClient.post('/faculty/questions', data),
  updateQuestion: (id, data) => axiosClient.put(`/faculty/questions/${id}`, data),
  deleteQuestion: (id) => axiosClient.delete(`/faculty/questions/${id}`),

  // Import/Export
  importQuestions: (data) => axiosClient.post('/faculty/questions/bulk', data),
  exportQuestions: (params) => axiosClient.get('/faculty/questions/export', {
    params,
    responseType: 'blob',
  }),

  // Categories
  getCategories: () => axiosClient.get('/faculty/categories'),
  getCategory: (id) => axiosClient.get(`/faculty/categories/${id}`),
  createCategory: (data) => axiosClient.post('/faculty/categories', data),
  updateCategory: (id, data) => axiosClient.put(`/faculty/categories/${id}`, data),
  deleteCategory: (id) => axiosClient.delete(`/faculty/categories/${id}`),
  getCategoryAnalytics: (id) => axiosClient.get(`/faculty/categories/${id}/analytics`),

  // Monitoring
  getMonitoringData: () => axiosClient.get('/faculty/monitoring'),

  // Results & Evaluation
  getResults: (params) => axiosClient.get('/faculty/results', { params }),
  getResultsDashboard: () => axiosClient.get('/faculty/results/dashboard'),
  getPublishReadyExams: () => axiosClient.get('/faculty/results/publish-ready'),
  getExamSubmissions: (examId) => axiosClient.get(`/faculty/results/exam/${examId}`),
  getSubmissionDetail: (sessionId) => axiosClient.get(`/faculty/results/submission/${sessionId}`),
  evaluateAnswer: (answerId, data) => axiosClient.put(`/faculty/results/answer/${answerId}`, data),
  saveEvaluationDraft: (sessionId, evaluations) => axiosClient.put(`/faculty/results/submission/${sessionId}/draft`, { evaluations }),
  completeEvaluation: (sessionId) => axiosClient.post(`/faculty/results/submission/${sessionId}/complete`),
  publishResults: (examId) => axiosClient.post(`/faculty/results/${examId}/publish`),
  unpublishResults: (examId) => axiosClient.post(`/faculty/results/${examId}/unpublish`),
  getExamAnalytics: (examId) => axiosClient.get(`/faculty/results/exam/${examId}/analytics`),
  exportResults: (examId, format) => axiosClient.get(`/faculty/results/exam/${examId}/export`, {
    params: { format },
    responseType: 'blob',
  }),

  // Reports
  getReports: (params) => axiosClient.get('/faculty/reports', { params }),
};

export default facultyApi;

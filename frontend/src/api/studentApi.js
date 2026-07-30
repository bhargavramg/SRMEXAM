import axiosClient from './axiosClient';

const studentApi = {
  // Dashboard & Profile
  getDashboardData: () => axiosClient.get('/student/dashboard'),
  getProfile: () => axiosClient.get('/student/profile'),

  // Exam Listings
  getUpcomingExams: () => axiosClient.get('/student/exams'),
  getLiveExams: () => axiosClient.get('/student/exams/live'),
  getExamHistory: () => axiosClient.get('/student/exams/history'),

  // Exam Details & Config
  getExamDetails: (id) => axiosClient.get(`/student/exam/${id}`),
  getExamConfig: (id) => axiosClient.get(`/student/exam/${id}/config`),
  startExamSession: (id) => axiosClient.post(`/student/exam/${id}/start`),

  // Exam Session
  getExamQuestions: (sessionId) => axiosClient.get(`/student/session/${sessionId}`),
  autoSaveAnswers: (sessionId, answers) => axiosClient.post(`/student/session/${sessionId}/autosave`, { answers }),
  logExamActivity: (sessionId, action, details = null, type = null) => 
    axiosClient.post(`/student/session/${sessionId}/log`, { action, details, type }),
  submitExam: (sessionId, answers, forced = false) => 
    axiosClient.post(`/student/session/${sessionId}/submit`, { answers, forced }),

  // Results
  getResults: () => axiosClient.get('/student/results'),

  // Notifications
  getNotifications: () => axiosClient.get('/student/notifications'),
  markNotificationRead: (id) => axiosClient.put(`/student/notifications/${id}/read`),
};

export default studentApi;

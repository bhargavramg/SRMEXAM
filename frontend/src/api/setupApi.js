import axiosClient from './axiosClient';

const setupApi = {
  // Public — no auth needed
  getSetupStatus: () => axiosClient.get('/setup/status'),

  // Step 1: College Information
  saveCollegeInfo: (data) => axiosClient.post('/setup/college-info', data),

  // Step 2: Academic / Subject Setup
  saveSubjectSetup: (data) => axiosClient.post('/setup/subject', data),

  // Step 3: Faculty Setup
  saveFacultySetup: (data) => axiosClient.post('/setup/faculty', data),

  // Step 4: Student Management
  addStudent: (data) => axiosClient.post('/setup/students/add', data),
  importStudents: (students) => axiosClient.post('/setup/students/import', { students }),

  // Review & Summary
  getSetupSummary: () => axiosClient.get('/setup/summary'),

  // Complete Setup
  completeSetup: () => axiosClient.post('/setup/complete'),
};

export default setupApi;

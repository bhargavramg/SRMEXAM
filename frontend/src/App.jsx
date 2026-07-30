import { lazy, Suspense } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { Box, Typography, Button } from '@mui/material'
import Login from './pages/Login'
import DashboardLayout from './layouts/DashboardLayout'
import SecureExamLayout from './layouts/SecureExamLayout'
import FacultyLayout from './layouts/FacultyLayout'

import { AuthProvider } from './contexts/AuthContext'

// Student Pages
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'))
const ExamLobby = lazy(() => import('./pages/student/ExamLobby'))
const ExamInterface = lazy(() => import('./pages/student/ExamInterface'))
const ExamResult = lazy(() => import('./pages/student/ExamResult'))
const StudentExams = lazy(() => import('./pages/student/StudentExams'))
const StudentResultsList = lazy(() => import('./pages/student/StudentResultsList'))
const StudentSettings = lazy(() => import('./pages/student/StudentSettings'))

// Faculty Pages
const FacultyDashboard = lazy(() => import('./pages/faculty/Dashboard'))
const QuestionBank = lazy(() => import('./pages/faculty/QuestionBank'))
const CreateExamWizard = lazy(() => import('./pages/faculty/CreateExamWizard'))
const ManageExams = lazy(() => import('./pages/faculty/ManageExams'))
const QuestionCategories = lazy(() => import('./pages/faculty/QuestionCategories'))
const StudentResults = lazy(() => import('./pages/faculty/StudentResults'))
const LiveMonitoring = lazy(() => import('./pages/faculty/LiveMonitoring'))
const ExamSchedule = lazy(() => import('./pages/faculty/ExamSchedule'))
const Reports = lazy(() => import('./pages/faculty/Reports'))
const Notifications = lazy(() => import('./pages/faculty/Notifications'))
const Profile = lazy(() => import('./pages/faculty/Profile'))
const Settings = lazy(() => import('./pages/faculty/Settings'))

function App() {
  const navigate = useNavigate();

  return (
    <AuthProvider>
      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Typography>Loading...</Typography></Box>}>
        <Routes>
          <Route path="/" element={
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 2 }}>
              <Typography variant="h2" color="primary">Welcome to ExamPortal</Typography>
              <Typography variant="h6" color="text.secondary">Enterprise College Examination System</Typography>
              <Button variant="contained" size="large" onClick={() => navigate('/login')}>Login to Dashboard</Button>
            </Box>
          } />
          <Route path="/login" element={<Login />} />
          
          {/* Student Routes */}
          <Route path="/student" element={<DashboardLayout />}>
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="exams" element={<StudentExams />} />
            <Route path="results" element={<StudentResultsList />} />
            <Route path="settings" element={<StudentSettings />} />
            <Route path="exam/:examId/lobby" element={<ExamLobby />} />
            <Route path="exam/:examId/result" element={<ExamResult />} />
          </Route>
          
          {/* Secure Exam Routes - No Sidebar */}
          <Route path="/student" element={<SecureExamLayout />}>
            <Route path="exam/:examId/take/:sessionId" element={<ExamInterface />} />
          </Route>
  
          {/* Faculty Routes */}
          <Route path="/faculty" element={<FacultyLayout />}>
            <Route path="dashboard" element={<FacultyDashboard />} />
            <Route path="question-bank" element={<QuestionBank />} />
            <Route path="create-exam" element={<CreateExamWizard />} />
            <Route path="exams" element={<ManageExams />} />
            <Route path="categories" element={<QuestionCategories />} />
            <Route path="results" element={<StudentResults />} />
            <Route path="live-monitoring/:examId" element={<LiveMonitoring />} />
            <Route path="schedule" element={<ExamSchedule />} />
            <Route path="reports" element={<Reports />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}

export default App

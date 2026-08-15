import { lazy, Suspense, useState, useEffect } from 'react'
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom'
import { Box, Typography, Button, CircularProgress, CssBaseline, ThemeProvider } from '@mui/material'
import { SnackbarProvider } from 'notistack'
import Login from './pages/Login'
import SetupWizard from './pages/setup/SetupWizard'
import DashboardLayout from './layouts/DashboardLayout'
import SecureExamLayout from './layouts/SecureExamLayout'
import FacultyLayout from './layouts/FacultyLayout'
import AdminLayout from './layouts/AdminLayout'

import { AuthProvider } from './contexts/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import setupApi from './api/setupApi'
import { useAuth } from './contexts/AuthContext'
import theme from './theme'
import { RefreshProvider } from './contexts/RefreshContext'
import { SessionTimeoutProvider } from './contexts/SessionTimeoutContext'

const ForceChangePassword = lazy(() => import('./pages/auth/ForceChangePassword'))

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const AcademicManagement = lazy(() => import('./pages/admin/AcademicManagement'))
const FacultyManagement = lazy(() => import('./pages/admin/FacultyManagement'))
const FacultyDetails = lazy(() => import('./pages/admin/FacultyDetails'))
const StudentManagement = lazy(() => import('./pages/admin/StudentManagement'))
const StudentDetails = lazy(() => import('./pages/admin/StudentDetails'))
const ExaminationManagement = lazy(() => import('./pages/admin/ExaminationManagement'))
const GlobalResults = lazy(() => import('./pages/admin/GlobalResults'))
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'))
const SystemSettings = lazy(() => import('./pages/admin/SystemSettings'))
// Student Pages
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'))
const ExamInstructions = lazy(() => import('./pages/student/ExamInstructions'))
const ExamLobby = lazy(() => import('./pages/student/ExamLobby'))
const ExamInterface = lazy(() => import('./pages/student/ExamInterface'))
const ExamResult = lazy(() => import('./pages/student/ExamResult'))
const StudentExams = lazy(() => import('./pages/student/StudentExams'))
const StudentResultsList = lazy(() => import('./pages/student/StudentResultsList'))
const StudentSettings = lazy(() => import('./pages/student/StudentSettings'))

// Faculty Pages
const FacultyDashboard = lazy(() => import('./pages/faculty/Dashboard'))
const QuestionBank = lazy(() => import('./pages/faculty/QuestionBank'))
const FacultyStudentManagement = lazy(() => import('./pages/faculty/StudentManagement'))
const CreateExamWizard = lazy(() => import('./pages/faculty/CreateExamWizard'))
const ManageExams = lazy(() => import('./pages/faculty/ManageExams'))
const QuestionCategories = lazy(() => import('./pages/faculty/QuestionCategories'))
const StudentResults = lazy(() => import('./pages/faculty/StudentResults'))
const SubmissionEvaluator = lazy(() => import('./pages/faculty/SubmissionEvaluator'))
const ExamAnalytics = lazy(() => import('./pages/faculty/ExamAnalytics'))
const LiveMonitoring = lazy(() => import('./pages/faculty/LiveMonitoring'))
const ExamSchedule = lazy(() => import('./pages/faculty/ExamSchedule'))
const Reports = lazy(() => import('./pages/faculty/Reports'))
const Notifications = lazy(() => import('./pages/faculty/Notifications'))
const Profile = lazy(() => import('./pages/faculty/Profile'))
const Settings = lazy(() => import('./pages/faculty/Settings'))

// ============================================================================
// SETUP GUARD — Checks setup status ONCE on mount, caches the result
// ============================================================================
function SetupGuard({ children }) {
  const [checking, setChecking] = useState(true);
  const [setupCompleted, setSetupCompleted] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Don't redirect if already on /setup
    if (location.pathname === '/setup') {
      setChecking(false);
      return;
    }

    // Only check once — if setupCompleted is already determined, skip
    if (setupCompleted !== null) {
      setChecking(false);
      return;
    }

    setupApi.getSetupStatus()
      .then(data => {
        setSetupCompleted(data.setupCompleted);
        if (!data.setupCompleted) {
          navigate('/setup', { replace: true });
        }
      })
      .catch(() => {
        // If API fails, allow normal flow
        setSetupCompleted(true);
      })
      .finally(() => setChecking(false));
  }, []); // Run ONCE on mount — no dependency on location.pathname

  if (checking) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: '#FAFCFF' }}>
        <CircularProgress />
      </Box>
    );
  }

  return children;
}

// ============================================================================
// FIRST LOGIN GUARD — Redirects to /force-change-password if firstLogin is true
// ============================================================================
function FirstLoginGuard({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (user && user.firstLogin && location.pathname !== '/force-change-password') {
    return <Navigate to="/force-change-password" replace />;
  }

  return children;
}

// ============================================================================
// ROLE GUARD — Ensures user has the correct role for the route section
// Redirects wrong-role users to their correct dashboard.
// Never redirects because of API failure — only for invalid session or wrong role.
// ============================================================================
function RoleGuard({ allowedRoles, children }) {
  const { user } = useAuth();

  // Not logged in — redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // User has the correct role — allow through
  if (allowedRoles.includes(user.role)) {
    return children;
  }

  // Wrong role — redirect to the user's correct dashboard
  const roleDashboard = {
    SUPER_ADMIN: '/admin/dashboard',
    ADMIN: '/admin/dashboard',
    FACULTY: '/faculty/dashboard',
    STUDENT: '/student/dashboard',
  };

  return <Navigate to={roleDashboard[user.role] || '/login'} replace />;
}

// ============================================================================
// AUTH GUARD — Ensures user is logged in (any role)
// ============================================================================
function AuthGuard({ children }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  const navigate = useNavigate();

  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <CssBaseline />
        <AuthProvider>
          <SessionTimeoutProvider>
            <RefreshProvider>
              <ErrorBoundary>
                <SetupGuard>
              <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>}>
                <Routes>
                  {/* Setup Wizard Route */}
                  <Route path="/setup" element={<SetupWizard />} />

                  <Route path="/" element={
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 2 }}>
                      <Typography variant="h2" color="primary">Welcome to ExamPortal</Typography>
                      <Typography variant="h6" color="text.secondary">Enterprise College Examination System</Typography>
                      <Button variant="contained" size="large" onClick={() => navigate('/login')}>Login to Dashboard</Button>
                    </Box>
                  } />
                  <Route path="/login" element={<Login />} />
                  <Route path="/force-change-password" element={
                    <AuthGuard>
                      <ForceChangePassword />
                    </AuthGuard>
                  } />
                  
                  {/* Student Routes — STUDENT role only */}
                  <Route path="/student" element={
                    <RoleGuard allowedRoles={['STUDENT']}>
                      <FirstLoginGuard>
                        <DashboardLayout />
                      </FirstLoginGuard>
                    </RoleGuard>
                  }>
                    <Route path="dashboard" element={<StudentDashboard />} />
                    <Route path="exams" element={<StudentExams />} />
                    <Route path="results" element={<StudentResultsList />} />
                    <Route path="settings" element={<StudentSettings />} />
                    <Route path="exam/:examId/instructions" element={<ExamInstructions />} />
                    <Route path="exam/:examId/lobby" element={<ExamLobby />} />
                    <Route path="exam/:examId/result" element={<ExamResult />} />
                  </Route>
                  
                  {/* Secure Exam Routes - No Sidebar */}
                  <Route path="/student" element={
                    <RoleGuard allowedRoles={['STUDENT']}>
                      <FirstLoginGuard>
                        <SecureExamLayout />
                      </FirstLoginGuard>
                    </RoleGuard>
                  }>
                    <Route path="exam/:examId/take/:sessionId" element={<ExamInterface />} />
                  </Route>
          
                  {/* Faculty Routes — FACULTY role only */}
                  <Route path="/faculty" element={
                    <RoleGuard allowedRoles={['FACULTY']}>
                      <FirstLoginGuard>
                        <FacultyLayout />
                      </FirstLoginGuard>
                    </RoleGuard>
                  }>
                    <Route path="dashboard" element={<FacultyDashboard />} />
                    <Route path="question-bank" element={<QuestionBank />} />
                    <Route path="students" element={<FacultyStudentManagement />} />
                    <Route path="create-exam" element={<CreateExamWizard />} />
                    <Route path="exams" element={<ManageExams />} />
                    <Route path="categories" element={<QuestionCategories />} />
                    <Route path="results" element={<StudentResults />} />
                    <Route path="results/evaluate/:sessionId" element={<SubmissionEvaluator />} />
                    <Route path="results/analytics/:examId" element={<ExamAnalytics />} />
                    <Route path="live-monitoring" element={<Navigate to="/faculty/exams" replace />} />
                    <Route path="live-monitoring/:examId" element={<LiveMonitoring />} />
                    <Route path="schedule" element={<ExamSchedule />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="notifications" element={<Notifications />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>
                  {/* Admin Routes — SUPER_ADMIN and ADMIN roles */}
                  <Route path="/admin" element={
                    <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                      <FirstLoginGuard>
                        <AdminLayout />
                      </FirstLoginGuard>
                    </RoleGuard>
                  }>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="academic" element={<AcademicManagement />} />
                    <Route path="faculty" element={<FacultyManagement />} />
                    <Route path="faculty/:id" element={<FacultyDetails />} />
                    <Route path="students" element={<StudentManagement />} />
                    <Route path="students/:id" element={<StudentDetails />} />
                    <Route path="exams" element={<ExaminationManagement />} />
                    <Route path="results" element={<GlobalResults />} />
                    <Route path="audit-logs" element={<AuditLogs />} />
                    <Route path="settings" element={<SystemSettings />} />
                  </Route>
                  {/* Catch-all route — redirect to home */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </SetupGuard>
              </ErrorBoundary>
            </RefreshProvider>
          </SessionTimeoutProvider>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  )
}

export default App

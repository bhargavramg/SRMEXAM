import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Stepper, Step, StepLabel, Button, TextField,
  Card, CardContent, Paper, Chip, Stack, Alert, AlertTitle,
  Grid, Divider, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Tabs, Tab, LinearProgress, InputAdornment,
} from '@mui/material';
import {
  School, Business, Person, Group, CheckCircle,
  CloudUpload, Download, Add, Delete, ArrowBack,
  ArrowForward, Visibility, VisibilityOff, Lock,
  Email, Badge, Phone, InsertDriveFile, Warning,
} from '@mui/icons-material';
import { GraduationCap, BookOpen, Users, ShieldCheck } from 'lucide-react';
import authApi from '../../api/authApi';
import setupApi from '../../api/setupApi';
import * as XLSX from 'xlsx';

const steps = [
  { label: 'College Information', icon: <School /> },
  { label: 'Academic Setup', icon: <BookOpen size={20} /> },
  { label: 'Faculty Setup', icon: <Person /> },
  { label: 'Student Import', icon: <Group /> },
  { label: 'Review & Finish', icon: <CheckCircle /> },
];

// ============================================================================
// MAIN SETUP WIZARD COMPONENT
// ============================================================================
const SetupWizard = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loginEmail, setLoginEmail] = useState('admin@examportal.com');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step data
  const [collegeData, setCollegeData] = useState({ collegeName: '', academicYear: '', collegeLogo: '' });
  const [academicData, setAcademicData] = useState({
    departmentName: 'Computer Science Engineering',
    departmentCode: 'CSE',
    courseName: 'B.Tech CSE (Cyber Security)',
    courseCode: 'BTECH-CSE-CS',
    courseDuration: 4,
    subjectName: 'Hackers Mind',
    subjectCode: 'CS-HM-101',
    subjectCredits: 3,
    subjectType: 'THEORY',
    semesterNumber: 1,
    sectionName: 'A',
    sectionCapacity: 80,
  });
  const [facultyData, setFacultyData] = useState({ name: '', email: '', employeeId: '', password: '', phone: '' });
  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [stepErrors, setStepErrors] = useState({});
  const [stepSuccess, setStepSuccess] = useState({});
  const [studentTab, setStudentTab] = useState(0);
  const [manualStudent, setManualStudent] = useState({ name: '', email: '', registerNo: '', password: '' });
  const [importResults, setImportResults] = useState(null);
  const [parsedFile, setParsedFile] = useState([]);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  // Check initial setup status and resume from last step
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
    setupApi.getSetupStatus().then(data => {
      if (data.currentStep > 0) {
        setActiveStep(data.currentStep);
      }
    }).catch(() => {});
  }, []);

  // ============================================================================
  // AUTHENTICATION (Admin login within wizard)
  // ============================================================================
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const response = await authApi.login({ identifier: loginEmail, password: loginPassword });
      if (response?.accessToken && response?.user) {
        if (response.user.role !== 'SUPER_ADMIN') {
          setAuthError('Only the Super Admin can run the Setup Wizard.');
          setAuthLoading(false);
          return;
        }
        localStorage.setItem('token', response.accessToken);
        localStorage.setItem('user', JSON.stringify(response.user));
        setIsAuthenticated(true);
      }
    } catch (err) {
      setAuthError(err?.error || err?.response?.data?.error || 'Login failed. Check your credentials.');
    }
    setAuthLoading(false);
  };

  // ============================================================================
  // STEP HANDLERS
  // ============================================================================
  const clearStepError = () => setStepErrors(prev => ({ ...prev, [activeStep]: null }));

  const handleSaveCollegeInfo = async () => {
    clearStepError();
    if (!collegeData.collegeName.trim()) {
      setStepErrors(prev => ({ ...prev, 0: 'College name is required' }));
      return false;
    }
    if (!collegeData.academicYear.trim()) {
      setStepErrors(prev => ({ ...prev, 0: 'Academic year is required' }));
      return false;
    }
    setLoading(true);
    try {
      await setupApi.saveCollegeInfo(collegeData);
      setStepSuccess(prev => ({ ...prev, 0: true }));
      setLoading(false);
      return true;
    } catch (err) {
      setStepErrors(prev => ({ ...prev, 0: err?.error || 'Failed to save college information' }));
      setLoading(false);
      return false;
    }
  };

  const handleSaveAcademicInfo = async () => {
    clearStepError();
    const required = ['departmentName', 'departmentCode', 'courseName', 'courseCode', 'subjectName', 'subjectCode'];
    for (const field of required) {
      if (!academicData[field]?.trim()) {
        setStepErrors(prev => ({ ...prev, 1: `${field.replace(/([A-Z])/g, ' $1').trim()} is required` }));
        return false;
      }
    }
    setLoading(true);
    try {
      await setupApi.saveSubjectSetup(academicData);
      setStepSuccess(prev => ({ ...prev, 1: true }));
      setLoading(false);
      return true;
    } catch (err) {
      setStepErrors(prev => ({ ...prev, 1: err?.error || 'Failed to save academic information' }));
      setLoading(false);
      return false;
    }
  };

  const handleSaveFaculty = async () => {
    clearStepError();
    if (!facultyData.name.trim()) {
      setStepErrors(prev => ({ ...prev, 2: 'Faculty name is required' }));
      return false;
    }
    if (!facultyData.email.trim()) {
      setStepErrors(prev => ({ ...prev, 2: 'Faculty email is required' }));
      return false;
    }
    if (!facultyData.password || facultyData.password.length < 6) {
      setStepErrors(prev => ({ ...prev, 2: 'Password must be at least 6 characters' }));
      return false;
    }
    setLoading(true);
    try {
      await setupApi.saveFacultySetup(facultyData);
      setStepSuccess(prev => ({ ...prev, 2: true }));
      setLoading(false);
      return true;
    } catch (err) {
      setStepErrors(prev => ({ ...prev, 2: err?.error || 'Failed to create faculty account' }));
      setLoading(false);
      return false;
    }
  };

  const handleNext = async () => {
    let success = true;
    if (activeStep === 0) success = await handleSaveCollegeInfo();
    else if (activeStep === 1) success = await handleSaveAcademicInfo();
    else if (activeStep === 2) success = await handleSaveFaculty();
    else if (activeStep === 3) {
      const totalStudents = students.length;
      if (totalStudents === 0) {
        setStepErrors(prev => ({ ...prev, 3: 'Please add at least one student before proceeding' }));
        return;
      }
      success = true;
    }

    if (success) {
      if (activeStep === 3) {
        // Load summary before review step
        try {
          const summaryData = await setupApi.getSetupSummary();
          setSummary(summaryData);
        } catch (err) {
          console.error('Failed to load summary:', err);
        }
      }
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  // ============================================================================
  // STUDENT MANAGEMENT
  // ============================================================================
  const handleAddManualStudent = async () => {
    setStepErrors(prev => ({ ...prev, 3: null }));
    if (!manualStudent.name.trim() || !manualStudent.email.trim() || !manualStudent.registerNo.trim()) {
      setStepErrors(prev => ({ ...prev, 3: 'Name, email, and register number are required' }));
      return;
    }
    setLoading(true);
    try {
      const result = await setupApi.addStudent(manualStudent);
      setStudents(prev => [...prev, result.student]);
      setManualStudent({ name: '', email: '', registerNo: '', password: '' });
    } catch (err) {
      setStepErrors(prev => ({ ...prev, 3: err?.error || 'Failed to add student' }));
    }
    setLoading(false);
  };

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStepErrors(prev => ({ ...prev, 3: null }));

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
        
        console.log(`[DEBUG] Excel parsing: Found ${jsonData.length} raw rows in the sheet.`);

        // Normalize column headers
        const normalized = jsonData.map(row => {
          const keys = Object.keys(row);
          const findKey = (patterns) => keys.find(k =>
            patterns.some(p => k.toLowerCase().replace(/[_\s]/g, '').includes(p))
          );
          return {
            registerNo: String(row[findKey(['registerno', 'registernum', 'regnumber', 'regno', 'register'])] || '').trim(),
            name: String(row[findKey(['studentname', 'name', 'fullname'])] || '').trim(),
            email: String(row[findKey(['email', 'emailaddress', 'emailid'])] || '').trim(),
            password: String(row[findKey(['password', 'pwd', 'pass'])] || '').trim(),
          };
        }).filter(r => r.name || r.email || r.registerNo);
        
        console.log(`[DEBUG] Excel parsing: ${normalized.length} rows were valid. Skipped ${jsonData.length - normalized.length} rows due to missing fields.`);

        setParsedFile(normalized);
      } catch (err) {
        setStepErrors(prev => ({ ...prev, 3: 'Failed to parse file. Please ensure it is a valid CSV or Excel file.' }));
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleImportParsed = async () => {
    if (parsedFile.length === 0) {
      setStepErrors(prev => ({ ...prev, 3: 'No data to import. Please upload a file first.' }));
      return;
    }
    setLoading(true);
    setStepErrors(prev => ({ ...prev, 3: null }));
    try {
      const result = await setupApi.importStudents(parsedFile);
      setImportResults(result.results);
      setStudents(prev => [...prev, ...(result.results?.successful || [])]);
      setParsedFile([]);
      setFileName('');
    } catch (err) {
      setStepErrors(prev => ({ ...prev, 3: err?.error || 'Import failed' }));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/templates/student_import_template.csv';
    link.download = 'student_import_template.csv';
    link.click();
  };

  // ============================================================================
  // COMPLETE SETUP
  // ============================================================================
  const handleCompleteSetup = async () => {
    setLoading(true);
    try {
      await setupApi.completeSetup();
      // Clear auth and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } catch (err) {
      setStepErrors(prev => ({ ...prev, 4: err?.error || 'Failed to complete setup' }));
      setLoading(false);
    }
  };

  // ============================================================================
  // LOGIN SCREEN (shown before wizard)
  // ============================================================================
  if (!isAuthenticated) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', background: 'linear-gradient(135deg, #0D47A1 0%, #1565C0 40%, #42A5F5 100%)' }}>
        <Box sx={{ flex: 1, display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'white', p: 6 }}>
          <ShieldCheck size={100} strokeWidth={1.2} style={{ marginBottom: 24 }} />
          <Typography variant="h3" fontWeight={700} sx={{ mb: 2 }}>First-Time Setup</Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
            Welcome! Please log in with the Super Admin account to configure your Examination Portal.
          </Typography>
        </Box>
        <Box sx={{ width: { xs: '100%', md: 480 }, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'white', p: 4 }}>
          <Paper elevation={0} sx={{ width: '100%', maxWidth: 400, p: { xs: 2, md: 0 } }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Lock sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" fontWeight={700}>Admin Login</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Enter Super Admin credentials to begin setup
              </Typography>
            </Box>
            {authError && (
              <Alert severity="error" sx={{ mb: 2 }}>{authError}</Alert>
            )}
            <form onSubmit={handleLogin}>
              <TextField
                fullWidth label="Email" value={loginEmail} margin="normal"
                onChange={(e) => setLoginEmail(e.target.value)} required
                InputProps={{ startAdornment: <InputAdornment position="start"><Email fontSize="small" /></InputAdornment> }}
              />
              <TextField
                fullWidth label="Password" margin="normal" required
                type={showPassword ? 'text' : 'password'}
                value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Lock fontSize="small" /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button type="submit" variant="contained" fullWidth size="large" disabled={authLoading}
                sx={{ mt: 3, py: 1.5, fontSize: '1rem' }}
              >
                {authLoading ? <CircularProgress size={24} /> : 'Login & Start Setup'}
              </Button>
            </form>
          </Paper>
        </Box>
      </Box>
    );
  }

  // ============================================================================
  // WIZARD UI
  // ============================================================================
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F5F8FF' }}>
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg, #0D47A1 0%, #1565C0 100%)', color: 'white', py: 3, px: 4, boxShadow: '0 4px 20px rgba(13,71,161,0.3)' }}>
        <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
          <Typography variant="h5" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <GraduationCap size={28} /> Examination Portal — Setup Wizard
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
            Configure your system in a few simple steps
          </Typography>
        </Box>
      </Box>

      {/* Stepper */}
      <Box sx={{ maxWidth: 1100, mx: 'auto', px: 3, mt: 4, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel sx={{
          '& .MuiStepLabel-label': { mt: 1 },
          '& .MuiStepIcon-root.Mui-completed': { color: '#2E7D32' },
        }}>
          {steps.map((step) => (
            <Step key={step.label}>
              <StepLabel>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* Step Content */}
      <Box sx={{ maxWidth: 900, mx: 'auto', px: 3, pb: 6 }}>
        {/* Error Alert */}
        {stepErrors[activeStep] && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={clearStepError}>
            <AlertTitle>Error</AlertTitle>
            {stepErrors[activeStep]}
          </Alert>
        )}

        {/* Success Alert */}
        {stepSuccess[activeStep] && (
          <Alert severity="success" sx={{ mb: 3 }}>Step completed successfully!</Alert>
        )}

        {/* ============================================================ */}
        {/* STEP 1: COLLEGE INFORMATION */}
        {/* ============================================================ */}
        {activeStep === 0 && (
          <Card sx={{ boxShadow: '0 8px 32px rgba(21,101,192,0.1)' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <School color="primary" /> College Information
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Enter your institution's basic details
              </Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth label="College / Institution Name" required
                    placeholder="e.g. SRM Institute of Science and Technology"
                    value={collegeData.collegeName}
                    onChange={(e) => setCollegeData(prev => ({ ...prev, collegeName: e.target.value }))}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Academic Year" required
                    placeholder="e.g. 2026-2027"
                    value={collegeData.academicYear}
                    onChange={(e) => setCollegeData(prev => ({ ...prev, academicYear: e.target.value }))}
                    helperText="Format: YYYY-YYYY (e.g. 2026-2027)"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="College Logo URL (Optional)"
                    placeholder="https://example.com/logo.png"
                    value={collegeData.collegeLogo}
                    onChange={(e) => setCollegeData(prev => ({ ...prev, collegeLogo: e.target.value }))}
                    helperText="Paste a public URL to your college logo"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* ============================================================ */}
        {/* STEP 2: ACADEMIC SETUP */}
        {/* ============================================================ */}
        {activeStep === 1 && (
          <Card sx={{ boxShadow: '0 8px 32px rgba(21,101,192,0.1)' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Business color="primary" /> Academic Setup
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Configure your department, course, and subject. Fields are pre-filled for the current scope.
              </Typography>
              <Alert severity="info" sx={{ mb: 4 }}>
                All fields are editable. The system supports multiple departments and courses in future versions.
              </Alert>

              {/* Department */}
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: 'primary.dark' }}>Department</Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 8 }}>
                  <TextField fullWidth label="Department Name" required value={academicData.departmentName}
                    onChange={(e) => setAcademicData(prev => ({ ...prev, departmentName: e.target.value }))}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label="Department Code" required value={academicData.departmentCode}
                    onChange={(e) => setAcademicData(prev => ({ ...prev, departmentCode: e.target.value }))}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              {/* Course */}
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: 'primary.dark' }}>Course</Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Course Name" required value={academicData.courseName}
                    onChange={(e) => setAcademicData(prev => ({ ...prev, courseName: e.target.value }))}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField fullWidth label="Course Code" required value={academicData.courseCode}
                    onChange={(e) => setAcademicData(prev => ({ ...prev, courseCode: e.target.value }))}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField fullWidth label="Duration (Years)" type="number" value={academicData.courseDuration}
                    onChange={(e) => setAcademicData(prev => ({ ...prev, courseDuration: parseInt(e.target.value) || 4 }))}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              {/* Subject */}
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: 'primary.dark' }}>Subject</Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Subject Name" required value={academicData.subjectName}
                    onChange={(e) => setAcademicData(prev => ({ ...prev, subjectName: e.target.value }))}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField fullWidth label="Subject Code" required value={academicData.subjectCode}
                    onChange={(e) => setAcademicData(prev => ({ ...prev, subjectCode: e.target.value }))}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField fullWidth label="Credits" type="number" value={academicData.subjectCredits}
                    onChange={(e) => setAcademicData(prev => ({ ...prev, subjectCredits: parseInt(e.target.value) || 3 }))}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              {/* Semester & Section */}
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: 'primary.dark' }}>Semester & Section</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label="Semester Number" type="number" value={academicData.semesterNumber}
                    onChange={(e) => setAcademicData(prev => ({ ...prev, semesterNumber: parseInt(e.target.value) || 1 }))}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label="Section Name" value={academicData.sectionName}
                    onChange={(e) => setAcademicData(prev => ({ ...prev, sectionName: e.target.value }))}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label="Section Capacity" type="number" value={academicData.sectionCapacity}
                    onChange={(e) => setAcademicData(prev => ({ ...prev, sectionCapacity: parseInt(e.target.value) || 80 }))}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* ============================================================ */}
        {/* STEP 3: FACULTY SETUP */}
        {/* ============================================================ */}
        {activeStep === 2 && (
          <Card sx={{ boxShadow: '0 8px 32px rgba(21,101,192,0.1)' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person color="primary" /> Faculty Account
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Create the faculty account who will manage exams for this subject.
              </Typography>
              <Alert severity="info" sx={{ mb: 4 }}>
                The faculty will be automatically assigned to the subject and section configured in the previous step.
                Additional faculty members can be added later through the Admin Portal.
              </Alert>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Full Name" required value={facultyData.name}
                    onChange={(e) => setFacultyData(prev => ({ ...prev, name: e.target.value }))}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Person fontSize="small" /></InputAdornment> }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Email Address" required type="email" value={facultyData.email}
                    onChange={(e) => setFacultyData(prev => ({ ...prev, email: e.target.value }))}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Email fontSize="small" /></InputAdornment> }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Employee ID (Optional)" value={facultyData.employeeId}
                    onChange={(e) => setFacultyData(prev => ({ ...prev, employeeId: e.target.value }))}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Badge fontSize="small" /></InputAdornment> }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Phone (Optional)" value={facultyData.phone}
                    onChange={(e) => setFacultyData(prev => ({ ...prev, phone: e.target.value }))}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Phone fontSize="small" /></InputAdornment> }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth label="Password" required type={showPassword ? 'text' : 'password'}
                    value={facultyData.password}
                    onChange={(e) => setFacultyData(prev => ({ ...prev, password: e.target.value }))}
                    helperText="Minimum 6 characters. The faculty will use this to log in."
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Lock fontSize="small" /></InputAdornment>,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* ============================================================ */}
        {/* STEP 4: STUDENT IMPORT */}
        {/* ============================================================ */}
        {activeStep === 3 && (
          <Card sx={{ boxShadow: '0 8px 32px rgba(21,101,192,0.1)' }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="h5" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Group color="primary" /> Student Import
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Add students manually or import from CSV / Excel (.xlsx)
                  </Typography>
                </Box>
                <Chip
                  icon={<Users size={16} />}
                  label={`${students.length} student${students.length !== 1 ? 's' : ''} added`}
                  color={students.length > 0 ? 'success' : 'default'}
                  variant={students.length > 0 ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 600 }}
                />
              </Box>

              <Tabs value={studentTab} onChange={(_, v) => setStudentTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Tab label="Add Manually" icon={<Person fontSize="small" />} iconPosition="start" />
                <Tab label="Import CSV / Excel" icon={<CloudUpload fontSize="small" />} iconPosition="start" />
              </Tabs>

              {/* Tab 1: Manual Add */}
              {studentTab === 0 && (
                <Box>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField fullWidth label="Register No" required size="small" value={manualStudent.registerNo}
                        onChange={(e) => setManualStudent(prev => ({ ...prev, registerNo: e.target.value }))}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField fullWidth label="Student Name" required size="small" value={manualStudent.name}
                        onChange={(e) => setManualStudent(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField fullWidth label="Email" required size="small" type="email" value={manualStudent.email}
                        onChange={(e) => setManualStudent(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }}>
                      <TextField fullWidth label="Password" size="small" value={manualStudent.password}
                        onChange={(e) => setManualStudent(prev => ({ ...prev, password: e.target.value }))}
                        helperText="Optional"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 1 }} sx={{ display: 'flex', alignItems: 'flex-start' }}>
                      <Button variant="contained" onClick={handleAddManualStudent} disabled={loading}
                        sx={{ minWidth: 0, px: 2, height: 40 }}
                      >
                        <Add />
                      </Button>
                    </Grid>
                  </Grid>
                  <Typography variant="caption" color="text.secondary">
                    If password is left blank, the Register Number will be used as the default password.
                  </Typography>
                </Box>
              )}

              {/* Tab 2: CSV / Excel Import */}
              {studentTab === 1 && (
                <Box>
                  <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                    <Button variant="outlined" startIcon={<Download />} onClick={handleDownloadTemplate} size="small">
                      Download CSV Template
                    </Button>
                  </Box>

                  <Paper variant="outlined" sx={{
                    p: 4, textAlign: 'center', bgcolor: '#FAFCFF', borderStyle: 'dashed', borderColor: 'primary.light',
                    cursor: 'pointer', transition: '0.2s', '&:hover': { borderColor: 'primary.main', bgcolor: '#F0F7FF' },
                  }} onClick={() => fileInputRef.current?.click()}>
                    <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} style={{ display: 'none' }} />
                    <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                    <Typography variant="body1" fontWeight={600}>
                      {fileName || 'Click to upload CSV or Excel file'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      Supports .csv, .xlsx, .xls — Columns: Register Number, Student Name, Email, Password (optional)
                    </Typography>
                  </Paper>

                  {/* Preview parsed data */}
                  {parsedFile.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          Preview: {parsedFile.length} row{parsedFile.length !== 1 ? 's' : ''} detected
                        </Typography>
                        <Button variant="contained" startIcon={<CloudUpload />} onClick={handleImportParsed} disabled={loading}>
                          {loading ? <CircularProgress size={20} /> : `Import ${parsedFile.length} Students`}
                        </Button>
                      </Box>
                      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Register No</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Password</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {parsedFile.slice(0, 20).map((row, i) => (
                              <TableRow key={i}>
                                <TableCell>{i + 1}</TableCell>
                                <TableCell>{row.registerNo}</TableCell>
                                <TableCell>{row.name}</TableCell>
                                <TableCell>{row.email}</TableCell>
                                <TableCell>{row.password || '(Register No)'}</TableCell>
                              </TableRow>
                            ))}
                            {parsedFile.length > 20 && (
                              <TableRow>
                                <TableCell colSpan={5} sx={{ textAlign: 'center', fontStyle: 'italic' }}>
                                  ... and {parsedFile.length - 20} more rows
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                </Box>
              )}

              {/* Import Results */}
              {importResults && (
                <Box sx={{ mt: 3 }}>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Import Results</Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#E8F5E9', borderRadius: 2 }}>
                        <Typography variant="h4" fontWeight={700} color="success.main">{importResults.successful?.length || 0}</Typography>
                        <Typography variant="caption" fontWeight={600}>Imported</Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#FFF3E0', borderRadius: 2 }}>
                        <Typography variant="h4" fontWeight={700} color="warning.main">{importResults.duplicates?.length || 0}</Typography>
                        <Typography variant="caption" fontWeight={600}>Duplicates</Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#FFEBEE', borderRadius: 2 }}>
                        <Typography variant="h4" fontWeight={700} color="error.main">{importResults.invalid?.length || 0}</Typography>
                        <Typography variant="caption" fontWeight={600}>Invalid</Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#E3F2FD', borderRadius: 2 }}>
                        <Typography variant="h4" fontWeight={700} color="primary.main">{importResults.total || 0}</Typography>
                        <Typography variant="caption" fontWeight={600}>Total Rows</Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                  {importResults.duplicates?.length > 0 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      <AlertTitle>Duplicate Records Skipped</AlertTitle>
                      {importResults.duplicates.map((d, i) => (
                        <Typography key={i} variant="caption" display="block">{d.name} ({d.registerNo}) — {d.reason}</Typography>
                      ))}
                    </Alert>
                  )}
                  {importResults.invalid?.length > 0 && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      <AlertTitle>Invalid Records</AlertTitle>
                      {importResults.invalid.map((d, i) => (
                        <Typography key={i} variant="caption" display="block">{d.name || 'Unknown'} — {d.reason}</Typography>
                      ))}
                    </Alert>
                  )}
                </Box>
              )}

              {/* Students Added Table */}
              {students.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                    Students Added ({students.length})
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 250 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Register No</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {students.map((s, i) => (
                          <TableRow key={s.id || i}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell>{s.registerNo}</TableCell>
                            <TableCell>{s.name}</TableCell>
                            <TableCell>{s.email}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* ============================================================ */}
        {/* STEP 5: REVIEW & FINISH */}
        {/* ============================================================ */}
        {activeStep === 4 && (
          <Box>
            <Card sx={{ boxShadow: '0 8px 32px rgba(21,101,192,0.1)', mb: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" fontWeight={700} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle color="success" /> Setup Summary
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                  Review all configuration before completing the setup. Once finished, the system will be ready for use.
                </Typography>

                <Grid container spacing={3}>
                  {/* College Info */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, height: '100%' }}>
                      <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <School fontSize="small" /> College
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>{summary?.collegeName || '—'}</Typography>
                      <Typography variant="body2" color="text.secondary">Academic Year: {summary?.academicYear || '—'}</Typography>
                    </Paper>
                  </Grid>

                  {/* Department */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, height: '100%' }}>
                      <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Business fontSize="small" /> Department & Course
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>{summary?.department?.name || '—'} ({summary?.department?.code})</Typography>
                      <Typography variant="body2" color="text.secondary">{summary?.course?.name || '—'} ({summary?.course?.code})</Typography>
                    </Paper>
                  </Grid>

                  {/* Subject */}
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: '#F0F7FF' }}>
                      <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mb: 1 }}>Subject</Typography>
                      <Typography variant="h6" fontWeight={700}>{summary?.subject?.name || '—'}</Typography>
                      <Typography variant="caption" color="text.secondary">{summary?.subject?.code}</Typography>
                    </Paper>
                  </Grid>

                  {/* Faculty */}
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: '#F0F7FF' }}>
                      <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mb: 1 }}>Faculty</Typography>
                      {summary?.faculty?.length > 0 ? summary.faculty.map(f => (
                        <Box key={f.id}>
                          <Typography variant="h6" fontWeight={700}>{f.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{f.email}</Typography>
                        </Box>
                      )) : <Typography variant="body2">—</Typography>}
                    </Paper>
                  </Grid>

                  {/* Students */}
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: '#F0F7FF' }}>
                      <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mb: 1 }}>Students</Typography>
                      <Typography variant="h4" fontWeight={700} color="primary.main">{summary?.studentCount || 0}</Typography>
                      <Typography variant="caption" color="text.secondary">students enrolled</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {stepErrors[4] && (
              <Alert severity="error" sx={{ mb: 2 }}>{stepErrors[4]}</Alert>
            )}

            <Box sx={{ textAlign: 'center' }}>
              <Button
                variant="contained" size="large" onClick={handleCompleteSetup} disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
                sx={{
                  py: 1.5, px: 6, fontSize: '1.1rem', fontWeight: 700,
                  background: 'linear-gradient(135deg, #1565C0, #0D47A1)',
                  boxShadow: '0 4px 20px rgba(13,71,161,0.4)',
                  '&:hover': { boxShadow: '0 6px 24px rgba(13,71,161,0.5)' },
                }}
              >
                Finish Setup
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                After finishing, you will be redirected to the Login page.
              </Typography>
            </Box>
          </Box>
        )}

        {/* ============================================================ */}
        {/* NAVIGATION BUTTONS */}
        {/* ============================================================ */}
        {activeStep < 4 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button variant="outlined" startIcon={<ArrowBack />} onClick={handleBack} disabled={activeStep === 0 || loading}>
              Back
            </Button>
            <Button variant="contained" endIcon={loading ? <CircularProgress size={18} /> : <ArrowForward />}
              onClick={handleNext} disabled={loading}
              sx={{ px: 4, background: 'linear-gradient(135deg, #1565C0, #0D47A1)' }}
            >
              {loading ? 'Saving...' : 'Save & Continue'}
            </Button>
          </Box>
        )}
        {activeStep === 4 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 3 }}>
            <Button variant="outlined" startIcon={<ArrowBack />} onClick={handleBack}>
              Back
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default SetupWizard;

import React from 'react';
import { 
  Box, Typography, Grid, Card, CardContent, Divider, Chip, 
  CircularProgress, Button, Avatar
} from '@mui/material';
import { 
  ArrowBack, Email, Phone, CreditCard, School, MenuBook,
  CalendarToday, Timeline, Assignment, Assessment
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import adminApi from '../../api/adminApi';
import PageHeader from '../../components/PageHeader';

const StudentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: student, isLoading, error } = useQuery({
    queryKey: ['adminStudent', id],
    queryFn: () => adminApi.getStudentById(id)
  });

  if (isLoading) return <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>;
  if (error || !student) return <Typography color="error">Error loading student details.</Typography>;

  const activeEnrollment = student.enrollments?.find(e => e.status === 'ACTIVE') || student.enrollments?.[0];
  const lastLogin = student.browserSessions?.length > 0 ? new Date(student.browserSessions[0].createdAt).toLocaleString() : 'Never logged in';
  const createdDate = new Date(student.createdAt).toLocaleString();

  // Basic Stats Calculation
  const totalExams = student.results?.length || 0;
  const passedExams = student.results?.filter(r => r.status === 'PASSED').length || 0;
  const failedExams = student.results?.filter(r => r.status === 'FAILED').length || 0;
  
  let avgMarks = 0, highest = 0, lowest = 0;
  if (totalExams > 0) {
    const scores = student.results.map(r => r.score);
    avgMarks = (scores.reduce((a, b) => a + b, 0) / totalExams).toFixed(2);
    highest = Math.max(...scores);
    lowest = Math.min(...scores);
  }

  const passPercentage = totalExams > 0 ? Math.round((passedExams / totalExams) * 100) : 0;

  return (
    <Box>
      <PageHeader 
        title="Student Profile" 
        subtitle="Detailed view of student information and performance"
        action={
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/admin/students')}>
            Back to List
          </Button>
        }
      />

      <Grid container spacing={3}>
        {/* Left Column - Personal & Login */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2, mb: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <Avatar sx={{ width: 100, height: 100, mx: 'auto', mb: 2, bgcolor: 'primary.main', fontSize: '2.5rem' }}>
                {student.name.charAt(0)}
              </Avatar>
              <Typography variant="h5" fontWeight={700} gutterBottom>{student.name}</Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>{student.register_no}</Typography>
              <Chip 
                label={student.status} 
                color={student.status === 'ACTIVE' ? 'success' : 'error'} 
                size="small" 
                sx={{ mt: 1, fontWeight: 600 }}
              />
            </CardContent>
            <Divider />
            <CardContent>
              <Typography variant="h6" fontSize="1rem" fontWeight={600} gutterBottom><Email fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }}/> Contact Info</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}><strong>Email:</strong> {student.email}</Typography>
              <Typography variant="body2" sx={{ mb: 2 }}><strong>Mobile:</strong> {student.phone || 'N/A'}</Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" fontSize="1rem" fontWeight={600} gutterBottom><CreditCard fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }}/> Account Info</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}><strong>Created:</strong> {createdDate}</Typography>
              <Typography variant="body2"><strong>Last Login:</strong> {lastLogin}</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Academic & Exams */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={3}>
            {/* Academic Info */}
            <Grid item xs={12}>
              <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <School sx={{ mr: 1, color: 'primary.main' }} /> Academic Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Department</Typography>
                      <Typography variant="body1" fontWeight={500}>{student.department?.code || '-'}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Course</Typography>
                      <Typography variant="body1" fontWeight={500}>{activeEnrollment?.course?.code || '-'}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Semester</Typography>
                      <Typography variant="body1" fontWeight={500}>{activeEnrollment?.semester?.semesterNumber || '-'}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Section</Typography>
                      <Typography variant="body1" fontWeight={500}>{activeEnrollment?.section?.name || '-'}</Typography>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 3 }} />
                  
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>Assigned Subjects</Typography>
                  {student.assignedSubjects?.length > 0 ? (
                    <Grid container spacing={2}>
                      {student.assignedSubjects.map(assignment => (
                        <Grid item xs={12} sm={6} key={assignment.id}>
                          <Box sx={{ p: 1.5, border: '1px solid #eee', borderRadius: 1 }}>
                            <Typography variant="body2" fontWeight={600}>{assignment?.subject?.code} - {assignment?.subject?.name}</Typography>
                            <Typography variant="caption" color="text.secondary">Faculty: {assignment?.faculty?.name}</Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No subjects assigned for current active enrollment.</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Performance Stats */}
            <Grid item xs={12}>
              <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                    <Assessment sx={{ mr: 1, color: 'secondary.main' }} /> Examination Statistics
                  </Typography>
                  <Grid container spacing={3} sx={{ textAlign: 'center' }}>
                    <Grid item xs={4} sm={2}>
                      <Typography variant="h4" fontWeight={700} color="primary">{totalExams}</Typography>
                      <Typography variant="caption" color="text.secondary">Total Exams</Typography>
                    </Grid>
                    <Grid item xs={4} sm={2}>
                      <Typography variant="h4" fontWeight={700} color="success.main">{passedExams}</Typography>
                      <Typography variant="caption" color="text.secondary">Passed</Typography>
                    </Grid>
                    <Grid item xs={4} sm={2}>
                      <Typography variant="h4" fontWeight={700} color="error.main">{failedExams}</Typography>
                      <Typography variant="caption" color="text.secondary">Failed</Typography>
                    </Grid>
                    <Grid item xs={4} sm={2}>
                      <Typography variant="h4" fontWeight={700} color="info.main">{avgMarks}</Typography>
                      <Typography variant="caption" color="text.secondary">Avg Score</Typography>
                    </Grid>
                    <Grid item xs={4} sm={2}>
                      <Typography variant="h4" fontWeight={700} color="warning.main">{highest}</Typography>
                      <Typography variant="caption" color="text.secondary">Highest</Typography>
                    </Grid>
                    <Grid item xs={4} sm={2}>
                      <Typography variant="h4" fontWeight={700}>{passPercentage}%</Typography>
                      <Typography variant="caption" color="text.secondary">Pass Rate</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Timeline Placeholder */}
            <Grid item xs={12}>
              <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <Timeline sx={{ mr: 1, color: 'info.main' }} /> Audit Timeline
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Timeline and detailed historical tracking to be integrated with system audit logs.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StudentDetails;

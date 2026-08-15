import React from 'react';
import { Typography, Grid, Card, CardContent, Box, Button, CircularProgress } from '@mui/material';
import { Clock, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import studentApi from '../../api/studentApi';
import { useNavigate } from 'react-router-dom';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['studentDashboard'],
    queryFn: () => studentApi.getDashboardData()
  });

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  if (isError) return <Typography color="error">Failed to load dashboard data.</Typography>;

  return (
    <Box>
      <Typography variant="h4" color="primary.main" fontWeight={700} sx={{ mb: 4 }}>
        Welcome back, {data?.user?.name || 'Student'}! 👋
      </Typography>

      <Grid container spacing={3} sx={{ mb: 5 }}>
        {/* Stat Cards */}
        {[
          { title: 'Upcoming Exams', value: data?.stats?.upcomingExams || '0', icon: <Calendar size={28} color="#1565C0" />, bg: '#E3F2FD' },
          { title: 'Completed', value: data?.stats?.completedExams || '0', icon: <CheckCircle size={28} color="#42A5F5" />, bg: '#F5FAFF' },
          { title: 'Avg. Score', value: `${data?.stats?.avgScore || '0'}`, icon: <Clock size={28} color="#1565C0" />, bg: '#E3F2FD' },
        ].map((stat, i) => (
          <Grid item xs={12} md={4} key={i}>
            <Card sx={{ borderRadius: 3, border: 'none' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: stat.bg, mr: 3 }}>
                  {stat.icon}
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    {stat.title}
                  </Typography>
                  <Typography variant="h4" color="text.primary" fontWeight={800}>
                    {stat.value}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Active Exam Section */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
        Active Examinations
      </Typography>
      
      {data?.activeExams?.length === 0 ? (
        <Typography color="text.secondary">No active exams at the moment.</Typography>
      ) : (
        data?.activeExams?.map((exam) => (
          <Card key={exam.id} sx={{ borderRadius: 3, borderLeft: '6px solid #1565C0', mb: 2 }}>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3 }}>
              <Box>
                <Typography variant="h6" color="primary.main" fontWeight={700}>
                  {exam.title} ({exam.facultyAssignment?.subject?.name})
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1, color: 'text.secondary' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Clock size={16} /> <Typography variant="body2">{exam.durationMins} Minutes</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AlertCircle size={16} /> <Typography variant="body2">{exam.totalMarks} Marks</Typography>
                  </Box>
                </Box>
              </Box>
              <Button 
                variant="contained" 
                size="large" 
                sx={{ px: 4 }}
                onClick={() => navigate(`/student/exam/${exam.id}/instructions`)}
              >
                Enter Exam
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </Box>
  );
};

export default StudentDashboard;

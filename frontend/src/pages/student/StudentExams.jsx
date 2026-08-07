import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, CircularProgress, Chip } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import studentApi from '../../api/studentApi';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertCircle } from 'lucide-react';
import PageHeader from '../../components/PageHeader';

export default function StudentExams() {
  const navigate = useNavigate();

  const { data: upcomingExams = [], isLoading: loadingUpcoming } = useQuery({
    queryKey: ['upcomingExams'],
    queryFn: () => studentApi.getUpcomingExams()
  });

  return (
    <Box>
      <PageHeader title="My Exams" subtitle="View your upcoming and active examinations" breadcrumbs={[{ label: 'Student' }, { label: 'Exams' }]} />
      
      {loadingUpcoming ? (
        <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={3}>
          {upcomingExams.length === 0 ? (
            <Grid item xs={12}>
              <Card sx={{ p: 2, borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="body1" color="text.secondary">
                    No exams scheduled at the moment. You will be notified when an exam is published for your subjects.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ) : (
            upcomingExams.map((exam) => (
              <Grid item xs={12} md={6} key={exam.id}>
                <Card sx={{ borderRadius: 3, borderLeft: '6px solid #1565C0', height: '100%' }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', p: 3 }}>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="h6" color="primary.main" fontWeight={700}>
                          {exam.title}
                        </Typography>
                        <Chip label={exam.status} color={['SCHEDULED', 'ACTIVE'].includes(exam.status) ? 'success' : 'default'} size="small" />
                      </Box>
                      
                      <Typography variant="subtitle2" sx={{ mt: 1, mb: 2 }} color="text.secondary">
                         {exam.facultyAssignment?.subject?.name} ({exam.facultyAssignment?.subject?.code})
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
                    <Box sx={{ mt: 3 }}>
                      <Button 
                        variant="contained" 
                        fullWidth
                        onClick={() => navigate(`/student/exam/${exam.id}/lobby`)}
                      >
                        Enter Exam Lobby
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}
    </Box>
  );
}

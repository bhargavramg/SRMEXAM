import React from 'react';
import { Box, Typography, Button, Card, CardContent, CircularProgress } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import studentApi from '../../api/studentApi';
import { useSnackbar } from 'notistack';

const ExamLobby = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [starting, setStarting] = React.useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = React.useState(false);

  const { data: exam, isLoading, isError } = useQuery({
    queryKey: ['examDetails', examId],
    queryFn: () => studentApi.getExamDetails(examId)
  });

  const handleStartExam = async () => {
    if (exam?.config?.requireFullscreen) {
        try {
          if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
          } else if (document.documentElement.webkitRequestFullscreen) {
            await document.documentElement.webkitRequestFullscreen(); // Safari
          } else if (document.documentElement.msRequestFullscreen) {
            await document.documentElement.msRequestFullscreen(); // IE11
          }
        } catch (fsError) {
          console.error("Fullscreen error", fsError);
        }
        
        // Strictly verify fullscreen as per requirements
        if (document.fullscreenElement === null) {
          enqueueSnackbar("Fullscreen permission is required to start this examination.", { variant: 'error' });
          return;
        }
      }

      setStarting(true);
      try {
        setShowLoadingScreen(true);
      const session = await studentApi.startExamSession(examId);
      
      setTimeout(() => {
        navigate(`/student/exam/${examId}/take/${session.id}`);
      }, 2500);

    } catch (error) {
      console.error("Failed to start exam backend response:", error);
      enqueueSnackbar("Failed to start exam: " + (error.error || error.message || 'Unknown error'), { variant: 'error' });
      setStarting(false);
      setShowLoadingScreen(false);
      if (document.fullscreenElement) {
         document.exitFullscreen().catch(e => console.log(e));
      }
    }
  };

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  if (isError || !exam) return <Typography color="error">Failed to load exam details.</Typography>;

  if (showLoadingScreen) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h5" sx={{ mt: 4, color: 'primary.main', fontWeight: 600 }}>
          Preparing Secure Examination Environment...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" color="primary.main" fontWeight={700} gutterBottom>
            {exam.title}
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Subject: {exam.facultyAssignment?.subject?.name}
          </Typography>
          
          <Box sx={{ my: 4, p: 3, bgcolor: '#FFF3E0', borderRadius: 2 }}>
            <Typography variant="h6" color="warning.dark" fontWeight={700} gutterBottom>
              Instructions & Rules
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 2, color: 'text.primary' }}>
              <li style={{ marginBottom: '8px' }}>Duration: {exam.durationMins} minutes. Timer will start immediately.</li>
              <li style={{ marginBottom: '8px' }}>Total Marks: {exam.totalMarks}</li>
              <li style={{ marginBottom: '8px' }}>Do not refresh the page or switch tabs during the exam.</li>
              <li style={{ marginBottom: '8px' }}>If you exit full-screen, your exam may be auto-submitted.</li>
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Button
              variant="contained"
              size="large"
              color="primary"
              onClick={handleStartExam}
              disabled={starting}
              sx={{ px: 8, py: 1.5, fontSize: '1.1rem' }}
            >
              {starting ? <CircularProgress size={24} color="inherit" /> : 'I Agree & Start Exam'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ExamLobby;

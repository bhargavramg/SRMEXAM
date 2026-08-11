import React from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ExamSuccessScreen({ examTitle, attemptNumber = 1 }) {
  const navigate = useNavigate();
  const submissionTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F8FAFC', p: 3 }}>
      <Card sx={{ maxWidth: 500, width: '100%', borderRadius: 3, textAlign: 'center', p: 4, boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>
        <CardContent>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={48} color="#22C55E" />
            </Box>
          </Box>
          <Typography variant="h5" fontWeight={700} color="success.main" gutterBottom>
            Examination Submitted Successfully
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Your responses have been saved. Thank you.
          </Typography>

          <Box sx={{ bgcolor: '#F1F5F9', borderRadius: 2, p: 3, textAlign: 'left', mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="body2" color="text.secondary">Exam Name</Typography>
              <Typography variant="body2" fontWeight={600}>{examTitle || 'Examination'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="body2" color="text.secondary">Submission Time</Typography>
              <Typography variant="body2" fontWeight={600}>{submissionTime}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="body2" color="text.secondary">Attempt</Typography>
              <Typography variant="body2" fontWeight={600}>#{attemptNumber}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Status</Typography>
              <Typography variant="body2" fontWeight={600} color="primary.main">Under Evaluation</Typography>
            </Box>
          </Box>

          <Button 
            variant="contained" 
            size="large" 
            fullWidth 
            onClick={() => navigate('/student/dashboard', { replace: true })}
            sx={{ py: 1.5, borderRadius: 2, textTransform: 'none', fontSize: '1.05rem' }}
            disableElevation
          >
            Return to Dashboard
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}

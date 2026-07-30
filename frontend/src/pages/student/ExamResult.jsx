import React from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';

const ExamResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const resultData = location.state?.result;

  if (!resultData || !resultData.result) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="error" gutterBottom>Result not found.</Typography>
        <Button variant="contained" onClick={() => navigate('/student/dashboard')}>Back to Dashboard</Button>
      </Box>
    );
  }

  const { result, totalMarks } = resultData;
  const isPass = result.isPass;

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 8 }}>
      <Card sx={{ borderRadius: 3, textAlign: 'center', py: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            {isPass ? <CheckCircle size={80} color="#4CAF50" /> : <XCircle size={80} color="#F44336" />}
          </Box>
          <Typography variant="h4" fontWeight={700} color={isPass ? "success.main" : "error.main"} gutterBottom>
            {isPass ? 'Congratulations!' : 'Exam Completed'}
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            You scored {totalMarks} marks.
          </Typography>
          
          <Box sx={{ mt: 5 }}>
            <Button variant="contained" size="large" onClick={() => navigate('/student/dashboard')}>
              Return to Dashboard
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ExamResult;

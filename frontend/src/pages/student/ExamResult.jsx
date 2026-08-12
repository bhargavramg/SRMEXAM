import React from 'react';
import { Box, Typography, Button, Card, CardContent, CircularProgress, Divider, Chip } from '@mui/material';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, Clock, Award, BarChart3, BookOpen, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import studentApi from '../../api/studentApi';

const ExamResult = () => {
  const { examId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if coming directly from submission
  const justSubmitted = location.state?.submitted === true;
  const examTitle = location.state?.examTitle || '';

  // Fetch results from API
  const { data: allResults, isLoading } = useQuery({
    queryKey: ['studentResults'],
    queryFn: () => studentApi.getResults(),
  });

  if (isLoading) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  // Find the specific result
  const resultInfo = allResults?.find(r => r.examId === examId);

  // If result not found OR result is provisional/unpublished
  if (!resultInfo || resultInfo.isProvisional) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 8, px: 2 }}>
        <Card sx={{ borderRadius: 3, textAlign: 'center', py: 5, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <CardContent>
            <Box sx={{ 
              width: 80, height: 80, borderRadius: '50%', bgcolor: '#EFF6FF', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              mx: 'auto', mb: 3 
            }}>
              <Clock size={40} color="#3B82F6" />
            </Box>

            <Typography variant="h4" fontWeight={700} color="primary" gutterBottom>
              {justSubmitted ? 'Exam Submitted Successfully' : 'Under Evaluation'}
            </Typography>

            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              {examTitle || resultInfo?.examTitle || 'Your Exam'}
            </Typography>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ 
              p: 3, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0', 
              textAlign: 'left', mb: 3 
            }}>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                Your answers have been submitted successfully and recorded.
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                Results are currently under evaluation by your faculty.
              </Typography>
              <Typography variant="body1" fontWeight={600} color="text.primary">
                Please wait until your faculty publishes the results.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 3 }}>
              <AlertCircle size={16} color="#F59E0B" />
              <Typography variant="body2" color="text.secondary">
                You will be notified once the results are published.
              </Typography>
            </Box>

            <Button 
              variant="contained" 
              size="large" 
              onClick={() => navigate('/student/dashboard')} 
              sx={{ px: 4, py: 1.5, borderRadius: 2 }}
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Result is PUBLISHED — show full details
  const isPass = resultInfo.isPass;

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 6, px: 2 }}>
      <Card sx={{ borderRadius: 3, textAlign: 'center', py: 4, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <CardContent>
          {/* Result Icon */}
          <Box sx={{ 
            width: 80, height: 80, borderRadius: '50%', 
            bgcolor: isPass ? '#ECFDF5' : '#FEF2F2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mx: 'auto', mb: 3 
          }}>
            {isPass ? <CheckCircle size={40} color="#10B981" /> : <AlertCircle size={40} color="#EF4444" />}
          </Box>

          <Typography variant="h3" fontWeight={700} color={isPass ? 'success.main' : 'error.main'} gutterBottom>
            {isPass ? 'Congratulations!' : 'Exam Completed'}
          </Typography>

          <Typography variant="h6" color="text.secondary" gutterBottom>
            {resultInfo.examTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {resultInfo.subject} ({resultInfo.subjectCode})
          </Typography>

          <Divider sx={{ my: 3 }} />

          {/* Score Display */}
          <Typography variant="h4" fontWeight={700} color="primary" gutterBottom>
            {resultInfo.marksObtained} / {resultInfo.totalMarks}
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
            <Chip 
              icon={<BarChart3 size={14} />} 
              label={`${resultInfo.percentage?.toFixed(1)}%`} 
              color="primary" 
              variant="outlined"
            />
            <Chip 
              icon={<Award size={14} />} 
              label={`Grade: ${resultInfo.grade || 'N/A'}`} 
              color={isPass ? 'success' : 'error'} 
              variant="filled"
            />
          </Box>

          {/* Stats Grid */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', 
            gap: 2, mb: 3, p: 3, bgcolor: '#F8FAFC', borderRadius: 2 
          }}>
            <Box>
              <Typography variant="h5" color="primary" fontWeight={700}>{resultInfo.totalQuestions}</Typography>
              <Typography variant="caption" color="text.secondary">Total Questions</Typography>
            </Box>
            <Box>
              <Typography variant="h5" color="info.main" fontWeight={700}>{resultInfo.attemptedQuestions}</Typography>
              <Typography variant="caption" color="text.secondary">Attempted</Typography>
            </Box>
            <Box>
              <Typography variant="h5" color="success.main" fontWeight={700}>{resultInfo.correctAnswers}</Typography>
              <Typography variant="caption" color="text.secondary">Correct</Typography>
            </Box>
            <Box>
              <Typography variant="h5" color="error.main" fontWeight={700}>{resultInfo.incorrectAnswers}</Typography>
              <Typography variant="caption" color="text.secondary">Incorrect</Typography>
            </Box>
            <Box>
              <Typography variant="h5" color="secondary.main" fontWeight={700}>{resultInfo.grade || '-'}</Typography>
              <Typography variant="caption" color="text.secondary">Grade</Typography>
            </Box>
          </Box>

          {/* Faculty Remarks */}
          {resultInfo.remarks && (
            <Box sx={{ p: 2, bgcolor: '#F0FDF4', borderRadius: 2, border: '1px solid #BBF7D0', mb: 3, textAlign: 'left' }}>
              <Typography variant="subtitle2" color="success.dark" gutterBottom>Faculty Remarks</Typography>
              <Typography variant="body2">{resultInfo.remarks}</Typography>
            </Box>
          )}

          {/* Published info */}
          {resultInfo.publishedAt && (
            <Typography variant="caption" color="text.secondary">
              Published on {new Date(resultInfo.publishedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </Typography>
          )}

          <Box sx={{ mt: 4 }}>
            <Button variant="contained" size="large" onClick={() => navigate('/student/dashboard')} sx={{ px: 4, py: 1.5 }}>
              Return to Dashboard
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ExamResult;

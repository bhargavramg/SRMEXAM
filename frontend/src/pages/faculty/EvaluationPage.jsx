import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, TextField, Chip, CircularProgress,
  Paper, Divider, IconButton, Tooltip, Alert
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import facultyApi from '../../api/facultyApi';
import PageHeader from '../../components/PageHeader';
import {
  ChevronLeft, ChevronRight, Save, SendHorizontal, CheckCircle,
  Clock, AlertTriangle, User, BookOpen, Shield, FileText
} from 'lucide-react';

const evalStatusColors = {
  PENDING: '#F59E0B',
  AUTO_EVALUATED: '#3B82F6',
  EVALUATED: '#10B981',
};

export default function EvaluationPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentQ, setCurrentQ] = useState(0);
  const [localMarks, setLocalMarks] = useState({});
  const [localRemarks, setLocalRemarks] = useState({});
  const [saving, setSaving] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['submissionDetail', sessionId],
    queryFn: () => facultyApi.getSubmissionDetail(sessionId),
  });

  // Initialize local state from fetched data
  useEffect(() => {
    if (data?.answers) {
      const marks = {};
      const remarks = {};
      data.answers.forEach(a => {
        marks[a.id] = a.marksObtained !== null && a.marksObtained !== undefined ? a.marksObtained : '';
        remarks[a.id] = a.evaluationRemarks || '';
      });
      setLocalMarks(marks);
      setLocalRemarks(remarks);
    }
  }, [data]);

  const saveDraftMutation = useMutation({
    mutationFn: () => {
      const evaluations = Object.keys(localMarks)
        .filter(id => localMarks[id] !== '' && localMarks[id] !== null)
        .map(id => ({
          answerId: id,
          marksObtained: parseFloat(localMarks[id]),
          remarks: localRemarks[id] || null,
        }));
      return facultyApi.saveEvaluationDraft(sessionId, evaluations);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['submissionDetail', sessionId]);
      alert('Draft saved successfully!');
    },
    onError: (err) => alert(err?.response?.data?.error || 'Failed to save draft'),
  });

  const completeEvalMutation = useMutation({
    mutationFn: () => facultyApi.completeEvaluation(sessionId),
    onSuccess: (result) => {
      queryClient.invalidateQueries(['submissionDetail', sessionId]);
      alert(`Evaluation completed! Score: ${result.totalObtained}/${data.exam.totalMarks} — Grade: ${result.grade}`);
    },
    onError: (err) => alert(err?.response?.data?.error || 'Failed to complete evaluation'),
  });

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  if (error || !data) return <Typography color="error">Failed to load submission details.</Typography>;

  const { session, student, exam, answers, result, navigation } = data;
  const currentAnswer = answers[currentQ];
  const isPublished = result?.status === 'PUBLISHED';

  const getQuestionBadgeColor = (answer) => {
    if (answer.evaluationStatus === 'AUTO_EVALUATED') return '#3B82F6';
    if (answer.evaluationStatus === 'EVALUATED') return '#10B981';
    return '#F59E0B';
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    await saveDraftMutation.mutateAsync();
    setSaving(false);
  };

  const handleCompleteEval = async () => {
    if (!window.confirm('Are you sure you want to complete the evaluation? Ensure all answers are graded.')) return;
    // First save draft
    await handleSaveDraft();
    await completeEvalMutation.mutateAsync();
  };

  return (
    <Box>
      <PageHeader
        title="Evaluate Submission"
        subtitle={`${student.name} — ${exam.subject} — ${exam.title}`}
        breadcrumbs={[
          { label: 'Faculty' },
          { label: 'Results', link: '/faculty/results' },
          { label: 'Evaluate' }
        ]}
      />

      {isPublished && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          These results have been published. Marks are read-only unless an Admin unlocks them.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* LEFT: Student Info + Navigation */}
        <Grid item xs={12} md={3}>
          {/* Student Info Card */}
          <Card sx={{ borderRadius: 3, mb: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <User size={18} color="#6366F1" />
                <Typography variant="subtitle2" fontWeight={700} color="primary">Student Info</Typography>
              </Box>
              <InfoRow label="Name" value={student.name} />
              <InfoRow label="Reg. No" value={student.registerNo} />
              <InfoRow label="Dept" value={student.department} />
              <InfoRow label="Semester" value={student.semester} />
              <InfoRow label="Section" value={student.section} />
              <Divider sx={{ my: 1.5 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <BookOpen size={18} color="#6366F1" />
                <Typography variant="subtitle2" fontWeight={700} color="primary">Exam Info</Typography>
              </Box>
              <InfoRow label="Exam" value={exam.title} />
              <InfoRow label="Subject" value={exam.subject} />
              <InfoRow label="Total Marks" value={exam.totalMarks} />
              <InfoRow label="Duration" value={`${exam.durationMins} min`} />
              <Divider sx={{ my: 1.5 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Shield size={18} color="#EF4444" />
                <Typography variant="subtitle2" fontWeight={700} color="error">Security</Typography>
              </Box>
              <InfoRow label="Submitted" value={session.submittedAt ? new Date(session.submittedAt).toLocaleString('en-IN') : '-'} />
              <InfoRow label="Time Taken" value={session.timeTaken ? `${Math.floor(session.timeTaken / 60)}m ${session.timeTaken % 60}s` : '-'} />
              <InfoRow label="Type" value={session.submissionType || '-'} />
              <InfoRow label="Warnings" value={session.warningCount} highlight={session.warningCount > 0} />
              <InfoRow label="FS Violations" value={session.fullscreenViolations} highlight={session.fullscreenViolations > 0} />
              <InfoRow label="Net Disconn." value={session.networkDisconnects} highlight={session.networkDisconnects > 0} />
            </CardContent>
          </Card>

          {/* Question Navigation */}
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Questions</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                {answers.map((a, idx) => (
                  <Box
                    key={a.id}
                    onClick={() => setCurrentQ(idx)}
                    sx={{
                      width: 36, height: 36, borderRadius: 1.5,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: currentQ === idx ? getQuestionBadgeColor(a) : getQuestionBadgeColor(a) + '22',
                      color: currentQ === idx ? '#fff' : getQuestionBadgeColor(a),
                      fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                      border: `2px solid ${getQuestionBadgeColor(a)}`,
                      transition: 'all 0.2s',
                      '&:hover': { transform: 'scale(1.1)' }
                    }}
                  >
                    {idx + 1}
                  </Box>
                ))}
              </Box>
              <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip size="small" label="Auto Eval" sx={{ bgcolor: '#3B82F622', color: '#3B82F6', fontWeight: 600 }} />
                <Chip size="small" label="Pending" sx={{ bgcolor: '#F59E0B22', color: '#F59E0B', fontWeight: 600 }} />
                <Chip size="small" label="Evaluated" sx={{ bgcolor: '#10B98122', color: '#10B981', fontWeight: 600 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* RIGHT: Answer Evaluation */}
        <Grid item xs={12} md={9}>
          {currentAnswer && (
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <CardContent sx={{ p: 3 }}>
                {/* Question Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <Chip size="small" label={`Q${currentQ + 1}/${answers.length}`} variant="outlined" />
                      <Chip size="small" label={currentAnswer.questionType} color="primary" variant="outlined" />
                      <Chip size="small" label={currentAnswer.questionDifficulty} color={currentAnswer.questionDifficulty === 'HARD' ? 'error' : currentAnswer.questionDifficulty === 'MEDIUM' ? 'warning' : 'success'} variant="outlined" />
                      <Chip size="small" label={`${currentAnswer.questionMarks} marks`} />
                    </Box>
                    <Typography variant="h6" fontWeight={600}>{currentAnswer.questionText}</Typography>
                  </Box>
                  <Chip
                    label={currentAnswer.evaluationStatus === 'AUTO_EVALUATED' ? 'Auto Evaluated' : currentAnswer.evaluationStatus === 'EVALUATED' ? 'Evaluated' : 'Pending'}
                    sx={{ bgcolor: evalStatusColors[currentAnswer.evaluationStatus] + '22', color: evalStatusColors[currentAnswer.evaluationStatus], fontWeight: 600 }}
                  />
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Options (for objective questions) */}
                {currentAnswer.options.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Options</Typography>
                    {currentAnswer.options.map(opt => {
                      const isSelected = currentAnswer.selectedOptionIds.includes(opt.id);
                      const isCorrect = opt.isCorrect;
                      return (
                        <Box
                          key={opt.id}
                          sx={{
                            p: 1.5, mb: 0.8, borderRadius: 2,
                            border: `2px solid ${isCorrect ? '#10B981' : isSelected ? '#EF4444' : '#E5E7EB'}`,
                            bgcolor: isCorrect ? '#10B98110' : isSelected && !isCorrect ? '#EF444410' : 'transparent',
                            display: 'flex', alignItems: 'center', gap: 1,
                          }}
                        >
                          {isSelected && <Chip size="small" label="Selected" color={isCorrect ? 'success' : 'error'} />}
                          {isCorrect && !isSelected && <Chip size="small" label="Correct" color="success" variant="outlined" />}
                          <Typography variant="body2">{opt.text}</Typography>
                        </Box>
                      );
                    })}
                  </Box>
                )}

                {/* Text Response (for descriptive) */}
                {currentAnswer.textResponse && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                      <FileText size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      Student's Answer
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {currentAnswer.textResponse}
                      </Typography>
                    </Paper>
                  </Box>
                )}

                {!currentAnswer.textResponse && currentAnswer.selectedOptionIds.length === 0 && (
                  <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                    Student did not answer this question.
                  </Alert>
                )}

                {/* Marks & Remarks input (for descriptive / manual override) */}
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label={`Marks (max ${currentAnswer.questionMarks})`}
                      type="number"
                      size="small"
                      fullWidth
                      value={localMarks[currentAnswer.id] ?? ''}
                      onChange={(e) => setLocalMarks(prev => ({ ...prev, [currentAnswer.id]: e.target.value }))}
                      disabled={isPublished}
                      inputProps={{ min: 0, max: currentAnswer.questionMarks, step: 0.5 }}
                      helperText={currentAnswer.evaluationStatus === 'AUTO_EVALUATED' ? 'Auto-evaluated' : 'Enter marks'}
                    />
                  </Grid>
                  <Grid item xs={12} sm={8}>
                    <TextField
                      label="Remarks (Optional)"
                      size="small"
                      fullWidth
                      multiline
                      rows={2}
                      value={localRemarks[currentAnswer.id] ?? ''}
                      onChange={(e) => setLocalRemarks(prev => ({ ...prev, [currentAnswer.id]: e.target.value }))}
                      disabled={isPublished}
                    />
                  </Grid>
                </Grid>

                {/* Navigation */}
                <Divider sx={{ my: 3 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button
                    variant="outlined"
                    startIcon={<ChevronLeft size={16} />}
                    disabled={currentQ === 0}
                    onClick={() => setCurrentQ(prev => prev - 1)}
                  >
                    Previous
                  </Button>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<Save size={16} />}
                      onClick={handleSaveDraft}
                      disabled={saving || isPublished}
                    >
                      {saving ? 'Saving...' : 'Save Draft'}
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<SendHorizontal size={16} />}
                      onClick={handleCompleteEval}
                      disabled={isPublished || completeEvalMutation.isPending}
                    >
                      Submit Evaluation
                    </Button>
                  </Box>

                  <Button
                    variant="outlined"
                    endIcon={<ChevronRight size={16} />}
                    disabled={currentQ === answers.length - 1}
                    onClick={() => setCurrentQ(prev => prev + 1)}
                  >
                    Next
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Prev/Next Student */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ChevronLeft size={14} />}
              disabled={!navigation.prevSessionId}
              onClick={() => navigate(`/faculty/results/evaluate/${navigation.prevSessionId}`)}
            >
              Previous Student
            </Button>
            <Typography variant="body2" color="text.secondary">
              Student {navigation.currentIndex} of {navigation.totalSubmissions}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              endIcon={<ChevronRight size={14} />}
              disabled={!navigation.nextSessionId}
              onClick={() => navigate(`/faculty/results/evaluate/${navigation.nextSessionId}`)}
            >
              Next Student
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

function InfoRow({ label, value, highlight }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="caption" fontWeight={600} color={highlight ? 'error.main' : 'text.primary'}>{value}</Typography>
    </Box>
  );
}

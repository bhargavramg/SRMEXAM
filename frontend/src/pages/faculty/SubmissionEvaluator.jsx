import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, Chip, CircularProgress,
  TextField, IconButton, Tooltip, Paper, Divider, Alert, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import facultyApi from '../../api/facultyApi';
import PageHeader from '../../components/PageHeader';
import {
  ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, AlertTriangle,
  Save, Send, Eye, BookOpen, Timer, Flag, MessageSquare, ArrowLeft
} from 'lucide-react';

const statusConfig = {
  CORRECT: { color: '#10B981', bg: '#ECFDF5', label: 'Correct', icon: CheckCircle },
  WRONG: { color: '#EF4444', bg: '#FEF2F2', label: 'Wrong', icon: XCircle },
  PARTIAL: { color: '#F59E0B', bg: '#FFFBEB', label: 'Partially Correct', icon: AlertTriangle },
  PENDING: { color: '#6366F1', bg: '#EEF2FF', label: 'Pending Evaluation', icon: Clock },
  UNANSWERED: { color: '#9CA3AF', bg: '#F9FAFB', label: 'Unanswered', icon: Eye },
};

function getAnswerStatus(answer) {
  if (answer.evaluationStatus === 'PENDING') return 'PENDING';
  if (!answer.selectedOptionIds?.length && !answer.textAnswer) return 'UNANSWERED';
  if (answer.isCorrect === true) return 'CORRECT';
  if (answer.isCorrect === false) return 'WRONG';
  if (answer.marksObtained > 0 && answer.marksObtained < answer.questionMarks) return 'PARTIAL';
  if (answer.marksObtained > 0) return 'CORRECT';
  return 'WRONG';
}

function formatDuration(seconds) {
  if (!seconds) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function SubmissionEvaluator() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [localEvaluations, setLocalEvaluations] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['submissionDetail', sessionId],
    queryFn: () => facultyApi.getSubmissionDetail(sessionId),
  });

  const saveDraftMutation = useMutation({
    mutationFn: (evaluations) => facultyApi.saveEvaluationDraft(sessionId, evaluations),
    onSuccess: () => {
      setSnackbar({ open: true, message: 'Draft saved successfully!', severity: 'success' });
      queryClient.invalidateQueries(['submissionDetail', sessionId]);
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err?.response?.data?.error || 'Failed to save draft', severity: 'error' });
    }
  });

  const completeEvalMutation = useMutation({
    mutationFn: () => facultyApi.completeEvaluation(sessionId),
    onSuccess: (data) => {
      setSnackbar({ open: true, message: `Evaluation completed! Score: ${data.totalObtained}/${session?.totalMarks} (${data.grade})`, severity: 'success' });
      queryClient.invalidateQueries(['submissionDetail', sessionId]);
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err?.response?.data?.error || 'Failed to complete evaluation', severity: 'error' });
    }
  });

  const singleEvalMutation = useMutation({
    mutationFn: ({ answerId, marksObtained, remarks }) => facultyApi.evaluateAnswer(answerId, { marksObtained, remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries(['submissionDetail', sessionId]);
    },
  });

  if (isLoading) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /><Typography sx={{ mt: 2 }}>Loading submission...</Typography></Box>;
  }

  if (error || !data) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Failed to load submission details. {error?.response?.data?.error || ''}</Alert>
        <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate(-1)}>Go Back</Button>
      </Box>
    );
  }

  const { session, student, exam, answers, result, navigation } = data;

  const isPublished = result?.published === true;
  const isLocked = result?.status === 'PUBLISHED';

  // Calculate live stats
  const totalAnswered = answers.filter(a => a.selectedOptionIds?.length > 0 || a.textAnswer).length;
  const totalPending = answers.filter(a => a.evaluationStatus === 'PENDING').length;
  const totalEvaluated = answers.filter(a => a.evaluationStatus === 'EVALUATED').length;
  const evaluationProgress = answers.length > 0 ? (totalEvaluated / answers.length) * 100 : 0;

  const liveObjectiveMarks = answers
    .filter(a => ['MCQ', 'TRUE_FALSE', 'MULTIPLE_CORRECT', 'FILL_IN_BLANK'].includes(a.questionType) && a.evaluationStatus === 'EVALUATED')
    .reduce((s, a) => s + (a.marksObtained || 0), 0);

  const liveDescriptiveMarks = answers
    .filter(a => !['MCQ', 'TRUE_FALSE', 'MULTIPLE_CORRECT', 'FILL_IN_BLANK'].includes(a.questionType) && a.evaluationStatus === 'EVALUATED')
    .reduce((s, a) => s + (a.marksObtained || 0), 0);

  const liveTotalMarks = Math.max(0, liveObjectiveMarks + liveDescriptiveMarks);
  const livePercentage = exam.totalMarks > 0 ? (liveTotalMarks / exam.totalMarks * 100).toFixed(1) : 0;

  const handleLocalEvalChange = (answerId, field, value) => {
    setLocalEvaluations(prev => ({
      ...prev,
      [answerId]: { ...prev[answerId], [field]: value }
    }));
  };

  const handleSaveDraft = () => {
    const evaluations = Object.entries(localEvaluations).map(([answerId, ev]) => ({
      answerId,
      marksObtained: ev.marksObtained !== undefined ? parseFloat(ev.marksObtained) : null,
      remarks: ev.remarks || null,
    }));
    if (evaluations.length === 0) {
      setSnackbar({ open: true, message: 'No changes to save', severity: 'info' });
      return;
    }
    saveDraftMutation.mutate(evaluations);
  };

  const handleCompleteEvaluation = () => {
    if (totalPending > 0) {
      setSnackbar({ open: true, message: `${totalPending} answer(s) still pending evaluation. Please evaluate all answers first.`, severity: 'warning' });
      return;
    }
    completeEvalMutation.mutate();
  };

  return (
    <Box>
      <PageHeader
        title="Student Submission"
        subtitle={`${student.name} — ${student.registerNo}`}
        breadcrumbs={[
          { label: 'Faculty' },
          { label: 'Results', link: '/faculty/results' },
          { label: 'View Answers' }
        ]}
      />

      {/* Top Actions Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Button variant="outlined" startIcon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
          Back to Submissions
        </Button>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {navigation.prevSessionId && (
            <Button size="small" startIcon={<ChevronLeft size={16} />} onClick={() => navigate(`/faculty/results/evaluate/${navigation.prevSessionId}`)}>
              Previous Student
            </Button>
          )}
          <Chip label={`${navigation.currentIndex} of ${navigation.totalSubmissions}`} variant="outlined" />
          {navigation.nextSessionId && (
            <Button size="small" endIcon={<ChevronRight size={16} />} onClick={() => navigate(`/faculty/results/evaluate/${navigation.nextSessionId}`)}>
              Next Student
            </Button>
          )}
        </Box>
      </Box>

      {isLocked && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Results have been published. Marks are locked and cannot be edited. To make changes, unpublish the results first.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          {/* Student Info Card */}
          <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">Student Name</Typography>
                  <Typography fontWeight={600}>{student.name}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">Register No</Typography>
                  <Typography fontWeight={600}>{student.registerNo}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">Subject</Typography>
                  <Typography fontWeight={600}>{exam.subject} ({exam.subjectCode})</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">Exam</Typography>
                  <Typography fontWeight={600}>{exam.title}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">Submitted At</Typography>
                  <Typography fontWeight={600}>
                    {session.submittedAt ? new Date(session.submittedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">Duration Taken</Typography>
                  <Typography fontWeight={600}>{formatDuration(session.timeTaken)}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Questions List */}
          {answers.map((answer, idx) => {
            const status = getAnswerStatus(answer);
            const config = statusConfig[status];
            const StatusIcon = config.icon;
            const isDescriptive = ['SHORT_ANSWER', 'LONG_ANSWER', 'ESSAY'].includes(answer.questionType);
            const localEval = localEvaluations[answer.id] || {};
            const currentMarks = localEval.marksObtained !== undefined ? localEval.marksObtained : answer.marksObtained;
            const currentRemarks = localEval.remarks !== undefined ? localEval.remarks : answer.evaluationRemarks;

            return (
              <Card key={answer.id} sx={{
                mb: 2, borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                borderLeft: `4px solid ${config.color}`,
              }}>
                <CardContent>
                  {/* Question Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Chip label={`Q${answer.questionNumber}`} size="small" sx={{ fontWeight: 700, bgcolor: config.bg, color: config.color }} />
                        <Chip label={answer.questionType} size="small" variant="outlined" />
                        <Chip label={`${answer.questionMarks} marks`} size="small" variant="outlined" />
                        {answer.markedForReview && (
                          <Tooltip title="Student marked for review">
                            <Chip icon={<Flag size={12} />} label="Flagged" size="small" color="warning" variant="outlined" />
                          </Tooltip>
                        )}
                        {answer.timeSpent > 0 && (
                          <Tooltip title="Time spent on this question">
                            <Chip icon={<Timer size={12} />} label={formatDuration(answer.timeSpent)} size="small" variant="outlined" />
                          </Tooltip>
                        )}
                      </Box>
                      <Typography variant="body1" sx={{ fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                        {answer.questionText}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right', ml: 2, minWidth: 90 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                        <StatusIcon size={18} color={config.color} />
                        <Typography variant="body2" sx={{ color: config.color, fontWeight: 600 }}>{config.label}</Typography>
                      </Box>
                      <Typography variant="h6" fontWeight={700} sx={{ color: config.color }}>
                        {answer.marksObtained !== null && answer.marksObtained !== undefined ? answer.marksObtained : '?'} / {answer.questionMarks}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 1.5 }} />

                  {/* Options / Answer Display */}
                  {answer.options?.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Options</Typography>
                      {answer.options.map(opt => {
                        const isSelected = answer.selectedOptionIds?.includes(opt.id);
                        const isCorrectOpt = opt.isCorrect;
                        let optBg = 'transparent';
                        let optBorder = '1px solid #E5E7EB';
                        if (isCorrectOpt && isSelected) { optBg = '#ECFDF5'; optBorder = '2px solid #10B981'; }
                        else if (isCorrectOpt) { optBg = '#F0FDF4'; optBorder = '1px dashed #10B981'; }
                        else if (isSelected) { optBg = '#FEF2F2'; optBorder = '2px solid #EF4444'; }

                        return (
                          <Box key={opt.id} sx={{
                            p: 1.5, mb: 0.5, borderRadius: 2, border: optBorder, bgcolor: optBg,
                            display: 'flex', alignItems: 'center', gap: 1,
                          }}>
                            {isCorrectOpt && <CheckCircle size={16} color="#10B981" />}
                            {isSelected && !isCorrectOpt && <XCircle size={16} color="#EF4444" />}
                            <Typography variant="body2" sx={{ flex: 1 }}>{opt.text}</Typography>
                            {isSelected && <Chip label="Student's Answer" size="small" color={isCorrectOpt ? 'success' : 'error'} variant="outlined" sx={{ fontSize: '0.7rem' }} />}
                            {isCorrectOpt && !isSelected && <Chip label="Correct Answer" size="small" color="success" variant="outlined" sx={{ fontSize: '0.7rem' }} />}
                          </Box>
                        );
                      })}
                    </Box>
                  )}

                  {/* Text Answer */}
                  {answer.textAnswer && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Student's Written Answer</Typography>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#FAFAFA', whiteSpace: 'pre-wrap' }}>
                        <Typography variant="body2">{answer.textAnswer}</Typography>
                      </Paper>
                    </Box>
                  )}

                  {/* Manual Evaluation Panel (for descriptive or any pending question) */}
                  {(isDescriptive || answer.evaluationStatus === 'PENDING') && !isLocked && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
                      <Typography variant="subtitle2" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MessageSquare size={16} /> Manual Evaluation
                      </Typography>
                      <Grid container spacing={2} alignItems="flex-start">
                        <Grid item xs={12} sm={3}>
                          <TextField
                            label="Marks"
                            type="number"
                            size="small"
                            fullWidth
                            value={currentMarks !== null && currentMarks !== undefined ? currentMarks : ''}
                            onChange={(e) => handleLocalEvalChange(answer.id, 'marksObtained', e.target.value)}
                            inputProps={{ min: 0, max: answer.questionMarks, step: 0.5 }}
                            helperText={`Max: ${answer.questionMarks}`}
                          />
                        </Grid>
                        <Grid item xs={12} sm={7}>
                          <TextField
                            label="Remarks"
                            size="small"
                            fullWidth
                            multiline
                            minRows={1}
                            value={currentRemarks || ''}
                            onChange={(e) => handleLocalEvalChange(answer.id, 'remarks', e.target.value)}
                            placeholder="Optional faculty remarks..."
                          />
                        </Grid>
                        <Grid item xs={12} sm={2}>
                          <Button
                            variant="contained"
                            size="small"
                            fullWidth
                            sx={{ height: 40 }}
                            onClick={() => {
                              const marks = parseFloat(localEval.marksObtained ?? answer.marksObtained ?? 0);
                              singleEvalMutation.mutate({
                                answerId: answer.id,
                                marksObtained: marks,
                                remarks: localEval.remarks ?? answer.evaluationRemarks
                              });
                            }}
                          >
                            Save
                          </Button>
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  {/* Evaluation info for already evaluated */}
                  {answer.evaluatedBy && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Evaluated by {answer.evaluatedBy} {answer.evaluatedAt ? `on ${new Date(answer.evaluatedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}` : ''}
                      </Typography>
                      {answer.evaluationRemarks && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          Remarks: {answer.evaluationRemarks}
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Box sx={{ position: 'sticky', top: 24 }}>
            {/* Score Summary */}
            <Card sx={{ mb: 2, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Score Summary</Typography>

                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Typography variant="h3" fontWeight={700} color="primary">{liveTotalMarks}</Typography>
                  <Typography color="text.secondary">out of {exam.totalMarks}</Typography>
                  <Typography variant="h5" color="secondary" fontWeight={600}>{livePercentage}%</Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Objective</Typography>
                    <Typography fontWeight={600}>{Math.max(0, liveObjectiveMarks)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Descriptive</Typography>
                    <Typography fontWeight={600}>{liveDescriptiveMarks > 0 ? liveDescriptiveMarks : totalPending > 0 ? 'Pending' : 0}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Answered</Typography>
                    <Typography fontWeight={600}>{totalAnswered} / {answers.length}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Grade</Typography>
                    <Typography fontWeight={600}>{result?.grade || '-'}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Evaluation Progress */}
            <Card sx={{ mb: 2, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Evaluation Progress</Typography>
                <LinearProgress variant="determinate" value={evaluationProgress} sx={{ height: 8, borderRadius: 4, mb: 1 }} />
                <Typography variant="caption" color="text.secondary">
                  {totalEvaluated} of {answers.length} evaluated ({totalPending} pending)
                </Typography>
              </CardContent>
            </Card>

            {/* Session Info */}
            <Card sx={{ mb: 2, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Session Details</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">Duration</Typography>
                    <Typography variant="caption" fontWeight={600}>{formatDuration(session.timeTaken)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">Submission</Typography>
                    <Typography variant="caption" fontWeight={600}>{session.submissionType || '-'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">Warnings</Typography>
                    <Typography variant="caption" fontWeight={600} color={session.warningCount > 0 ? 'error' : 'inherit'}>
                      {session.warningCount || 0}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">Status</Typography>
                    <Chip label={result?.status || 'N/A'} size="small" color={result?.published ? 'success' : 'warning'} variant="outlined" />
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {!isLocked && (
              <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Save size={16} />}
                    onClick={handleSaveDraft}
                    disabled={saveDraftMutation.isPending}
                  >
                    {saveDraftMutation.isPending ? 'Saving...' : 'Save Draft'}
                  </Button>
                  <Button
                    variant="contained"
                    fullWidth
                    color="success"
                    startIcon={<CheckCircle size={16} />}
                    onClick={handleCompleteEvaluation}
                    disabled={completeEvalMutation.isPending || totalPending > 0}
                  >
                    {completeEvalMutation.isPending ? 'Completing...' : 'Complete Evaluation'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </Box>
        </Grid>
      </Grid>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

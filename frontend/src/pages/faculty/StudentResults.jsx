import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, Chip, CircularProgress,
  Select, MenuItem, FormControl, InputLabel, IconButton, Tooltip, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import facultyApi from '../../api/facultyApi';
import PageHeader from '../../components/PageHeader';
import { DataTable } from '../../components/tables';
import {
  ClipboardList, Clock, CheckCircle, Send, BarChart3, Download,
  Eye, Edit3, TrendingUp, Users, Award, AlertTriangle, XCircle,
  Undo2, Lock
} from 'lucide-react';

const statusColors = {
  PENDING_EVALUATION: 'warning',
  EVALUATED: 'info',
  PUBLISHED: 'success',
  SUBMITTED: 'secondary',
};

const statusLabels = {
  PENDING_EVALUATION: 'Pending Evaluation',
  EVALUATED: 'Evaluated',
  PUBLISHED: 'Published',
  SUBMITTED: 'Submitted',
};

export default function StudentResults() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [selectedExam, setSelectedExam] = useState('');
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [unpublishModalOpen, setUnpublishModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);

  // Fetch dashboard stats
  const { data: dashboard, isLoading: loadingDashboard } = useQuery({
    queryKey: ['resultsDashboard'],
    queryFn: () => facultyApi.getResultsDashboard(),
  });

  // Fetch submissions for selected exam
  const { data: submissionsData, isLoading: loadingSubmissions, isError: submissionError, isSuccess: submissionSuccess } = useQuery({
    queryKey: ['examSubmissions', selectedExam],
    queryFn: () => facultyApi.getExamSubmissions(selectedExam),
    enabled: !!selectedExam,
  });

  // Fetch analytics for publish modal
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['examAnalytics', selectedExam],
    queryFn: () => facultyApi.getExamAnalytics(selectedExam),
    enabled: publishModalOpen && !!selectedExam,
  });

  const stats = dashboard?.stats;
  const exams = dashboard?.exams || [];
  const submissions = submissionsData?.submissions || [];
  const examInfo = submissionsData?.exam;
  const selectedExamDetails = exams.find(e => e.id === selectedExam);
  const dropdownSubmissionCount = selectedExamDetails?.totalSubmissions || 0;

  // Check if current exam results are already published
  const isExamPublished = submissions.some(s => s.published === true);
  const allEvaluated = submissions.length > 0 && submissions.every(s => s.pendingEvaluation === 0);

  const handleExport = async () => {
    if (!selectedExam) return;
    try {
      const blob = await facultyApi.exportResults(selectedExam, 'csv');
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      const examTitle = exams.find(e => e.id === selectedExam)?.title || 'results';
      link.download = `${examTitle.replace(/\s+/g, '_')}_results.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleConfirmPublish = async () => {
    try {
      setIsPublishing(true);
      await facultyApi.publishResults(selectedExam);
      setPublishModalOpen(false);
      queryClient.invalidateQueries(['examSubmissions', selectedExam]);
      queryClient.invalidateQueries(['resultsDashboard']);
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.error || 'Failed to publish', { variant: 'error' });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleConfirmUnpublish = async () => {
    try {
      setIsUnpublishing(true);
      await facultyApi.unpublishResults(selectedExam);
      setUnpublishModalOpen(false);
      queryClient.invalidateQueries(['examSubmissions', selectedExam]);
      queryClient.invalidateQueries(['resultsDashboard']);
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.error || 'Failed to unpublish', { variant: 'error' });
    } finally {
      setIsUnpublishing(false);
    }
  };

  const columns = [
    {
      field: 'registerNo', headerName: 'Register No', width: 130,
      renderCell: ({ row }) => <Typography variant="body2" fontWeight={600}>{row.registerNo}</Typography>
    },
    {
      field: 'studentName', headerName: 'Student Name', flex: 1.5, minWidth: 160,
      renderCell: ({ row }) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>{row.studentName}</Typography>
          <Typography variant="caption" color="text.secondary">{row.email}</Typography>
        </Box>
      )
    },
    {
      field: 'submittedAt', headerName: 'Submitted', width: 150,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <CheckCircle size={14} color="#10B981" />
          <Typography variant="caption">
            {row.submittedAt ? new Date(row.submittedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
          </Typography>
        </Box>
      )
    },
    {
      field: 'timeTaken', headerName: 'Duration', width: 90,
      renderCell: ({ row }) => row.timeTaken ? `${Math.floor(row.timeTaken / 60)}m ${row.timeTaken % 60}s` : '-'
    },
    {
      field: 'objectiveMarks', headerName: 'Objective', width: 90,
      renderCell: ({ row }) => (
        <Typography variant="body2" fontWeight={500}>
          {row.objectiveMarks?.toFixed(1) ?? 0}
        </Typography>
      )
    },
    {
      field: 'descriptiveMarks', headerName: 'Descriptive', width: 100,
      renderCell: ({ row }) => (
        row.pendingEvaluation > 0 ? (
          <Chip label="Pending" size="small" color="warning" variant="outlined" />
        ) : (
          <Typography variant="body2" fontWeight={500}>{row.descriptiveMarks?.toFixed(1) ?? 0}</Typography>
        )
      )
    },
    {
      field: 'obtainedMarks', headerName: 'Total', width: 100,
      renderCell: ({ row }) => (
        <Typography variant="body2" fontWeight={700}>
          {row.obtainedMarks?.toFixed(1) ?? 0} / {row.totalMarks}
        </Typography>
      )
    },
    {
      field: 'percentage', headerName: '%', width: 70,
      renderCell: ({ row }) => `${row.percentage?.toFixed(1) ?? 0}%`
    },
    {
      field: 'grade', headerName: 'Grade', width: 70,
      renderCell: ({ row }) => row.grade ? (
        <Chip label={row.grade} size="small" color={row.grade === 'F' ? 'error' : 'success'} variant="outlined" />
      ) : '-'
    },
    {
      field: 'resultStatus', headerName: 'Status', width: 145,
      renderCell: ({ row }) => (
        <Chip
          label={row.published ? 'Published' : (statusLabels[row.resultStatus] || row.resultStatus)}
          color={row.published ? 'success' : (statusColors[row.resultStatus] || 'default')}
          size="small"
          variant="filled"
        />
      )
    },
    {
      field: 'actions', headerName: 'Action', width: 130,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="View Answers">
            <IconButton size="small" color="primary" onClick={() => navigate(`/faculty/results/evaluate/${row.sessionId}`)}>
              <Eye size={16} />
            </IconButton>
          </Tooltip>
          {!row.published && row.pendingEvaluation > 0 && (
            <Tooltip title="Evaluate">
              <IconButton size="small" color="warning" onClick={() => navigate(`/faculty/results/evaluate/${row.sessionId}`)}>
                <Edit3 size={16} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )
    }
  ];

  // Summary stats for selected exam
  const examStats = submissions.length > 0 ? {
    total: submissions.length,
    pendingEval: submissions.filter(s => s.pendingEvaluation > 0).length,
    evaluated: submissions.filter(s => s.pendingEvaluation === 0 && !s.published).length,
    published: submissions.filter(s => s.published).length,
    avgPercentage: (submissions.reduce((s, r) => s + (r.percentage || 0), 0) / submissions.length).toFixed(1),
    passCount: submissions.filter(s => s.isPass).length,
  } : null;

  if (loadingDashboard) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <PageHeader
        title="Student Results & Answer Management"
        subtitle="View all student submissions, evaluate answers, and publish results"
        breadcrumbs={[{ label: 'Faculty' }, { label: 'Student Results' }]}
      />

      {/* Exam Selector */}
      <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 350 }} size="small">
              <InputLabel>Select Exam</InputLabel>
              <Select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                label="Select Exam"
              >
                {exams.map(e => (
                  <MenuItem key={e.id} value={e.id}>
                    {e?.title || 'Unknown'} — {e?.subject || 'N/A'} [{e.totalSubmissions} submissions]
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedExam && (
              <>
                <Button variant="outlined" size="small" startIcon={<BarChart3 size={16} />}
                  onClick={() => navigate(`/faculty/results/analytics/${selectedExam}`)}>
                  Analytics
                </Button>
                <Button variant="outlined" size="small" startIcon={<Download size={16} />} onClick={handleExport}>
                  Export CSV
                </Button>
                {!isExamPublished && allEvaluated && submissions.length > 0 && (
                  <Button variant="contained" size="small" color="success" startIcon={<Send size={16} />}
                    onClick={() => setPublishModalOpen(true)}>
                    Publish Results
                  </Button>
                )}
                {isExamPublished && (
                  <Button variant="outlined" size="small" color="warning" startIcon={<Undo2 size={16} />}
                    onClick={() => setUnpublishModalOpen(true)}>
                    Unpublish Results
                  </Button>
                )}
              </>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Exam Stats */}
      {examStats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total Submissions', value: examStats.total, icon: ClipboardList, color: '#6366F1' },
            { label: 'Pending Evaluation', value: examStats.pendingEval, icon: Clock, color: '#F59E0B' },
            { label: 'Evaluated', value: examStats.evaluated, icon: CheckCircle, color: '#10B981' },
            { label: 'Published', value: examStats.published, icon: Send, color: '#3B82F6' },
            { label: 'Avg Score', value: `${examStats.avgPercentage}%`, icon: TrendingUp, color: '#8B5CF6' },
            { label: 'Pass Rate', value: `${examStats.total > 0 ? ((examStats.passCount / examStats.total) * 100).toFixed(0) : 0}%`, icon: Award, color: '#EC4899' },
          ].map((s, i) => (
            <Grid item xs={6} sm={4} md={2} key={i}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', height: '100%' }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Box sx={{
                      width: 32, height: 32, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: s.color + '14'
                    }}>
                      <s.icon size={16} color={s.color} />
                    </Box>
                  </Box>
                  <Typography variant="h5" fontWeight={700}>{s.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Submissions Table */}
      {selectedExam && (
        <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            {loadingSubmissions ? (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Loading submissions...</Typography>
              </Box>
            ) : submissionError ? (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <AlertTriangle size={48} color="#EF4444" />
                <Typography variant="h6" color="error" sx={{ mt: 1 }}>Failed to load submissions</Typography>
                <Typography variant="body2" color="text.secondary">There was an error communicating with the server.</Typography>
              </Box>
            ) : submissionSuccess && dropdownSubmissionCount > 0 && submissions.length === 0 ? (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <AlertTriangle size={48} color="#EF4444" />
                <Typography variant="h6" color="error" sx={{ mt: 1 }}>Inconsistent Data Warning</Typography>
                <Typography variant="body2" color="text.secondary">
                  Submission count is {dropdownSubmissionCount}, but no records were found. Please contact support.
                </Typography>
              </Box>
            ) : submissionSuccess && submissions.length === 0 ? (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <AlertTriangle size={48} color="#F59E0B" />
                <Typography variant="h6" color="text.secondary" sx={{ mt: 1 }}>No submissions yet</Typography>
                <Typography variant="body2" color="text.secondary">Students haven't submitted this exam yet.</Typography>
              </Box>
            ) : (
              <DataTable
                rows={submissions}
                columns={columns}
                getRowId={(row) => row.sessionId}
                pageSize={25}
              />
            )}
          </CardContent>
        </Card>
      )}

      {!selectedExam && (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, bgcolor: 'grey.50' }}>
          <Users size={48} color="#9CA3AF" />
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>Select an Exam</Typography>
          <Typography variant="body2" color="text.secondary">Choose an exam from the dropdown above to view all student submissions and manage results.</Typography>
        </Paper>
      )}

      {/* Publish Confirmation Dialog */}
      <Dialog open={publishModalOpen} onClose={() => !isPublishing && setPublishModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'success.main', color: 'success.contrastText' }}>
          Publish Results
        </DialogTitle>
        <DialogContent dividers>
          {analyticsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
          ) : analytics ? (
            <Box>
              <Alert severity="warning" sx={{ mb: 3 }}>
                Publishing results will make marks visible to all students. After publishing, marks will be locked. You can unpublish later to make corrections if needed.
              </Alert>

              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="body2" color="text.secondary">Total Submissions</Typography>
                    <Typography variant="h4" color="primary">{analytics.summary.totalSubmissions}</Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="body2" color="text.secondary">Average Score</Typography>
                    <Typography variant="h4" color="secondary">{analytics.summary.avgScore}%</Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="body2" color="text.secondary">Pass Rate</Typography>
                    <Typography variant="h4" color="success.main">{analytics.summary.passPercentage}%</Typography>
                  </Card>
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom>Grade Distribution</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
                {Object.entries(analytics.gradeDistribution || {}).map(([grade, count]) => (
                  <Chip key={grade} label={`${grade}: ${count}`} color={grade === 'F' ? 'error' : 'primary'} variant={count > 0 ? 'filled' : 'outlined'} />
                ))}
              </Box>

              <Typography variant="h6" gutterBottom>Top Students</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'grey.100' }}>
                    <TableRow>
                      <TableCell>Rank</TableCell>
                      <TableCell>Student</TableCell>
                      <TableCell>Register No</TableCell>
                      <TableCell align="right">%</TableCell>
                      <TableCell align="center">Grade</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(analytics.top10 || []).slice(0, 5).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>#{row.rank}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.registerNo}</TableCell>
                        <TableCell align="right">{row.percentage.toFixed(1)}%</TableCell>
                        <TableCell align="center">
                          <Chip label={row.grade} size="small" color={row.grade === 'F' ? 'error' : 'success'} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : (
            <Alert severity="error">Failed to load analytics.</Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPublishModalOpen(false)} disabled={isPublishing} color="inherit">Cancel</Button>
          <Button
            onClick={handleConfirmPublish}
            variant="contained"
            color="success"
            disabled={isPublishing || analyticsLoading || !analytics}
            startIcon={isPublishing ? <CircularProgress size={20} color="inherit" /> : <Send size={18} />}
          >
            {isPublishing ? 'Publishing...' : 'Confirm & Publish'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unpublish Confirmation Dialog */}
      <Dialog open={unpublishModalOpen} onClose={() => !isUnpublishing && setUnpublishModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'warning.main', color: 'warning.contrastText' }}>
          Unpublish Results
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will retract published results. Students will no longer see their marks until you republish.
          </Alert>
          <Typography variant="body1">
            Are you sure you want to unpublish results for this exam? You can edit marks and republish after unpublishing.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setUnpublishModalOpen(false)} disabled={isUnpublishing} color="inherit">Cancel</Button>
          <Button
            onClick={handleConfirmUnpublish}
            variant="contained"
            color="warning"
            disabled={isUnpublishing}
            startIcon={isUnpublishing ? <CircularProgress size={20} color="inherit" /> : <Undo2 size={18} />}
          >
            {isUnpublishing ? 'Unpublishing...' : 'Confirm Unpublish'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

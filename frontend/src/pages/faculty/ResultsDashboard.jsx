import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, Chip, CircularProgress,
  Select, MenuItem, FormControl, InputLabel, IconButton, Tooltip, Paper, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import facultyApi from '../../api/facultyApi';
import PageHeader from '../../components/PageHeader';
import { DataTable } from '../../components/tables';
import {
  ClipboardList, Clock, CheckCircle, Send, BarChart3, Download,
  Eye, Edit3, TrendingUp, Users, Award, AlertTriangle
} from 'lucide-react';

const statusColors = {
  AUTO_EVALUATED: 'info',
  PENDING_EVALUATION: 'warning',
  EVALUATED: 'success',
  PUBLISHED: 'default',
  SUBMITTED: 'secondary',
};

const statusLabels = {
  AUTO_EVALUATED: 'Auto Evaluated',
  PENDING_EVALUATION: 'Pending Evaluation',
  EVALUATED: 'Evaluated',
  PUBLISHED: 'Published',
  SUBMITTED: 'Submitted',
};

export default function ResultsDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [selectedExam, setSelectedExam] = useState('');

  // Fetch dashboard stats
  const { data: dashboard, isLoading: loadingDashboard } = useQuery({
    queryKey: ['resultsDashboard'],
    queryFn: () => facultyApi.getResultsDashboard(),
  });

  const { data: publishReadyExams = [], isLoading: loadingReadyExams } = useQuery({
    queryKey: ['publishReadyExams'],
    queryFn: () => facultyApi.getPublishReadyExams(),
  });

  // Fetch submissions for selected exam
  const { data: submissionsData, isLoading: loadingSubmissions } = useQuery({
    queryKey: ['examSubmissions', selectedExam],
    queryFn: () => facultyApi.getExamSubmissions(selectedExam),
    enabled: !!selectedExam,
  });

  const stats = dashboard?.stats;
  const exams = dashboard?.exams || [];
  const submissions = submissionsData?.submissions || [];

  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['examAnalytics', selectedExam],
    queryFn: () => facultyApi.getExamAnalytics(selectedExam),
    enabled: publishModalOpen && !!selectedExam,
  });

  const statCards = stats ? [
    { label: 'Total Submissions', value: stats.totalSubmissions, icon: ClipboardList, color: '#6366F1' },
    { label: 'Pending Evaluation', value: stats.pendingEvaluation, icon: Clock, color: '#F59E0B' },
    { label: 'Evaluated', value: stats.evaluated, icon: CheckCircle, color: '#10B981' },
    { label: 'Published', value: stats.published, icon: Send, color: '#3B82F6' },
    { label: 'Avg Score', value: `${stats.avgMarks}%`, icon: TrendingUp, color: '#8B5CF6' },
    { label: 'Pass Rate', value: `${stats.passPercentage}%`, icon: Award, color: '#EC4899' },
  ] : [];

  const handleExport = async () => {
    if (!selectedExam) return;
    try {
      const blob = await facultyApi.exportResults(selectedExam, 'csv');
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `results_${selectedExam}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handlePublishClick = () => {
    if (!selectedExam) return;
    setPublishModalOpen(true);
  };

  const handleConfirmPublish = async () => {
    try {
      setIsPublishing(true);
      await facultyApi.publishResults(selectedExam);
      setPublishModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['resultsDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['publishReadyExams'] });
      queryClient.invalidateQueries({ queryKey: ['examSubmissions'] });
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.error || 'Failed to publish', { variant: 'error' });
    } finally {
      setIsPublishing(false);
    }
  };

  const columns = [
    {
      field: 'studentName', headerName: 'Student', flex: 1.5, minWidth: 150,
      renderCell: ({ row }) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>{row.studentName}</Typography>
          <Typography variant="caption" color="text.secondary">{row.registerNo}</Typography>
        </Box>
      )
    },
    { field: 'department', headerName: 'Department', width: 80, renderCell: ({ row }) => row.departmentCode || row.department },
    { field: 'section', headerName: 'Section', width: 80 },
    { field: 'semester', headerName: 'Sem', width: 60 },
    {
      field: 'submittedAt', headerName: 'Submitted', width: 160,
      renderCell: ({ row }) => row.submittedAt ? new Date(row.submittedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '-'
    },
    {
      field: 'timeTaken', headerName: 'Duration', width: 90,
      renderCell: ({ row }) => row.timeTaken ? `${Math.floor(row.timeTaken / 60)}m ${row.timeTaken % 60}s` : '-'
    },
    {
      field: 'objectiveMarks', headerName: 'Obj. Score', width: 100,
      renderCell: ({ row }) => (
        <Typography variant="body2" fontWeight={500}>
          {row.objectiveMarks?.toFixed(1) ?? 0}
        </Typography>
      )
    },
    {
      field: 'pendingEvaluation', headerName: 'Pending', width: 80,
      renderCell: ({ row }) => row.pendingEvaluation > 0 ? (
        <Chip label={row.pendingEvaluation} size="small" color="warning" />
      ) : <Chip label="0" size="small" color="success" variant="outlined" />
    },
    {
      field: 'obtainedMarks', headerName: 'Final Score', width: 110,
      renderCell: ({ row }) => (
        <Typography variant="body2" fontWeight={600}>
          {row.obtainedMarks?.toFixed(1) ?? 0} / {row.totalMarks}
        </Typography>
      )
    },
    {
      field: 'resultStatus', headerName: 'Status', width: 150,
      renderCell: ({ row }) => (
        <Chip
          label={statusLabels[row.resultStatus] || row.resultStatus}
          color={statusColors[row.resultStatus] || 'default'}
          size="small"
          variant="filled"
        />
      )
    },
    {
      field: 'actions', headerName: 'Actions', width: 120,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {row.resultStatus !== 'PUBLISHED' && row.pendingEvaluation > 0 ? (
            <Tooltip title="Evaluate">
              <IconButton size="small" color="primary" onClick={() => navigate(`/faculty/results/evaluate/${row.sessionId}`)}>
                <Edit3 size={16} />
              </IconButton>
            </Tooltip>
          ) : null}
          <Tooltip title="View Details">
            <IconButton size="small" onClick={() => navigate(`/faculty/results/evaluate/${row.sessionId}`)}>
              <Eye size={16} />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  if (loadingDashboard) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <PageHeader
        title="Results & Evaluation"
        subtitle="Evaluate student submissions, manage grades, and publish results"
        breadcrumbs={[{ label: 'Faculty' }, { label: 'Results' }]}
      />

      {/* Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((s, i) => (
          <Grid item xs={6} sm={4} md={2} key={i}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', height: '100%' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box sx={{
                    width: 36, height: 36, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: s.color + '14'
                  }}>
                    <s.icon size={18} color={s.color} />
                  </Box>
                </Box>
                <Typography variant="h5" fontWeight={700}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Ready to Publish Section */}
      {publishReadyExams.length > 0 && (
        <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', mb: 3, borderLeft: '4px solid #3B82F6' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Send size={20} color="#3B82F6" />
              Exams Ready for Publication
            </Typography>
            <Grid container spacing={2}>
              {publishReadyExams.map(exam => (
                <Grid item xs={12} md={6} lg={4} key={exam.id}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" noWrap>{exam?.title || 'Unknown'}</Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {exam?.subject || 'N/A'} ({exam?.section || 'N/A'})
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                      <Chip size="small" label={`${exam.totalSubmissions} Submissions`} />
                      <Button size="small" variant="contained" onClick={() => {
                        setSelectedExam(exam.id);
                        setTimeout(() => handlePublishClick(), 100);
                      }}>
                        Review & Publish
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Exam Selector + Actions */}
      <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 300 }} size="small">
              <InputLabel>Select Exam</InputLabel>
              <Select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                label="Select Exam"
              >
                {exams.map(e => (
                  <MenuItem key={e.id} value={e.id}>
                    {e?.title || 'Unknown'} — {e?.subject || 'N/A'} ({e?.section || 'N/A'}) [{e.totalSubmissions} submissions]
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedExam && (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<BarChart3 size={16} />}
                  onClick={() => navigate(`/faculty/results/analytics/${selectedExam}`)}
                >
                  Analytics
                </Button>
                <Button variant="outlined" size="small" startIcon={<Download size={16} />} onClick={handleExport}>
                  Export CSV
                </Button>
                <Button variant="contained" size="small" color="success" startIcon={<Send size={16} />} onClick={handlePublishClick}>
                  Publish Results
                </Button>
              </>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      {selectedExam && (
        <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            {loadingSubmissions ? (
              <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
            ) : submissions.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
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
          <Typography variant="body2" color="text.secondary">Choose an exam from the dropdown above to view student submissions and evaluation status.</Typography>
        </Paper>
      )}

      {/* Publish Confirmation Dialog */}
      <Dialog open={publishModalOpen} onClose={() => !isPublishing && setPublishModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>Review & Publish Results</DialogTitle>
        <DialogContent dividers>
          {analyticsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
          ) : analytics ? (
            <Box>
              <Alert severity="warning" sx={{ mb: 3 }}>
                Publishing results will lock all marks and make them visible to students. This action cannot be undone.
              </Alert>

              <Grid container spacing={3} sx={{ mb: 4 }}>
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
                    <Typography variant="body2" color="text.secondary">Pass Percentage</Typography>
                    <Typography variant="h4" color="success.main">{analytics.summary.passPercentage}%</Typography>
                  </Card>
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom>Grade Distribution Overview</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 4 }}>
                {Object.entries(analytics.gradeDistribution || {}).map(([grade, count]) => (
                  <Chip key={grade} label={`${grade}: ${count}`} color={grade === 'F' ? 'error' : 'primary'} variant={count > 0 ? 'filled' : 'outlined'} />
                ))}
              </Box>

              <Typography variant="h6" gutterBottom>Top 5 Students</Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'grey.100' }}>
                    <TableRow>
                      <TableCell>Rank</TableCell>
                      <TableCell>Student</TableCell>
                      <TableCell>Register No.</TableCell>
                      <TableCell align="right">Percentage</TableCell>
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
                    {(!analytics.top10 || analytics.top10.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">No results available</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : (
            <Alert severity="error">Failed to load analytics for this exam.</Alert>
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
    </Box>
  );
}

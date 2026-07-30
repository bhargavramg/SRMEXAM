import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, Chip, CircularProgress,
  Select, MenuItem, FormControl, InputLabel, IconButton, Tooltip, Paper, Divider
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
  const [selectedExam, setSelectedExam] = useState('');

  // Fetch dashboard stats
  const { data: dashboard, isLoading: loadingDashboard } = useQuery({
    queryKey: ['resultsDashboard'],
    queryFn: () => facultyApi.getResultsDashboard(),
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

  const handlePublish = async () => {
    if (!selectedExam) return;
    if (!window.confirm('Are you sure you want to publish results? Marks will become read-only.')) return;
    try {
      await facultyApi.publishResults(selectedExam);
      window.location.reload();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to publish');
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
                    {e.title} — {e.subject} ({e.section}) [{e.totalSubmissions} submissions]
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
                <Button variant="contained" size="small" color="success" startIcon={<Send size={16} />} onClick={handlePublish}>
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
    </Box>
  );
}

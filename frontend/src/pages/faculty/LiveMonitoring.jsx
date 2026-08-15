import React, { useEffect, useState } from 'react';
import { 
  Typography, Box, Card, CardContent, Grid, Chip, 
  CircularProgress, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, useTheme 
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../api/axiosClient';
import PageHeader from '../../components/PageHeader';
import { io } from 'socket.io-client';
import { useRefresh } from '../../contexts/RefreshContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const LiveMonitoring = () => {
  const { examId } = useParams();
  const theme = useTheme();
  const [liveSessions, setLiveSessions] = useState([]);
  const [assignedStudents, setAssignedStudents] = useState([]);
  
  // Fetch initial data
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['liveMonitoring', examId],
    queryFn: () => axiosClient.get(`/faculty/monitoring/${examId}`)
  });

  const { registerRefreshHandler } = useRefresh();

  useEffect(() => {
    const unregister = registerRefreshHandler(refetch);
    return () => unregister();
  }, [registerRefreshHandler, refetch]);

  // Keep auto refresh in place for HTTP fallback or general sync
  useAutoRefresh(refetch, 10000);

  useEffect(() => {
    if (data?.sessions) {
      setLiveSessions(data.sessions);
    }
    if (data?.assignedStudents) {
      setAssignedStudents(data.assignedStudents);
    }
  }, [data]);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const socketUrl = apiUrl.replace('/api', '');
    const socket = io(socketUrl);
    const token = localStorage.getItem('token');
    
    if (token && examId) {
       socket.emit('join_room', { room: `exam_${examId}`, role: 'FACULTY' });
    }

    socket.on('student_telemetry', (telemetryData) => {
      setLiveSessions(prev => {
        const existing = prev.find(s => s.studentId === telemetryData.studentId);
        if (existing) {
          return prev.map(s => s.studentId === telemetryData.studentId ? { ...s, telemetry: telemetryData, lastActivity: new Date().toISOString() } : s);
        } else {
          return [...prev, { studentId: telemetryData.studentId, telemetry: telemetryData, status: 'IN_PROGRESS', startTime: new Date().toISOString(), lastActivity: new Date().toISOString() }];
        }
      });
    });

    // student_warning_alert is now broadcast by the backend HTTP logActivity handler
    // with the CONFIRMED database warningCount — use this authoritative value, do NOT
    // blindly increment the local counter.
    socket.on('student_warning_alert', (warningData) => {
      setLiveSessions(prev => prev.map(s => {
        if (s.studentId !== warningData.studentId) return s;

        // Use the backend-confirmed count if provided; otherwise fall back to increment
        const confirmedCount = (typeof warningData.warningCount === 'number')
          ? warningData.warningCount
          : (s._count?.warnings || 0) + 1;

        return {
          ...s,
          _count: { ...s._count, warnings: confirmedCount },
          lastActivity: new Date().toISOString()
        };
      }));
    });

    return () => socket.disconnect();
  }, [examId]);

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  // Calculate statistics — these are UNCHANGED exam-status counters
  // Violations are additional security information and do not affect these counts
  const totalAssigned = assignedStudents.length;
  const totalStarted = liveSessions.length;
  const totalWriting = liveSessions.filter(s => s.status === 'IN_PROGRESS' || !s.status).length;
  const totalCompleted = liveSessions.filter(s => s.status && s.status !== 'IN_PROGRESS').length;

  // Format date helper
  const formatTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getStatusChip = (status) => {
    switch(status) {
      case 'WRITING':
        return <Chip label="WRITING" size="small" sx={{ backgroundColor: theme.palette.info.light, color: theme.palette.info.contrastText, fontWeight: 'bold' }} />;
      case 'COMPLETED':
        return <Chip label="COMPLETED" size="small" sx={{ backgroundColor: theme.palette.success.main, color: '#fff', fontWeight: 'bold' }} />;
      default:
        return <Chip label="NOT STARTED" size="small" sx={{ backgroundColor: theme.palette.grey[300], color: theme.palette.text.secondary, fontWeight: 'bold' }} />;
    }
  };

  const getViolationChip = (count) => {
    if (!count || count === 0) {
      return <Chip label="0" size="small" sx={{ bgcolor: theme.palette.grey[100], color: theme.palette.text.secondary, fontWeight: 'bold', minWidth: 40 }} />;
    }
    if (count <= 2) {
      return <Chip label={count} size="small" sx={{ bgcolor: '#FFF3E0', color: '#E65100', fontWeight: 'bold', minWidth: 40 }} />;
    }
    return <Chip label={count} size="small" sx={{ bgcolor: '#FFEBEE', color: '#C62828', fontWeight: 'bold', minWidth: 40 }} />;
  };

  return (
    <Box>
      <PageHeader 
        title={`Live Examination Monitoring`} 
        subtitle="Real-time overview of student participation and examination progress."
        breadcrumbs={[{ label: 'Faculty' }, { label: 'Exams', path: '/faculty/exams' }, { label: 'Live' }]}
      />
      
      {/* Top Summary Cards — UNCHANGED, violations do NOT affect these counts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', boxShadow: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Total Students Assigned</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 1 }}>{totalAssigned}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'info.main', color: 'info.contrastText', boxShadow: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Students Started</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 1 }}>{totalStarted}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'warning.main', color: 'warning.contrastText', boxShadow: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Students Currently Writing</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 1 }}>{totalWriting}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'success.main', color: 'success.contrastText', boxShadow: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Students Completed</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 1 }}>{totalCompleted}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Student Monitoring Table */}
      <Card sx={{ boxShadow: 2 }}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper} elevation={0}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead sx={{ bgcolor: theme.palette.grey[50] }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Student Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Register/Roll Number</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Exam Start Time</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Last Activity</TableCell>
                  {/* Violations column — additional security info, separate from exam-status counts */}
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Violations</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignedStudents.map((student) => {
                  const session = liveSessions.find(s => s.studentId === student.id);
                  let displayStatus = 'NOT STARTED';
                  if (session) {
                    if (session.status === 'IN_PROGRESS' || !session.status) displayStatus = 'WRITING';
                    else displayStatus = 'COMPLETED';
                  }

                  // Violation count from DB (via initial fetch or live socket update)
                  const violationCount = session?._count?.warnings ?? 0;

                  return (
                    <TableRow key={student.id} hover>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.register_no || '-'}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell align="center">{getStatusChip(displayStatus)}</TableCell>
                      <TableCell>{formatTime(session?.startTime)}</TableCell>
                      <TableCell>{formatTime(session?.lastActivity || session?.telemetry?.timestamp)}</TableCell>
                      <TableCell align="center">{getViolationChip(violationCount)}</TableCell>
                    </TableRow>
                  );
                })}
                {assignedStudents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      <Typography variant="body1" color="text.secondary">
                        No students are assigned to this exam.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LiveMonitoring;

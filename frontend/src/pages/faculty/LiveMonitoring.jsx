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

    socket.on('student_warning', (warningData) => {
      setLiveSessions(prev => prev.map(s => s.studentId === warningData.studentId ? { 
         ...s, 
         _count: { ...s._count, warnings: (s._count?.warnings || 0) + 1 },
         lastActivity: new Date().toISOString()
      } : s));
    });

    return () => socket.disconnect();
  }, [examId]);

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  // Calculate statistics
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

  return (
    <Box>
      <PageHeader 
        title={`Live Examination Monitoring`} 
        subtitle="Real-time overview of student participation and examination progress."
        breadcrumbs={[{ label: 'Faculty' }, { label: 'Exams', path: '/faculty/exams' }, { label: 'Live' }]}
      />
      
      {/* Top Summary Cards */}
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

                  return (
                    <TableRow key={student.id} hover>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.register_no || '-'}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell align="center">{getStatusChip(displayStatus)}</TableCell>
                      <TableCell>{formatTime(session?.startTime)}</TableCell>
                      <TableCell>{formatTime(session?.lastActivity || session?.telemetry?.timestamp)}</TableCell>
                    </TableRow>
                  );
                })}
                {assignedStudents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
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

import React, { useEffect, useState } from 'react';
import { Typography, Box, Card, CardContent, Grid, Chip, CircularProgress, LinearProgress } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../api/axiosClient';
import PageHeader from '../../components/PageHeader';
import { io } from 'socket.io-client';

const LiveMonitoring = () => {
  const { examId } = useParams();
  const [liveSessions, setLiveSessions] = useState([]);
  
  // Fetch initial data
  const { data, isLoading } = useQuery({
    queryKey: ['liveMonitoring', examId],
    queryFn: () => axiosClient.get(`/faculty/monitoring/${examId}`)
  });

  useEffect(() => {
    if (data?.sessions) {
      setLiveSessions(data.sessions);
    }
  }, [data]);

  useEffect(() => {
    const socket = io('http://localhost:5000');
    const token = localStorage.getItem('token');
    
    if (token && examId) {
       socket.emit('join_room', { room: `exam_${examId}`, role: 'FACULTY' });
    }

    socket.on('student_telemetry', (telemetryData) => {
      setLiveSessions(prev => {
        const existing = prev.find(s => s.studentId === telemetryData.studentId);
        if (existing) {
          return prev.map(s => s.studentId === telemetryData.studentId ? { ...s, telemetry: telemetryData } : s);
        } else {
          return [...prev, { studentId: telemetryData.studentId, telemetry: telemetryData, status: 'IN_PROGRESS' }];
        }
      });
    });

    socket.on('student_warning', (warningData) => {
      setLiveSessions(prev => prev.map(s => s.studentId === warningData.studentId ? { 
         ...s, 
         _count: { ...s._count, warnings: (s._count?.warnings || 0) + 1 }
      } : s));
    });

    return () => socket.disconnect();
  }, [examId]);

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      <PageHeader 
        title={`Live Monitoring: ${data?.exam?.title || ''}`} 
        subtitle="Monitor students taking this exam in real-time"
        breadcrumbs={[{ label: 'Faculty' }, { label: 'Exams', path: '/faculty/exams' }, { label: 'Live' }]}
      />
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
               <Typography variant="h6" sx={{ mb: 2 }}>Active Students</Typography>
               <Grid container spacing={2}>
                 {liveSessions.map((session, idx) => (
                   <Grid item xs={12} sm={6} md={4} key={idx}>
                     <Card variant="outlined">
                       <CardContent>
                         <Typography variant="subtitle1" fontWeight="bold">
                           {session.student?.name || `Student ${session.studentId}`}
                         </Typography>
                         <Typography variant="body2" color="text.secondary" gutterBottom>
                           {session.student?.register_no}
                         </Typography>
                         <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
                           <Typography variant="caption">Status:</Typography>
                           <Chip size="small" label={session.status || 'ACTIVE'} color={session.status === 'SUBMITTED' ? 'success' : 'primary'} />
                         </Box>
                         <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
                           <Typography variant="caption">Warnings:</Typography>
                           <Chip size="small" label={session._count?.warnings || 0} color={(session._count?.warnings || 0) > 0 ? 'error' : 'default'} />
                         </Box>
                         <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
                           <Typography variant="caption">Fullscreen:</Typography>
                           <Chip size="small" label={session.telemetry?.isFullscreen ? 'YES' : 'NO'} color={session.telemetry?.isFullscreen ? 'success' : 'error'} />
                         </Box>
                       </CardContent>
                     </Card>
                   </Grid>
                 ))}
                 {liveSessions.length === 0 && (
                   <Typography variant="body2" sx={{ p: 2 }}>No students have started this exam yet.</Typography>
                 )}
               </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LiveMonitoring;

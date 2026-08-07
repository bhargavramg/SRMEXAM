import React from 'react';
import { Box, Grid, Card, CardContent, Typography, CircularProgress } from '@mui/material';
import { Business, School, People, MenuBook, Assignment } from '@mui/icons-material';
import PageHeader from '../../components/PageHeader';
import { useQuery } from '@tanstack/react-query';
import adminApi from '../../api/adminApi';

const AdminDashboard = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: () => adminApi.getDashboardData()
  });

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  if (error) return <Typography color="error">Failed to load dashboard data</Typography>;

  const { stats, activeAcademicYear } = data || {};

  const statCards = [
    { title: 'Departments', value: stats?.departments || 0, icon: <Business fontSize="large" color="primary" />, color: '#e3f2fd' },
    { title: 'Courses', value: stats?.courses || 0, icon: <MenuBook fontSize="large" color="secondary" />, color: '#f3e5f5' },
    { title: 'Faculty', value: stats?.faculty || 0, icon: <People fontSize="large" color="success" />, color: '#e8f5e9' },
    { title: 'Students', value: stats?.students || 0, icon: <School fontSize="large" color="info" />, color: '#e0f7fa' },
    { title: 'Exams', value: stats?.exams || 0, icon: <Assignment fontSize="large" color="warning" />, color: '#fff3e0' },
  ];

  return (
    <Box>
      <PageHeader 
        title="Admin Dashboard" 
        subtitle="Overview of University Activity" 
        action={
          activeAcademicYear ? (
            <Typography variant="body2" sx={{ bgcolor: 'primary.main', color: 'white', px: 2, py: 1, borderRadius: 2 }}>
              Current Academic Year: {activeAcademicYear.name}
            </Typography>
          ) : null
        }
      />
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((card, idx) => (
          <Grid item xs={12} sm={6} md={2.4} key={idx}>
            <Card sx={{ borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', height: '100%' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
                <Box sx={{ p: 2, borderRadius: '50%', bgcolor: card.color, mb: 2 }}>
                  {card.icon}
                </Box>
                <Typography variant="h4" fontWeight={700} gutterBottom>{card.value}</Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>{card.title}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>System Status</Typography>
              <Typography variant="body2" color="text.secondary">All systems are running normally. No active alerts.</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Recent Audit Logs</Typography>
              <Typography variant="body2" color="text.secondary">Visit the Audit Logs page to view detailed tracking of user activity.</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;

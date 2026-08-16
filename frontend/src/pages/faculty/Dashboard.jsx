import React, { useMemo } from 'react';
import {
  Box, Grid, Typography, Card, CardContent, List, ListItem,
  ListItemText, ListItemAvatar, Avatar, Button, Divider, useTheme,
  IconButton, Skeleton, Paper, Stack, Chip
} from '@mui/material';
import {
  HelpCircle as QuizOutlined,
  FileText as AssignmentOutlined,
  PlayCircle as PlayCircleOutline,
  FileEdit as DraftsOutlined,
  Users as PeopleOutline,
  PlusCircle as AddCircleOutline,
  BookOpen as LibraryBooksOutlined,
  Eye as EyeIcon,
  Bell as NotificationsIcon,
  RefreshCw as RefreshIcon,
  Briefcase as BriefcaseIcon,
  Clock as ClockIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import facultyApi from '../../api/facultyApi';

const Dashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading: loading, isError: error, refetch, isFetching } = useQuery({
    queryKey: ['facultyDashboard'],
    queryFn: () => facultyApi.getDashboardData()
  });

  const stats = data?.stats || {};
  const recentActivity = data?.recentActivity || [];
  const assignments = data?.assignments || [];

  const statCards = useMemo(() => [
    { title: 'Total Assignments', value: stats.totalAssignments || 0, icon: <AssignmentOutlined size={24} />, desc: 'Subjects assigned' },
    { title: 'Active Exams', value: stats.activeExams || 0, icon: <PlayCircleOutline size={24} />, desc: 'Currently active' },
    { title: 'Draft Exams', value: stats.upcomingExams || 0, icon: <DraftsOutlined size={24} />, desc: 'Scheduled / Draft' },
    { title: 'Students Assigned', value: stats.totalStudents || 0, icon: <PeopleOutline size={24} />, desc: 'Students across assignments' },
  ], [stats]);

  if (error) {
    return (
      <Box sx={{ p: 4, bgcolor: '#F8FAFC', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid', borderColor: 'primary.light', textAlign: 'center', maxWidth: 400 }}>
          <Typography variant="h6" color="primary.main" gutterBottom fontWeight={600}>
            Unable to load dashboard data
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            There was an error connecting to the server. Please try again.
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => refetch()} 
            startIcon={<RefreshIcon size={18} />}
            sx={{ textTransform: 'none', px: 3, py: 1, borderRadius: 2 }}
          >
            Try Again
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100vh', p: { xs: 2, md: 4 } }}>
      
      {/* HEADER SECTION */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4" fontWeight={700} color="primary.dark" gutterBottom>
          Welcome back, {user?.name || 'Faculty Member'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Faculty overview and examination activity
        </Typography>
      </Box>

      {/* KPI CARDS */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        {statCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            {loading ? (
              <Skeleton variant="rounded" height={120} sx={{ borderRadius: 3 }} />
            ) : (
              <Card 
                elevation={0} 
                sx={{ 
                  borderRadius: 3, 
                  border: '1px solid', 
                  borderColor: 'primary.100',
                  bgcolor: 'white',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 24px -10px rgba(0,0,0,0.1)'
                  }
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box 
                      sx={{ 
                        p: 1.2, 
                        borderRadius: 2, 
                        bgcolor: 'primary.50', 
                        color: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2
                      }}
                    >
                      {stat.icon}
                    </Box>
                    <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {stat.title}
                    </Typography>
                  </Box>
                  <Typography variant="h3" fontWeight={700} color="primary.dark" sx={{ mb: 0.5 }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stat.desc}
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Grid>
        ))}
      </Grid>

      {/* MAIN CONTENT GRID */}
      <Grid container spacing={4}>
        
        {/* LEFT COLUMN: ASSIGNMENTS */}
        <Grid item xs={12} md={8}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" fontWeight={700} color="primary.dark" sx={{ mb: 3 }}>
              My Subject Assignments
            </Typography>
            
            {loading ? (
              <Grid container spacing={3}>
                {[1, 2].map((i) => (
                  <Grid item xs={12} sm={6} key={i}>
                    <Skeleton variant="rounded" height={160} sx={{ borderRadius: 3 }} />
                  </Grid>
                ))}
              </Grid>
            ) : assignments.length === 0 ? (
              <Paper elevation={0} sx={{ p: 5, borderRadius: 3, border: '1px solid', borderColor: 'primary.100', textAlign: 'center', bgcolor: 'white' }}>
                <BriefcaseIcon size={48} color={theme.palette.primary.light} style={{ marginBottom: 16 }} />
                <Typography variant="h6" color="primary.dark" gutterBottom fontWeight={600}>
                  No subject assignments yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  You haven't been assigned any subjects for this academic year.
                </Typography>
              </Paper>
            ) : (
              <Grid container spacing={3}>
                {assignments.map(assignment => (
                  <Grid item xs={12} sm={6} key={assignment.id}>
                    <Card 
                      elevation={0} 
                      sx={{ 
                        height: '100%', 
                        borderRadius: 3,
                        border: '1px solid', 
                        borderColor: 'primary.100',
                        bgcolor: 'white',
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" fontWeight={600} color="primary.main" gutterBottom sx={{ lineHeight: 1.3 }}>
                          {assignment?.subject?.name || 'N/A'}
                        </Typography>
                        <Chip 
                          label={assignment?.subject?.code || 'N/A'} 
                          size="small" 
                          sx={{ 
                            bgcolor: 'primary.50', 
                            color: 'primary.dark',
                            fontWeight: 600,
                            borderRadius: 1.5,
                            mb: 2
                          }} 
                        />
                        <Divider sx={{ my: 2, borderColor: 'primary.50' }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">Assessment:</Typography>
                          <Typography variant="body2" fontWeight={600} color="primary.dark">
                            {assignment.assessmentType?.name || 'N/A'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Academic Year:</Typography>
                          <Typography variant="body2" fontWeight={600} color="primary.dark">
                            {assignment.academicYear?.name || 'N/A'}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Grid>

        {/* RIGHT COLUMN: QUICK ACTIONS & ACTIVITY */}
        <Grid item xs={12} md={4}>
          
          {/* QUICK ACTIONS */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" fontWeight={700} color="primary.dark" sx={{ mb: 3 }}>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              {[
                { title: 'Create Exam', icon: <AddCircleOutline size={20} />, path: '/faculty/create-exam' },
                { title: 'Question Bank', icon: <LibraryBooksOutlined size={20} />, path: '/faculty/questions' },
                { title: 'Student Management', icon: <PeopleOutline size={20} />, path: '/faculty/students' },
                { title: 'Student Results', icon: <AssignmentOutlined size={20} />, path: '/faculty/results' }
              ].map((action, i) => (
                <Grid item xs={6} key={i}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => navigate(action.path)}
                    sx={{
                      height: '100%',
                      p: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'primary.100',
                      bgcolor: 'white',
                      color: 'primary.main',
                      textTransform: 'none',
                      '&:hover': {
                        bgcolor: 'primary.50',
                        borderColor: 'primary.main'
                      }
                    }}
                  >
                    <Box sx={{ mb: 1 }}>{action.icon}</Box>
                    <Typography variant="caption" fontWeight={600} textAlign="center" sx={{ lineHeight: 1.2 }}>
                      {action.title}
                    </Typography>
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* EXAM ACTIVITY */}
          <Box>
            <Typography variant="h6" fontWeight={700} color="primary.dark" sx={{ mb: 3 }}>
              Exam Activity
            </Typography>
            <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'primary.100', bgcolor: 'white' }}>
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                {loading ? (
                  <Box sx={{ p: 3 }}>
                    {[1, 2, 3].map((i) => (
                      <Box key={i} sx={{ display: 'flex', mb: 3 }}>
                        <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
                        <Box sx={{ flex: 1 }}>
                          <Skeleton variant="text" width="60%" />
                          <Skeleton variant="text" width="40%" />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : recentActivity.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <ClockIcon size={40} color={theme.palette.primary.light} style={{ marginBottom: 16 }} />
                    <Typography variant="body2" color="text.secondary">
                      No recent activity recorded.
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ p: 0 }}>
                    {recentActivity.map((activity, index) => (
                      <React.Fragment key={activity.id}>
                        <ListItem alignItems="flex-start" sx={{ px: 3, py: 2.5 }}>
                          <ListItemAvatar sx={{ minWidth: 56 }}>
                            <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.50', color: 'primary.main', fontWeight: 600, fontSize: '1rem' }}>
                              {activity.action.charAt(0)}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Typography variant="body2" fontWeight={700} color="primary.dark" sx={{ mb: 0.5 }}>
                                {activity.action.replace(/_/g, ' ')}
                              </Typography>
                            }
                            secondary={
                              <Box>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                                  {activity.user ? `${activity.user.name} - ` : ''}{activity.details || 'System event'}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'primary.light', fontWeight: 500 }}>
                                  {new Date(activity.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < recentActivity.length - 1 && <Divider component="li" sx={{ borderColor: 'primary.50' }} />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
      
      {/* Global styles for animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
};

export default Dashboard;

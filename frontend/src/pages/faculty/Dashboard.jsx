import React, { useMemo } from 'react';
import {
  Box, Grid, Typography, Card, CardContent, List, ListItem,
  ListItemText, ListItemAvatar, Avatar, Button, Divider, useTheme,
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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { StatCard, ActionCard } from '../../components/cards';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../components/feedback';
import PageHeader from '../../components/PageHeader';
import facultyApi from '../../api/facultyApi';

const Dashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const { data, isLoading: loading, isError: error } = useQuery({
    queryKey: ['facultyDashboard'],
    queryFn: () => facultyApi.getDashboardData()
  });

  const stats = data?.stats || {
    totalExams: 0,
    activeExams: 0,
    draftExams: 0,
    totalStudents: 0,
    upcomingCount: 0
  };

  const recentActivity = data?.recentActivity || [];

  const statCards = useMemo(() => [
    { title: 'Total Exams', value: stats.totalExams, icon: <AssignmentOutlined />, color: 'primary' },
    { title: 'Active Exams', value: stats.activeExams, icon: <PlayCircleOutline />, color: 'success' },
    { title: 'Draft Exams', value: stats.draftExams, icon: <DraftsOutlined />, color: 'warning' },
    { title: 'Students Assigned', value: stats.totalStudents, icon: <PeopleOutline />, color: 'info' },
  ], [stats]);

  if (error) {
    return (
      <Box>
        <PageHeader title="Dashboard" subtitle="Welcome back, Faculty Member" />
        <ErrorState message="Failed to load dashboard data" onRetry={() => window.location.reload()} />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your examination system"
        breadcrumbs={[
          { label: 'Faculty' },
          { label: 'Dashboard' },
        ]}
      />

      {/* Stat Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            {loading ? (
              <LoadingSkeleton type="stat" />
            ) : (
              <StatCard
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                color={stat.color}
              />
            )}
          </Grid>
        ))}
      </Grid>

      {/* Main Content Area */}
      <Grid container spacing={3}>
        {/* Left Column: Assignments & Recent Activity */}
        <Grid item xs={12} md={4}>
          {/* Assignments */}
          {data?.assignments?.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>My Subject Assignments</Typography>
              <Grid container spacing={2}>
                {data.assignments.map(assignment => (
                  <Grid item xs={12} key={assignment.id}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent>
                        <Typography variant="h6" color="primary">{assignment.subject.name}</Typography>
                        <Typography variant="body2" color="text.secondary">Code: {assignment.subject.code}</Typography>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="body2"><strong>Section:</strong> {assignment.section.name}</Typography>
                        <Typography variant="body2"><strong>Semester:</strong> {assignment.section.semester.semesterNumber}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Recent Activity */}
          <Box>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Recent Activity</Typography>
            <Card>
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                {loading ? (
                  <Box sx={{ p: 3 }}>
                    {[1, 2, 3].map((i) => (
                      <LoadingSkeleton key={i} type="default" />
                    ))}
                  </Box>
                ) : recentActivity.length === 0 ? (
                  <Box sx={{ py: 3 }}>
                    <EmptyState title="No recent activity" message="Activity will appear here as you use the system." />
                  </Box>
                ) : (
                  <List sx={{ px: 2, pb: 1 }}>
                    {recentActivity.map((activity, index) => (
                      <React.Fragment key={activity.id}>
                        <ListItem alignItems="flex-start" sx={{ px: 1, py: 1.5 }}>
                          <ListItemAvatar sx={{ minWidth: 48 }}>
                            <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.light', color: 'primary.dark' }}>
                              {activity.action.charAt(0)}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={<Typography variant="body2" fontWeight={600}>{activity.action}</Typography>}
                            secondary={
                              <>
                                <Typography variant="body2" color="text.secondary">
                                  {activity.user ? `${activity.user.name} - ` : ''}{activity.details || 'System event'}
                                </Typography>
                                <Typography variant="caption" color="text.disabled">
                                  {new Date(activity.createdAt).toLocaleString()}
                                </Typography>
                              </>
                            }
                          />
                        </ListItem>
                        {index < recentActivity.length - 1 && <Divider variant="inset" component="li" sx={{ ml: 7 }} />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Box>
        </Grid>

        {/* Right Column: Quick Actions */}
        <Grid item xs={12} md={8}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Quick Actions</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <ActionCard
                title="Create New Exam"
                description="Set up a new exam for your assigned subjects"
                icon={<AddCircleOutline sx={{ fontSize: 32 }} />}
                onClick={() => navigate('/faculty/create-exam')}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <ActionCard
                title="Manage Questions"
                description="Manage your question banks"
                icon={<LibraryBooksOutlined sx={{ fontSize: 32 }} />}
                onClick={() => navigate('/faculty/questions')}
                color="info"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <ActionCard
                title="View Active Exams"
                description="Monitor ongoing examinations"
                icon={<EyeIcon sx={{ fontSize: 32 }} />}
                onClick={() => navigate('/faculty/exams')}
                color="success"
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;

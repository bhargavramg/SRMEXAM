import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, Drawer, AppBar, Toolbar, List, Typography, 
  Divider, IconButton, ListItem, ListItemButton, 
  ListItemIcon, ListItemText, Avatar, Menu, MenuItem, 
  Badge, useTheme, useMediaQuery 
} from '@mui/material';
import { 
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  LibraryBooks as QuestionBankIcon,
  PeopleAlt as StudentIcon,
  AddCircleOutlined as CreateExamIcon,
  SettingsApplications as ManageExamsIcon,
  Category as CategoryIcon,
  Assessment as ResultsIcon,
  LiveTv as LiveMonitoringIcon,
  EventNote as ScheduleIcon,
  PieChart as ReportsIcon,
  Notifications as NotificationsIcon,
  AccountCircle as ProfileIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import TopNavbar from '../components/layout/TopNavbar';

const drawerWidth = 280;

const FacultyLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    logout();
    navigate('/login');
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/faculty/dashboard' },
    { text: 'Question Bank', icon: <QuestionBankIcon />, path: '/faculty/question-bank' },
    { text: 'Student Management', icon: <StudentIcon />, path: '/faculty/students' },
    { text: 'Create Exam', icon: <CreateExamIcon />, path: '/faculty/create-exam' },
    { text: 'Manage Exams', icon: <ManageExamsIcon />, path: '/faculty/exams' },
    { text: 'Question Categories', icon: <CategoryIcon />, path: '/faculty/categories' },
    { text: 'Student Results', icon: <ResultsIcon />, path: '/faculty/results' },
    { text: 'Live Monitoring', icon: <LiveMonitoringIcon />, path: '/faculty/live-monitoring' },
    { text: 'Exam Schedule', icon: <ScheduleIcon />, path: '/faculty/schedule' },
    { text: 'Reports', icon: <ReportsIcon />, path: '/faculty/reports' },
    { text: 'Notifications', icon: <NotificationsIcon />, path: '/faculty/notifications' },
  ];

  const secondaryMenuItems = [
    { text: 'Profile', icon: <ProfileIcon />, path: '/faculty/profile' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/faculty/settings' },
  ];

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
        <Typography variant="h6" color="primary" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box component="span" sx={{ 
            bgcolor: 'primary.main', 
            color: 'white', 
            width: 32, 
            height: 32, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            borderRadius: 1 
          }}>
            E
          </Box>
          ExamPortal <Typography variant="caption" sx={{ ml: 1, bgcolor: '#E3F2FD', color: 'primary.main', px: 1, py: 0.5, borderRadius: 1, fontWeight: 700 }}>FACULTY</Typography>
        </Typography>
      </Toolbar>
      <Divider />
      
      <List sx={{ px: 2, py: 2, flexGrow: 1, overflowY: 'auto' }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton 
              selected={location.pathname.includes(item.path)}
              onClick={() => {
                navigate(item.path);
                if (isMobile) setMobileOpen(false);
              }}
              sx={{
                borderRadius: 2,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': {
                    color: 'primary.contrastText',
                  },
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  }
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: location.pathname.includes(item.path) ? 'inherit' : 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{ 
                  fontWeight: location.pathname.includes(item.path) ? 600 : 500,
                  fontSize: '0.95rem'
                }} 
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />
      
      <List sx={{ px: 2, py: 2 }}>
        {secondaryMenuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton 
              selected={location.pathname.includes(item.path)}
              onClick={() => {
                navigate(item.path);
                if (isMobile) setMobileOpen(false);
              }}
              sx={{ borderRadius: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.95rem' }} />
            </ListItemButton>
          </ListItem>
        ))}
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2, color: 'error.main' }}>
            <ListItemIcon sx={{ minWidth: 40, color: 'error.main' }}><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: '0.95rem', fontWeight: 500 }} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', bgcolor: '#F5F7FA', minHeight: '100vh' }}>
      {/* App Bar */}
      <TopNavbar onMenuClick={handleDrawerToggle} isMobile={isMobile} role="Faculty Member" />

      {/* Sidebar Navigation */}
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid', borderColor: 'divider' },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, width: { md: `calc(100% - ${drawerWidth}px)` }, mt: '64px' }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default FacultyLayout;

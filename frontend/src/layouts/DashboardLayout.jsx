import React from 'react';
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText, Typography, AppBar, Toolbar, Avatar, IconButton } from '@mui/material';
import { BookOpen, LayoutDashboard, FileText, Bell, Settings, LogOut, Menu } from 'lucide-react';
import { useNavigate, Outlet } from 'react-router-dom';

const drawerWidth = 260;

const DashboardLayout = () => {
  const navigate = useNavigate();

  const location = window.location.pathname;

  const handleLogout = () => {
    navigate('/login');
  };

  const menuItems = [
    { text: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/student/dashboard' },
    { text: 'My Exams', icon: <FileText size={20} />, path: '/student/exams' },
    { text: 'Results', icon: <BookOpen size={20} />, path: '/student/results' },
    { text: 'Settings', icon: <Settings size={20} />, path: '/student/settings' },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* App Bar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: 'white', color: 'text.primary', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', width: drawerWidth - 24 }}>
            <BookOpen color="#1565C0" size={28} />
            <Typography variant="h6" noWrap component="div" sx={{ ml: 2, fontWeight: 700, color: 'primary.main' }}>
              ExamPortal
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton color="primary">
              <Bell size={20} />
            </IconButton>
            <Avatar sx={{ bgcolor: 'primary.light', width: 36, height: 36 }}>S</Avatar>
            <Typography variant="subtitle2" sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 600 }}>
              Student
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', borderRight: '1px solid #E3F2FD' },
        }}
      >
        <Toolbar /> {/* Spacer */}
        <Box sx={{ overflow: 'auto', mt: 3, px: 2 }}>
          <List>
            {menuItems.map((item) => {
              const isActive = location.startsWith(item.path);
              return (
                <ListItem 
                  button 
                  key={item.text} 
                  onClick={() => navigate(item.path)}
                  sx={{ 
                    mb: 1, 
                    borderRadius: 2, 
                    '&:hover': { bgcolor: '#F5FAFF', color: 'primary.main' }, 
                    ...(isActive && { bgcolor: '#E3F2FD', color: 'primary.main' }) 
                  }}
                >
                  <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 600 }} />
                </ListItem>
              );
            })}
          </List>
          
          <Box sx={{ position: 'absolute', bottom: 20, width: `calc(100% - 32px)` }}>
            <ListItem button onClick={handleLogout} sx={{ borderRadius: 2, color: '#D32F2F', '&:hover': { bgcolor: '#FFEBEE' } }}>
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                <LogOut size={20} />
              </ListItemIcon>
              <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 600 }} />
            </ListItem>
          </Box>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 4, mt: 8 }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default DashboardLayout;

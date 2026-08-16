import React from 'react';
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText, Typography, AppBar, Toolbar, Avatar, IconButton } from '@mui/material';
import { BookOpen, LayoutDashboard, FileText, Bell, Settings, LogOut, Menu } from 'lucide-react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import TopNavbar from '../components/layout/TopNavbar';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 260;

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { text: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/student/dashboard' },
    { text: 'My Exams', icon: <FileText size={20} />, path: '/student/exams' },
    { text: 'Results', icon: <BookOpen size={20} />, path: '/student/results' },
    { text: 'Settings', icon: <Settings size={20} />, path: '/student/settings' },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <TopNavbar onMenuClick={handleDrawerToggle} isMobile={false} role="Student" />

      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', borderRight: '1px solid #E3F2FD' },
        }}
      >
        <Box sx={{ width: '100%', height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, boxSizing: 'border-box' }}>
          <Box
            component="img"
            src="/srm-logo.jpg"
            alt="SRM Institute of Science and Technology"
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </Box>
        <Box sx={{ overflow: 'auto', mt: 1, px: 2 }}>
          <List>
            {menuItems.map((item) => {
              const isActive = pathname.startsWith(item.path);
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

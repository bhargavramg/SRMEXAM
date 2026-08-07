import React from 'react';
import { AppBar, Toolbar, IconButton, Typography, Box, Avatar, Badge, Menu, MenuItem, Button, CircularProgress } from '@mui/material';
import { Menu as MenuIcon, Notifications, AccountCircle, Refresh as RefreshIcon, WifiOff as WifiOffIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useRefresh } from '../../contexts/RefreshContext';
import { useNetworkState } from '../../hooks/useNetworkState';
import GlobalRefreshButton from './GlobalRefreshButton';

const TopNavbar = ({ onMenuClick, isMobile, role }) => {
  const { user, logout } = useAuth();
  const isOnline = useNetworkState();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenu = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  return (
    <AppBar 
      position="fixed" 
      elevation={0}
      sx={{ 
        width: { md: `calc(100% - 280px)` }, 
        ml: { md: '280px' },
        bgcolor: 'white',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
        zIndex: (theme) => theme.zIndex.drawer + 1
      }}
    >
      <Toolbar>
        {isMobile && (
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={onMenuClick}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
        )}

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
          {!isOnline && (
            <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main', mr: 1, bgcolor: '#FFEBEE', px: 1.5, py: 0.5, borderRadius: 2 }}>
              <WifiOffIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="caption" fontWeight="bold" sx={{ display: { xs: 'none', sm: 'block' } }}>Offline</Typography>
            </Box>
          )}

          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <GlobalRefreshButton />
          </Box>
          <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
            <GlobalRefreshButton isMobileView />
          </Box>

          <IconButton color="default">
            <Badge badgeContent={0} color="error">
              <Notifications />
            </Badge>
          </IconButton>
          
          <Box 
            onClick={handleMenu}
            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', p: 0.5, borderRadius: 2, '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' } }}
          >
            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" fontWeight={600}>{user?.name || 'User'}</Typography>
              <Typography variant="caption" color="text.secondary">{role || user?.role}</Typography>
            </Box>
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </Avatar>
          </Box>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            PaperProps={{ elevation: 2, sx: { mt: 1.5, minWidth: 200 } }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={handleClose}>
              <AccountCircle sx={{ mr: 1.5, color: 'text.secondary' }} /> Profile
            </MenuItem>
            <MenuItem onClick={() => { handleClose(); logout(); }} sx={{ color: 'error.main' }}>
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default TopNavbar;

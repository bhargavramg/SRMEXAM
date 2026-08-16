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

  const [currentQuote, setCurrentQuote] = React.useState('');

  React.useEffect(() => {
    if (role === 'Student') {
      const quotes = [
        "Your marks measure your answers. Your choices measure your character.",
        "Let your result be something you earned, not something you borrowed.",
        "A genuine score may be imperfect, but it will always be yours.",
        "The real achievement is not getting the highest score, but knowing you earned it.",
        "When no one is watching, your choices still define you.",
        "Write what you know. Learn from what you don't. Grow from every attempt.",
        "A score lasts for a moment. The character behind it lasts a lifetime.",
        "Your effort is the answer sheet that life remembers.",
        "Don't chase a perfect score. Chase a result you can be proud of.",
        "The best result is one you never had to explain."
      ];
      setCurrentQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }
  }, [role]);

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

        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', px: { xs: 1, md: 3 }, overflow: 'hidden' }}>
          {role === 'Student' && currentQuote && (
            <Typography 
              variant="body2" 
              sx={{ 
                fontStyle: 'italic', 
                color: '#6b7280', // medium gray
                fontSize: '14px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontWeight: 500
              }}
            >
              "{currentQuote}"
            </Typography>
          )}
        </Box>

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

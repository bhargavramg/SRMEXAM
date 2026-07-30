import React from 'react';
import { 
  Drawer, Box, List, ListItem, ListItemButton, 
  ListItemIcon, ListItemText, Typography, Divider, Chip
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

const DRAWER_WIDTH = 280;

const Sidebar = ({ menuItems, mobileOpen, onClose, isMobile, role }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 40, height: 40, bgcolor: 'primary.main', borderRadius: 2, color: 'white'
        }}>
          <BookOpen size={24} />
        </Box>
        <Box>
          <Typography variant="h6" color="primary" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            ExamPortal
          </Typography>
          <Chip label={role} size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.65rem', mt: 0.5, fontWeight: 600 }} />
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <List sx={{ px: 2, flex: 1, overflowY: 'auto', '&::-webkit-scrollbar': { width: '6px' }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '4px' } }}>
        {menuItems.filter(i => i.position === 'top').map((item) => {
          const isActive = location.pathname.includes(item.path);
          return (
            <ListItem key={item.title} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) onClose();
                }}
                sx={{
                  borderRadius: 2,
                  bgcolor: isActive ? 'primary.main' : 'transparent',
                  color: isActive ? 'white' : 'text.primary',
                  '&:hover': {
                    bgcolor: isActive ? 'primary.dark' : 'rgba(21, 101, 192, 0.08)',
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.title} 
                  primaryTypographyProps={{ fontWeight: isActive ? 600 : 500, fontSize: '0.95rem' }} 
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider />

      <List sx={{ p: 2 }}>
        {menuItems.filter(i => i.position === 'bottom').map((item) => (
          <ListItem key={item.title} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => {
                if (item.action) {
                  item.action();
                } else {
                  navigate(item.path);
                }
                if (isMobile) onClose();
              }}
              sx={{
                borderRadius: 2,
                color: item.danger ? 'error.main' : 'text.primary',
                '&:hover': {
                  bgcolor: item.danger ? 'error.light' : 'rgba(21, 101, 192, 0.08)',
                },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.title} primaryTypographyProps={{ fontWeight: 500, fontSize: '0.95rem' }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={onClose}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, borderRight: '1px solid rgba(0,0,0,0.08)' },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      )}
    </Box>
  );
};

export default Sidebar;

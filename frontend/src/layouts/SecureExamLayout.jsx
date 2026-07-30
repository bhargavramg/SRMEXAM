import React from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';

const SecureExamLayout = () => {
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh', 
      bgcolor: '#F5FAFF', // Light blue background for professional look
      overflow: 'hidden' // Prevent any unexpected scrolling at layout level
    }}>
      {/* We intentionally omit App Bar, Sidebar, and Footer here */}
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default SecureExamLayout;
